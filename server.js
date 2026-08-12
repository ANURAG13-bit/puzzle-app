'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

const PORT = 3000;


/* =========================================================
   FOLDERS
========================================================= */

/*
   Your puzzle images are currently stored here:

       D:\puzzle image\

   Windows paths are written with path.join() so that
   backslashes do not cause problems.
*/

const PUZZLE_IMAGE_FOLDER =
    path.join('D:', 'puzzle image');


/*
   This is the folder containing:

       login.html
       puzzle.html
       style.css
       script.js
       server.js

   If all of those files are in the same project folder,
   __dirname is the correct location.
*/

const PUBLIC_FOLDER =
    __dirname;


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
    express.urlencoded({
        extended: true
    })
);


app.use(
    express.json()
);


/*
   Serve normal web files.

   Examples:

       /login.html
       /puzzle.html
       /style.css
       /script.js
*/

app.use(
    express.static(PUBLIC_FOLDER)
);


/* =========================================================
   CHECK IMAGE FOLDER
========================================================= */

if (!fs.existsSync(PUZZLE_IMAGE_FOLDER)) {

    console.warn(
        '\nWARNING: Puzzle image folder was not found:\n' +
        PUZZLE_IMAGE_FOLDER +
        '\n'
    );

} else {

    console.log(
        'Puzzle image folder:',
        PUZZLE_IMAGE_FOLDER
    );

}


/* =========================================================
   SERVE PUZZLE IMAGES
========================================================= */

/*
   This makes:

       D:\puzzle image\img 1.jpg

   available to the browser as:

       /puzzle-images/img%201.jpg

   Express automatically handles the URL encoding.
*/

app.use(
    '/puzzle-images',
    express.static(PUZZLE_IMAGE_FOLDER)
);


/* =========================================================
   GET PUZZLE IMAGES
========================================================= */

/*
   script.js calls:

       GET /api/images

   This endpoint searches the D:\puzzle image folder
   and returns the available image files.

   Supported formats:

       .jpg
       .jpeg
       .png
       .gif
       .webp
*/

app.get(
    '/api/images',
    function (req, res) {

        try {

            /*
             * Check whether folder exists.
             */

            if (
                !fs.existsSync(
                    PUZZLE_IMAGE_FOLDER
                )
            ) {

                return res.status(500).json({

                    success: false,

                    message:
                        'Puzzle image folder not found.',

                    images: []

                });

            }


            /*
             * Read folder.
             */

            const files =
                fs.readdirSync(
                    PUZZLE_IMAGE_FOLDER,
                    {
                        withFileTypes: true
                    }
                );


            /*
             * Only accept image files.
             */

            const imageFiles =
                files

                    .filter(
                        file =>
                            file.isFile()
                    )

                    .map(
                        file =>
                            file.name
                    )

                    .filter(
                        file =>
                            isImageFile(file)
                    );


            /*
             * Sort naturally.

             * This means:

                   img 1.jpg
                   img 2.jpg
                   img 3.jpg
                   img 10.jpg

               instead of:

                   img 1.jpg
                   img 10.jpg
                   img 2.jpg
                   img 3.jpg
             */

            imageFiles.sort(
                naturalSort
            );


            /*
             * Convert filenames into URLs.

               encodeURIComponent() is important because
               your filenames contain spaces.

               Example:

                   img 1.jpg

               becomes:

                   img%201.jpg
             */

            const imageUrls =
                imageFiles.map(
                    file =>
                        '/puzzle-images/' +
                        encodeURIComponent(file)
                );


            console.log(
                'Puzzle images:',
                imageFiles
            );


            /*
             * Send response.
             */

            res.json({

                success: true,

                images: imageUrls,

                count: imageUrls.length

            });

        } catch (error) {

            console.error(
                'Error reading puzzle images:',
                error
            );


            res.status(500).json({

                success: false,

                message:
                    'Could not read puzzle images.',

                images: []

            });

        }

    }
);


/* =========================================================
   LOGIN
========================================================= */

/*
   Permanent login credentials requested:

       Username: admin
       Password: 1234

   There is NO registration system.

   This is deliberately kept server-side instead of
   putting the password into login.html or script.js.
*/

const ADMIN_USERNAME =
    'admin';

const ADMIN_PASSWORD =
    '1234';


/*
   Login endpoint.

   login.html should submit:

       POST /login

   with:

       username
       password
*/

app.post(
    '/login',
    function (req, res) {

        const username =
            String(
                req.body.username || ''
            ).trim();


        const password =
            String(
                req.body.password || ''
            );


        /*
         * Check permanent credentials.
         */

        if (
            username === ADMIN_USERNAME &&
            password === ADMIN_PASSWORD
        ) {

            /*
             * Login successful.

             * For the simple version of this application,
             * redirect directly to the puzzle.
             */

            return res.redirect(
                '/puzzle.html'
            );

        }


        /*
         * Login failed.
         */

        return res.status(401).send(`
<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Login Failed</title>

    <style>

        body {
            margin: 0;
            min-height: 100vh;

            display: flex;
            align-items: center;
            justify-content: center;

            background: #073b6d;

            font-family: Arial, Helvetica, sans-serif;

            color: white;
        }

        .error-box {
            width: min(400px, 90vw);

            padding: 35px;

            text-align: center;

            background: #777700;

            border: 3px solid #d5d500;

            border-radius: 12px;

            box-shadow:
                0 10px 30px rgba(0,0,0,.5);
        }

        h2 {
            color: #ffff80;
        }

        p {
            color: #ffffc0;
        }

        a {
            display: inline-block;

            margin-top: 15px;

            padding: 10px 25px;

            background: #d5d500;

            color: #555500;

            text-decoration: none;

            font-weight: bold;

            border-radius: 5px;
        }

    </style>

</head>


<body>

    <div class="error-box">

        <h2>Login Failed</h2>

        <p>
            Incorrect username or password.
        </p>

        <a href="/login.html">
            Try Again
        </a>

    </div>

</body>

</html>
`);

    }
);


/* =========================================================
   ROOT PAGE
========================================================= */

app.get(
    '/',
    function (req, res) {

        res.sendFile(
            path.join(
                PUBLIC_FOLDER,
                'login.html'
            )
        );

    }
);


/* =========================================================
   PUZZLE PAGE
========================================================= */

app.get(
    '/puzzle',
    function (req, res) {

        res.sendFile(
            path.join(
                PUBLIC_FOLDER,
                'puzzle.html'
            )
        );

    }
);


/* =========================================================
   404 HANDLER
========================================================= */

app.use(
    function (req, res) {

        res.status(404).send(`
<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <title>Page Not Found</title>

    <style>

        body {
            margin: 0;

            min-height: 100vh;

            display: flex;

            justify-content: center;

            align-items: center;

            background: #073b6d;

            font-family: Arial, sans-serif;

            color: white;

            text-align: center;
        }

        h1 {
            color: #ffff70;
        }

        a {
            color: #65c3f2;
        }

    </style>

</head>

<body>

    <div>

        <h1>404</h1>

        <p>
            The requested page was not found.
        </p>

        <a href="/login.html">
            Back to Login
        </a>

    </div>

</body>

</html>
`);

    }
);


/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
    function (error, req, res, next) {

        console.error(
            'Server error:',
            error
        );


        res.status(500).json({

            success: false,

            message:
                'Internal server error.'

        });

    }
);


/* =========================================================
   IMAGE FILE CHECK
========================================================= */

function isImageFile(
    filename
) {

    const extension =
        path.extname(
            filename
        ).toLowerCase();


    return [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp'
    ].includes(
        extension
    );

}


/* =========================================================
   NATURAL SORT
========================================================= */

function naturalSort(
    a,
    b
) {

    return a.localeCompare(
        b,
        undefined,
        {
            numeric: true,
            sensitivity: 'base'
        }
    );

}


/* =========================================================
   START SERVER
========================================================= */

app.listen(
    PORT,
    function () {

        console.log(
            '\n=========================================='
        );

        console.log(
            '       CLICK N SLIDE PUZZLE'
        );

        console.log(
            '=========================================='
        );

        console.log(
            `Server running at: http://localhost:${PORT}`
        );

        console.log(
            `Login page: http://localhost:${PORT}/login.html`
        );

        console.log(
            `Puzzle page: http://localhost:${PORT}/puzzle.html`
        );

        console.log(
            `Images: ${PUZZLE_IMAGE_FOLDER}`
        );

        console.log(
            '==========================================\n'
        );

    }
);