'use strict';

const sqlite3 = require('sqlite3').verbose();
const path = require('path');


/* =========================================================
   DATABASE LOCATION
========================================================= */

/*
   The SQLite database will be created inside the same
   project folder as this file.

   Result:

       your-project/
       ├── database.js
       └── database.db
*/

const DATABASE_FILE =
    path.join(
        __dirname,
        'database.db'
    );


/* =========================================================
   OPEN DATABASE
========================================================= */

const db =
    new sqlite3.Database(
        DATABASE_FILE,
        function (error) {

            if (error) {

                console.error(
                    'Database connection failed:',
                    error.message
                );

                return;

            }


            console.log(
                'SQLite database connected.'
            );

            console.log(
                'Database:',
                DATABASE_FILE
            );

        }
    );


/* =========================================================
   ENABLE FOREIGN KEYS
========================================================= */

db.run(
    'PRAGMA foreign_keys = ON'
);


/* =========================================================
   CREATE TABLES
========================================================= */

db.serialize(
    function () {

        /*
        -----------------------------------------------------
        GAME RESULTS TABLE
        -----------------------------------------------------

        Stores completed puzzle games.

        username
            User who played the puzzle.

        image_name
            Image used for the puzzle.

        puzzle_size
            3, 4, 5 or 6.

        moves
            Number of moves.

        time_seconds
            Completion time in seconds.

        completed
            1 = completed
            0 = not completed

        played_at
            Date/time when the game was recorded.
        */

        db.run(`
            CREATE TABLE IF NOT EXISTS game_results (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                username TEXT NOT NULL,

                image_name TEXT NOT NULL,

                puzzle_size INTEGER NOT NULL,

                moves INTEGER NOT NULL DEFAULT 0,

                time_seconds INTEGER NOT NULL DEFAULT 0,

                completed INTEGER NOT NULL DEFAULT 0,

                played_at DATETIME
                    DEFAULT CURRENT_TIMESTAMP

            )
        `);


        /*
        -----------------------------------------------------
        PUZZLE IMAGES TABLE
        -----------------------------------------------------

        This table keeps information about the images
        available to the puzzle.

        The actual image files remain in:

            D:\puzzle image

        The database only stores their filenames.
        */

        db.run(`
            CREATE TABLE IF NOT EXISTS puzzle_images (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                filename TEXT NOT NULL UNIQUE,

                active INTEGER NOT NULL DEFAULT 1,

                created_at DATETIME
                    DEFAULT CURRENT_TIMESTAMP

            )
        `);


        /*
        -----------------------------------------------------
        GAME SETTINGS TABLE
        -----------------------------------------------------

        Stores application settings.

        This gives us a place to keep settings later
        without changing the database structure.
        */

        db.run(`
            CREATE TABLE IF NOT EXISTS game_settings (

                setting_name TEXT PRIMARY KEY,

                setting_value TEXT

            )
        `);


        /*
        -----------------------------------------------------
        DEFAULT SETTINGS
        -----------------------------------------------------
        */

        db.run(`
            INSERT OR IGNORE INTO game_settings
            (
                setting_name,
                setting_value
            )
            VALUES
            (
                'default_puzzle_size',
                '3'
            )
        `);


        db.run(`
            INSERT OR IGNORE INTO game_settings
            (
                setting_name,
                setting_value
            )
            VALUES
            (
                'application_name',
                'Click N Slide'
            )
        `);


        console.log(
            'Database tables initialized.'
        );

    }
);


/* =========================================================
   ADD PUZZLE IMAGE
========================================================= */

function addPuzzleImage(
    filename
) {

    return new Promise(
        function (resolve, reject) {

            const sql = `
                INSERT OR IGNORE INTO puzzle_images
                (
                    filename,
                    active
                )
                VALUES
                (
                    ?,
                    1
                )
            `;


            db.run(
                sql,
                [filename],
                function (error) {

                    if (error) {

                        reject(error);

                        return;

                    }


                    resolve({
                        id: this.lastID,

                        filename: filename
                    });

                }
            );

        }
    );

}


/* =========================================================
   GET ACTIVE PUZZLE IMAGES
========================================================= */

function getPuzzleImages() {

    return new Promise(
        function (resolve, reject) {

            const sql = `
                SELECT
                    id,
                    filename,
                    active,
                    created_at
                FROM puzzle_images
                WHERE active = 1
                ORDER BY id ASC
            `;


            db.all(
                sql,
                [],
                function (error, rows) {

                    if (error) {

                        reject(error);

                        return;

                    }


                    resolve(rows);

                }
            );

        }
    );

}


/* =========================================================
   GET ONE PUZZLE IMAGE
========================================================= */

function getPuzzleImage(
    filename
) {

    return new Promise(
        function (resolve, reject) {

            const sql = `
                SELECT
                    id,
                    filename,
                    active,
                    created_at
                FROM puzzle_images
                WHERE filename = ?
                LIMIT 1
            `;


            db.get(
                sql,
                [filename],
                function (error, row) {

                    if (error) {

                        reject(error);

                        return;

                    }


                    resolve(row);

                }
            );

        }
    );

}


/* =========================================================
   SAVE GAME RESULT
========================================================= */

function saveGameResult(
    result
) {

    return new Promise(
        function (resolve, reject) {

            /*
             * Validate input.
             */

            const username =
                String(
                    result.username || 'admin'
                );


            const imageName =
                String(
                    result.image_name || ''
                );


            const puzzleSize =
                Number(
                    result.puzzle_size || 3
                );


            const moves =
                Number(
                    result.moves || 0
                );


            const timeSeconds =
                Number(
                    result.time_seconds || 0
                );


            const completed =
                result.completed ? 1 : 0;


            /*
             * Only allow puzzle sizes that
             * the application supports.
             */

            if (
                ![3, 4, 5, 6]
                    .includes(puzzleSize)
            ) {

                reject(
                    new Error(
                        'Invalid puzzle size.'
                    )
                );

                return;

            }


            const sql = `
                INSERT INTO game_results
                (
                    username,
                    image_name,
                    puzzle_size,
                    moves,
                    time_seconds,
                    completed
                )
                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
            `;


            db.run(
                sql,
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

                        reject(error);

                        return;

                    }


                    resolve({

                        id: this.lastID,

                        username: username,

                        image_name: imageName,

                        puzzle_size: puzzleSize,

                        moves: moves,

                        time_seconds:
                            timeSeconds,

                        completed:
                            completed

                    });

                }
            );

        }
    );

}


/* =========================================================
   GET GAME RESULTS
========================================================= */

function getGameResults(
    limit = 50
) {

    return new Promise(
        function (resolve, reject) {

            let resultLimit =
                Number(limit);


            /*
             * Prevent unreasonable values.
             */

            if (
                !Number.isInteger(
                    resultLimit
                ) ||
                resultLimit < 1
            ) {

                resultLimit = 50;

            }


            if (resultLimit > 500) {

                resultLimit = 500;

            }


            const sql = `
                SELECT
                    id,
                    username,
                    image_name,
                    puzzle_size,
                    moves,
                    time_seconds,
                    completed,
                    played_at
                FROM game_results
                ORDER BY played_at DESC
                LIMIT ?
            `;


            db.all(
                sql,
                [resultLimit],
                function (error, rows) {

                    if (error) {

                        reject(error);

                        return;

                    }


                    resolve(rows);

                }
            );

        }
    );

}


/* =========================================================
   GET BEST RESULTS
========================================================= */

function getBestResults(
    puzzleSize = null,
    limit = 10
) {

    return new Promise(
        function (resolve, reject) {

            let resultLimit =
                Number(limit);


            if (
                !Number.isInteger(
                    resultLimit
                ) ||
                resultLimit < 1
            ) {

                resultLimit = 10;

            }


            if (resultLimit > 100) {

                resultLimit = 100;

            }


            /*
             * If a particular puzzle size
             * was requested.
             */

            if (
                puzzleSize !== null
            ) {

                const size =
                    Number(
                        puzzleSize
                    );


                if (
                    ![3, 4, 5, 6]
                        .includes(size)
                ) {

                    reject(
                        new Error(
                            'Invalid puzzle size.'
                        )
                    );

                    return;

                }


                const sql = `
                    SELECT
                        id,
                        username,
                        image_name,
                        puzzle_size,
                        moves,
                        time_seconds,
                        played_at
                    FROM game_results
                    WHERE completed = 1
                    AND puzzle_size = ?
                    ORDER BY
                        time_seconds ASC,
                        moves ASC
                    LIMIT ?
                `;


                db.all(
                    sql,
                    [
                        size,
                        resultLimit
                    ],
                    function (
                        error,
                        rows
                    ) {

                        if (error) {

                            reject(error);

                            return;

                        }


                        resolve(rows);

                    }
                );


                return;

            }


            /*
             * Best results across all puzzle sizes.
             */

            const sql = `
                SELECT
                    id,
                    username,
                    image_name,
                    puzzle_size,
                    moves,
                    time_seconds,
                    played_at
                FROM game_results
                WHERE completed = 1
                ORDER BY
                    time_seconds ASC,
                    moves ASC
                LIMIT ?
            `;


            db.all(
                sql,
                [resultLimit],
                function (
                    error,
                    rows
                ) {

                    if (error) {

                        reject(error);

                        return;

                    }


                    resolve(rows);

                }
            );

        }
    );

}


/* =========================================================
   GET SETTING
========================================================= */

function getSetting(
    settingName
) {

    return new Promise(
        function (resolve, reject) {

            const sql = `
                SELECT
                    setting_name,
                    setting_value
                FROM game_settings
                WHERE setting_name = ?
                LIMIT 1
            `;


            db.get(
                sql,
                [settingName],
                function (
                    error,
                    row
                ) {

                    if (error) {

                        reject(error);

                        return;

                    }


                    if (!row) {

                        resolve(null);

                        return;

                    }


                    resolve(
                        row.setting_value
                    );

                }
            );

        }
    );

}


/* =========================================================
   SAVE SETTING
========================================================= */

function setSetting(
    settingName,
    settingValue
) {

    return new Promise(
        function (resolve, reject) {

            const sql = `
                INSERT INTO game_settings
                (
                    setting_name,
                    setting_value
                )
                VALUES
                (
                    ?,
                    ?
                )
                ON CONFLICT(setting_name)
                DO UPDATE SET
                    setting_value =
                        excluded.setting_value
            `;


            db.run(
                sql,
                [
                    settingName,
                    String(settingValue)
                ],
                function (error) {

                    if (error) {

                        reject(error);

                        return;

                    }


                    resolve({

                        setting_name:
                            settingName,

                        setting_value:
                            String(
                                settingValue
                            )

                    });

                }
            );

        }
    );

}


/* =========================================================
   DELETE GAME RESULT
========================================================= */

function deleteGameResult(
    id
) {

    return new Promise(
        function (resolve, reject) {

            const sql = `
                DELETE FROM game_results
                WHERE id = ?
            `;


            db.run(
                sql,
                [id],
                function (error) {

                    if (error) {

                        reject(error);

                        return;

                    }


                    resolve({

                        deleted:
                            this.changes > 0

                    });

                }
            );

        }
    );

}


/* =========================================================
   CLOSE DATABASE
========================================================= */

function closeDatabase() {

    return new Promise(
        function (resolve, reject) {

            db.close(
                function (error) {

                    if (error) {

                        reject(error);

                        return;

                    }


                    console.log(
                        'SQLite database closed.'
                    );


                    resolve();

                }
            );

        }
    );

}


/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

process.on(
    'SIGINT',
    async function () {

        try {

            await closeDatabase();

        } catch (error) {

            console.error(
                'Error closing database:',
                error.message
            );

        }


        process.exit(0);

    }
);


process.on(
    'SIGTERM',
    async function () {

        try {

            await closeDatabase();

        } catch (error) {

            console.error(
                'Error closing database:',
                error.message
            );

        }


        process.exit(0);

    }
);


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {

    db,

    addPuzzleImage,

    getPuzzleImages,

    getPuzzleImage,

    saveGameResult,

    getGameResults,

    getBestResults,

    getSetting,

    setSetting,

    deleteGameResult,

    closeDatabase

};