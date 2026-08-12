'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();

/*
|--------------------------------------------------------------------------
| PORT
|--------------------------------------------------------------------------
| Render provides process.env.PORT.
| For local development, 3000 will be used.
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 3000;


/*
|--------------------------------------------------------------------------
| IMPORTANT DIRECTORIES
|--------------------------------------------------------------------------
*/

const ROOT_DIR = __dirname;

const IMAGE_DIR =
    path.join(ROOT_DIR, 'images');

const DATABASE_FILE =
    path.join(ROOT_DIR, 'database.db');


/*
|--------------------------------------------------------------------------
| CREATE EXPRESS APP
|--------------------------------------------------------------------------
*/

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


/*
|--------------------------------------------------------------------------
| STATIC FILES
|--------------------------------------------------------------------------
|
| This serves:
|
| login.html
| puzzle.html
| script.js
| style.css
|
*/

app.use(
    express.static(ROOT_DIR)
);


/*
|--------------------------------------------------------------------------
| SERVE PUZZLE IMAGES
|--------------------------------------------------------------------------
|
| Browser URL:
|
| /images/img1.jpg
|
| Server location:
|
| project/images/img1.jpg
|
|--------------------------------------------------------------------------
*/

app.use(
    '/images',
    express.static(IMAGE_DIR)
);


/*
|--------------------------------------------------------------------------
| SQLITE DATABASE
|--------------------------------------------------------------------------
*/

const db =
    new sqlite3.Database(
        DATABASE_FILE,
        (error) => {

            if (error) {

                console.error(
                    'SQLite database error:',
                    error.message
                );

            } else {

                console.log(
                    'SQLite database connected.'
                );

            }

        }
    );


/*
|--------------------------------------------------------------------------
| CREATE TABLES
|--------------------------------------------------------------------------
*/

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS game_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            image_name TEXT,
            puzzle_size INTEGER,
            moves INTEGER,
            time_seconds INTEGER,
            completed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

});


/*
|--------------------------------------------------------------------------
| HOME PAGE
|--------------------------------------------------------------------------
*/

app.get('/', (req, res) => {

    res.sendFile(
        path.join(
            ROOT_DIR,
            'login.html'
        )
    );

});


/*
|--------------------------------------------------------------------------
| LOGIN PAGE
|--------------------------------------------------------------------------
*/

app.get('/login.html', (req, res) => {

    res.sendFile(
        path.join(
            ROOT_DIR,
            'login.html'
        )
    );

});


/*
|--------------------------------------------------------------------------
| PUZZLE PAGE
|--------------------------------------------------------------------------
*/

app.get('/puzzle.html', (req, res) => {

    res.sendFile(
        path.join(
            ROOT_DIR,
            'puzzle.html'
        )
    );

});


/*
|--------------------------------------------------------------------------
| LOGIN API
|--------------------------------------------------------------------------
|
| Permanent credentials:
|
| Username: admin
| Password: 1234
|
|--------------------------------------------------------------------------
*/

app.post('/api/login', (req, res) => {

    const username =
        String(
            req.body.username || ''
        ).trim();

    const password =
        String(
            req.body.password || ''
        );


    /*
     * Permanent admin credentials.
     */

    if (
        username === 'admin' &&
        password === '1234'
    ) {

        return res.json({

            success: true,

            message:
                'Login successful.',

            redirect:
                '/puzzle.html'

        });

    }


    /*
     * Invalid credentials.
     */

    return res.status(401).json({

        success: false,

        message:
            'Invalid username or password.'

    });

});


/*
|--------------------------------------------------------------------------
| GET PUZZLE IMAGES
|--------------------------------------------------------------------------
|
| This is the API used by script.js:
|
| fetch('/api/images')
|
|--------------------------------------------------------------------------
*/

app.get('/api/images', (req, res) => {

    /*
     * Check whether the images folder exists.
     */

    if (
        !fs.existsSync(IMAGE_DIR)
    ) {

        console.error(
            'Images folder does not exist:',
            IMAGE_DIR
        );


        return res.status(500).json({

            success: false,

            images: [],

            error:
                'Images folder not found. Create an "images" folder in the project and put JPG files inside it.'

        });

    }


    /*
     * Read files from images folder.
     */

    fs.readdir(
        IMAGE_DIR,
        (error, files) => {

            if (error) {

                console.error(
                    'Could not read images folder:',
                    error
                );


                return res.status(500).json({

                    success: false,

                    images: [],

                    error:
                        'Could not read images folder.'

                });

            }


            /*
             * Allowed image extensions.
             */

            const allowedExtensions = [

                '.jpg',

                '.jpeg',

                '.png',

                '.webp',

                '.gif'

            ];


            /*
             * Find image files only.
             */

            const imageFiles =
                files
                    .filter(
                        (file) => {

                            const extension =
                                path
                                    .extname(file)
                                    .toLowerCase();


                            return allowedExtensions
                                .includes(
                                    extension
                                );

                        }
                    )
                    .sort(
                        (a, b) =>
                            a.localeCompare(
                                b,
                                undefined,
                                {
                                    numeric: true,
                                    sensitivity: 'base'
                                }
                            )
                    );


            /*
             * Convert filenames into URLs.
             *
             * encodeURIComponent is important
             * if filenames contain spaces.
             */

            const imageUrls =
                imageFiles.map(
                    (file) => {

                        return (
                            '/images/' +
                            encodeURIComponent(file)
                        );

                    }
                );


            console.log(
                'Images found:',
                imageFiles
            );


            /*
             * Send result to browser.
             */

            return res.json({

                success: true,

                images:
                    imageUrls

            });

        }
    );

});


/*
|--------------------------------------------------------------------------
| DEBUG IMAGE INFORMATION
|--------------------------------------------------------------------------
|
| Open:
|
| /api/images/debug
|
| This helps diagnose Render problems.
|--------------------------------------------------------------------------
*/

app.get(
    '/api/images/debug',
    (req, res) => {

        const folderExists =
            fs.existsSync(
                IMAGE_DIR
            );


        let files = [];


        if (folderExists) {

            try {

                files =
                    fs.readdirSync(
                        IMAGE_DIR
                    );

            } catch (error) {

                files = [
                    'ERROR: ' +
                    error.message
                ];

            }

        }


        res.json({

            projectDirectory:
                ROOT_DIR,

            imageDirectory:
                IMAGE_DIR,

            imageFolderExists:
                folderExists,

            files:
                files

        });

    }
);


/*
|--------------------------------------------------------------------------
| SAVE GAME RESULT
|--------------------------------------------------------------------------
*/

app.post('/api/game-result', (req, res) => {

    const username =
        String(
            req.body.username || 'admin'
        ).trim();


    const imageName =
        String(
            req.body.image_name || ''
        );


    const puzzleSize =
        Number(
            req.body.puzzle_size || 3
        );


    const moves =
        Number(
            req.body.moves || 0
        );


    const timeSeconds =
        Number(
            req.body.time_seconds || 0
        );


    const completed =
        req.body.completed ? 1 : 0;


    /*
     * Basic validation.
     */

    if (
        !Number.isInteger(puzzleSize) ||
        puzzleSize < 3 ||
        puzzleSize > 6
    ) {

        return res.status(400).json({

            success: false,

            message:
                'Invalid puzzle size.'

        });

    }


    db.run(
        `
        INSERT INTO game_results
        (
            username,
            image_name,
            puzzle_size,
            moves,
            time_seconds,
            completed
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            username,
            imageName,
            puzzleSize,
            moves,
            timeSeconds,
            completed
        ],
        function (error) {

            if (error) {

                console.error(
                    'Database insert error:',
                    error.message
                );


                return res.status(500).json({

                    success: false,

                    message:
                        'Could not save game result.'

                });

            }


            return res.json({

                success: true,

                id:
                    this.lastID,

                message:
                    'Game result saved.'

            });

        }
    );

});


/*
|--------------------------------------------------------------------------
| GET GAME RESULTS
|--------------------------------------------------------------------------
|
| Useful for checking whether SQLite is working.
|--------------------------------------------------------------------------
*/

app.get('/api/game-results', (req, res) => {

    db.all(
        `
        SELECT
            id,
            username,
            image_name,
            puzzle_size,
            moves,
            time_seconds,
            completed,
            created_at
        FROM game_results
        ORDER BY id DESC
        `,
        [],
        (error, rows) => {

            if (error) {

                console.error(
                    'Database read error:',
                    error.message
                );


                return res.status(500).json({

                    success: false,

                    results: []

                });

            }


            return res.json({

                success: true,

                results:
                    rows

            });

        }
    );

});


/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
|
| Render can use this to verify the server is alive.
|--------------------------------------------------------------------------
*/

app.get('/api/health', (req, res) => {

    res.json({

        success: true,

        message:
            'Click N Slide server is running.',

        port:
            PORT,

        imagesFolder:
            fs.existsSync(IMAGE_DIR)

    });

});


/*
|--------------------------------------------------------------------------
| 404 HANDLER
|--------------------------------------------------------------------------
*/

app.use(
    (req, res) => {

        res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>404 - Page Not Found</title>

                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 60px;
                    }

                    h1 {
                        font-size: 48px;
                    }
                </style>
            </head>

            <body>

                <h1>404</h1>

                <p>
                    The requested page was not found.
                </p>

                <p>
                    <a href="/">
                        Go to Login
                    </a>
                </p>

            </body>
            </html>
        `);

    }
);


/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
|
| IMPORTANT FOR RENDER:
|
| - process.env.PORT
| - 0.0.0.0
|
|--------------------------------------------------------------------------
*/

app.listen(
    PORT,
    '0.0.0.0',
    () => {

        console.log(
            '========================================'
        );

        console.log(
            'CLICK N SLIDE SERVER'
        );

        console.log(
            '========================================'
        );

        console.log(
            `Server running on port: ${PORT}`
        );

        console.log(
            `Project directory: ${ROOT_DIR}`
        );

        console.log(
            `Images directory: ${IMAGE_DIR}`
        );


        if (
            fs.existsSync(IMAGE_DIR)
        ) {

            const files =
                fs.readdirSync(
                    IMAGE_DIR
                );


            console.log(
                'Images folder found.'
            );

            console.log(
                'Files:',
                files
            );

        } else {

            console.error(
                'WARNING: images folder NOT FOUND!'
            );

            console.error(
                'Create: ' +
                IMAGE_DIR
            );

        }

        console.log(
            '========================================'
        );

    }
);


/*
|--------------------------------------------------------------------------
| HANDLE DATABASE CLOSE
|--------------------------------------------------------------------------
*/

process.on(
    'SIGINT',
    () => {

        console.log(
            'Closing database...'
        );


        db.close(
            () => {

                console.log(
                    'Database closed.'
                );


                process.exit(
                    0
                );

            }
        );

    }
);