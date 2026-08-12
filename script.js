'use strict';

/* =========================================================
   CLICK N SLIDE - SLIDING PUZZLE
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const IMAGE_API =
    '/api/images';


/* =========================================================
   GAME STATE
========================================================= */

let images = [];

let currentImageIndex = 0;

let puzzleSize = 3;

let tiles = [];

let emptyIndex = 0;

let moves = 0;

let seconds = 0;

let timer = null;

let gameStarted = false;

let gameCompleted = false;

let selectedImage = null;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const previewImage =
    document.getElementById('previewImage');

const puzzleGrid =
    document.getElementById('puzzleGrid');

const playButton =
    document.getElementById('playButton');

const prevButton =
    document.getElementById('prevButton');

const nextButton =
    document.getElementById('nextButton');

const movesDisplay =
    document.getElementById('moves');

const timeDisplay =
    document.getElementById('time');

const sizeButtons =
    document.querySelectorAll('.size-option');

const helpButton =
    document.getElementById('helpButton');

const helpModal =
    document.getElementById('helpModal');

const closeModalButton =
    document.getElementById('closeModal');

const slidePiecesCheckbox =
    document.getElementById('slidePieces');


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    initializeGame
);


async function initializeGame() {

    setupEventListeners();

    updateDisplays();

    await loadImages();

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {

    /*
     * Play / Shuffle
     */

    if (playButton) {

        playButton.addEventListener(
            'click',
            startNewGame
        );

    }


    /*
     * Previous image
     */

    if (prevButton) {

        prevButton.addEventListener(
            'click',
            previousImage
        );

    }


    /*
     * Next image
     */

    if (nextButton) {

        nextButton.addEventListener(
            'click',
            nextImage
        );

    }


    /*
     * Puzzle size
     */

    sizeButtons.forEach(
        button => {

            button.addEventListener(
                'click',
                function () {

                    const size =
                        Number(
                            button.dataset.size
                        );

                    changePuzzleSize(size);

                }
            );

        }
    );


    /*
     * Help
     */

    if (helpButton) {

        helpButton.addEventListener(
            'click',
            openHelp
        );

    }


    /*
     * Close help
     */

    if (closeModalButton) {

        closeModalButton.addEventListener(
            'click',
            closeHelp
        );

    }


    /*
     * Close modal by clicking outside.
     */

    if (helpModal) {

        helpModal.addEventListener(
            'click',
            function (event) {

                if (
                    event.target === helpModal
                ) {

                    closeHelp();

                }

            }
        );

    }


    /*
     * Keyboard support.
     *
     * Arrow keys can move the tile next to
     * the empty square.
     */

    document.addEventListener(
        'keydown',
        handleKeyboard
    );

}


/* =========================================================
   LOAD IMAGES
========================================================= */

async function loadImages() {

    try {

        const response =
            await fetch(
                IMAGE_API
            );


        if (!response.ok) {

            throw new Error(
                'Unable to load images.'
            );

        }


        const data =
            await response.json();


        if (
            !data.success ||
            !Array.isArray(data.images) ||
            data.images.length === 0
        ) {

            throw new Error(
                'No puzzle images found.'
            );

        }


        images =
            data.images;


        currentImageIndex = 0;


        selectedImage =
            images[
                currentImageIndex
            ];


        updatePreview();


        /*
         * Show the solved puzzle initially.
         */

        createSolvedPuzzle();


    } catch (error) {

        console.error(
            'Image loading error:',
            error
        );


        showImageError();

    }

}


/* =========================================================
   SHOW IMAGE ERROR
========================================================= */

function showImageError() {

    if (!puzzleGrid) {
        return;
    }


    puzzleGrid.innerHTML = '';


    const message =
        document.createElement('div');


    message.className =
        'start-message';


    message.innerHTML = `
        <div class="start-message-title">
            No Images Found
        </div>

        <div class="start-message-text">
            Please check your puzzle image folder.
        </div>
    `;


    puzzleGrid.appendChild(
        message
    );

}


/* =========================================================
   UPDATE PREVIEW
========================================================= */

function updatePreview() {

    if (
        !previewImage ||
        !selectedImage
    ) {

        return;

    }


    previewImage.src =
        selectedImage;


    previewImage.alt =
        `Puzzle image ${currentImageIndex + 1}`;


    /*
     * Change image = show solved arrangement
     * until Play is pressed.
     */

    createSolvedPuzzle();

}


/* =========================================================
   PREVIOUS IMAGE
========================================================= */

function previousImage() {

    if (
        images.length === 0
    ) {

        return;

    }


    currentImageIndex--;


    if (
        currentImageIndex < 0
    ) {

        currentImageIndex =
            images.length - 1;

    }


    selectedImage =
        images[
            currentImageIndex
        ];


    resetGame();

}


/* =========================================================
   NEXT IMAGE
========================================================= */

function nextImage() {

    if (
        images.length === 0
    ) {

        return;

    }


    currentImageIndex++;


    if (
        currentImageIndex >= images.length
    ) {

        currentImageIndex = 0;

    }


    selectedImage =
        images[
            currentImageIndex
        ];


    resetGame();

}


/* =========================================================
   CHANGE PUZZLE SIZE
========================================================= */

function changePuzzleSize(
    newSize
) {

    if (
        ![3, 4, 5, 6].includes(newSize)
    ) {

        return;

    }


    puzzleSize =
        newSize;


    /*
     * Update active button.
     */

    sizeButtons.forEach(
        button => {

            const buttonSize =
                Number(
                    button.dataset.size
                );


            button.classList.toggle(
                'active',
                buttonSize === puzzleSize
            );

        }
    );


    resetGame();

}


/* =========================================================
   RESET GAME
========================================================= */

function resetGame() {

    stopTimer();

    moves = 0;

    seconds = 0;

    gameStarted = false;

    gameCompleted = false;

    selectedImage =
        images[
            currentImageIndex
        ];


    updatePreview();

    updateDisplays();

}


/* =========================================================
   CREATE SOLVED PUZZLE
========================================================= */

function createSolvedPuzzle() {

    if (
        !puzzleGrid ||
        !selectedImage
    ) {

        return;

    }


    stopTimer();

    moves = 0;

    seconds = 0;

    gameStarted = false;

    gameCompleted = false;


    const totalTiles =
        puzzleSize * puzzleSize;


    /*
     * Tile numbers:

       0
       1
       2
       ...
       totalTiles - 2

       The final position is the empty space.

       Example 3x3:

       0 1 2
       3 4 5
       6 7 EMPTY
    */

    tiles =
        [];


    for (
        let i = 0;
        i < totalTiles - 1;
        i++
    ) {

        tiles.push(i);

    }


    /*
     * -1 represents the empty square.
     */

    tiles.push(-1);


    emptyIndex =
        totalTiles - 1;


    renderPuzzle();

    updateDisplays();

}


/* =========================================================
   START NEW GAME
========================================================= */

function startNewGame() {

    if (
        !selectedImage
    ) {

        return;

    }


    /*
     * Stop any previous game.
     */

    stopTimer();


    moves = 0;

    seconds = 0;

    gameStarted = true;

    gameCompleted = false;


    /*
     * Create the solved state first.
     */

    const totalTiles =
        puzzleSize * puzzleSize;


    tiles =
        [];


    for (
        let i = 0;
        i < totalTiles - 1;
        i++
    ) {

        tiles.push(i);

    }


    tiles.push(-1);


    emptyIndex =
        totalTiles - 1;


    /*
     * IMPORTANT:
     *
     * Do NOT simply randomly shuffle the array.
     *
     * A random permutation can create an
     * impossible sliding puzzle.
     *
     * Instead, make many legal moves from
     * the solved position.
     *
     * Every legal move preserves solvability.
     */

    shuffleByLegalMoves();


    renderPuzzle();

    updateDisplays();

    startTimer();

}


/* =========================================================
   LEGAL SHUFFLE
========================================================= */

function shuffleByLegalMoves() {

    /*
     * More moves for larger puzzles.
     */

    const shuffleMoves =
        puzzleSize * puzzleSize * 40;


    let previousEmptyIndex =
        -1;


    for (
        let i = 0;
        i < shuffleMoves;
        i++
    ) {

        const possibleMoves =
            getMovableTileIndexes();


        /*
         * Avoid immediately undoing the
         * previous shuffle move when possible.
         */

        let availableMoves =
            possibleMoves.filter(
                index =>
                    index !== previousEmptyIndex
            );


        if (
            availableMoves.length === 0
        ) {

            availableMoves =
                possibleMoves;

        }


        const randomPosition =
            Math.floor(
                Math.random() *
                availableMoves.length
            );


        const tileIndex =
            availableMoves[
                randomPosition
            ];


        previousEmptyIndex =
            emptyIndex;


        moveTile(
            tileIndex,
            false
        );

    }


    /*
     * Make absolutely sure that the shuffled
     * puzzle isn't accidentally still solved.
     */

    if (isSolved()) {

        shuffleByLegalMoves();

    }

}


/* =========================================================
   GET MOVABLE TILES
========================================================= */

function getMovableTileIndexes() {

    const row =
        Math.floor(
            emptyIndex /
            puzzleSize
        );


    const column =
        emptyIndex %
        puzzleSize;


    const possibleMoves = [];


    /*
     * Tile above empty space.
     */

    if (
        row > 0
    ) {

        possibleMoves.push(
            emptyIndex - puzzleSize
        );

    }


    /*
     * Tile below empty space.
     */

    if (
        row < puzzleSize - 1
    ) {

        possibleMoves.push(
            emptyIndex + puzzleSize
        );

    }


    /*
     * Tile left of empty space.
     */

    if (
        column > 0
    ) {

        possibleMoves.push(
            emptyIndex - 1
        );

    }


    /*
     * Tile right of empty space.
     */

    if (
        column < puzzleSize - 1
    ) {

        possibleMoves.push(
            emptyIndex + 1
        );

    }


    return possibleMoves;

}


/* =========================================================
   HANDLE TILE CLICK
========================================================= */

function handleTileClick(
    tileIndex
) {

    if (
        !gameStarted ||
        gameCompleted
    ) {

        return;

    }


    /*
     * Only a tile next to the empty space
     * can move.
     */

    const movableTiles =
        getMovableTileIndexes();


    if (
        !movableTiles.includes(tileIndex)
    ) {

        showInvalidMove(
            tileIndex
        );

        return;

    }


    moveTile(
        tileIndex,
        true
    );


    moves++;


    updateDisplays();


    /*
     * Check whether the puzzle is complete.
     */

    if (
        isSolved()
    ) {

        completeGame();

    }

}


/* =========================================================
   MOVE TILE
========================================================= */

function moveTile(
    tileIndex,
    countMove = true
) {

    /*
     * Swap the clicked tile with the empty
     * position.
     */

    const temporary =
        tiles[
            tileIndex
        ];


    tiles[
        tileIndex
    ] =
        tiles[
            emptyIndex
        ];


    tiles[
        emptyIndex
    ] =
        temporary;


    /*
     * Empty square has moved to the
     * tile's previous position.
     */

    emptyIndex =
        tileIndex;


    /*
     * Only render when this is an actual
     * game move or a final shuffle operation.
     */

    renderPuzzle();

}


/* =========================================================
   RENDER PUZZLE
========================================================= */

function renderPuzzle() {

    if (
        !puzzleGrid ||
        !selectedImage
    ) {

        return;

    }


    /*
     * Set CSS grid dimensions.
     */

    puzzleGrid.style.gridTemplateColumns =
        `repeat(${puzzleSize}, 1fr)`;


    puzzleGrid.style.gridTemplateRows =
        `repeat(${puzzleSize}, 1fr)`;


    /*
     * Remove old pieces.
     */

    puzzleGrid.innerHTML = '';


    /*
     * Create each tile.
     */

    tiles.forEach(
        (
            tileNumber,
            position
        ) => {

            const piece =
                document.createElement('div');


            piece.className =
                'puzzle-piece';


            piece.dataset.position =
                position;


            piece.dataset.tile =
                tileNumber;


            /*
             * Empty square.
             */

            if (
                tileNumber === -1
            ) {

                piece.classList.add(
                    'empty-piece'
                );


                piece.setAttribute(
                    'aria-label',
                    'Empty space'
                );


                /*
                 * No background image on
                 * the empty square.
                 */

                piece.style.backgroundImage =
                    'none';


                puzzleGrid.appendChild(
                    piece
                );


                return;

            }


            /*
             * Normal image tile.
             */

            piece.style.backgroundImage =
                `url("${selectedImage}")`;


            /*
             * Calculate which row/column of
             * the ORIGINAL image this tile
             * belongs to.
             */

            const sourceRow =
                Math.floor(
                    tileNumber /
                    puzzleSize
                );


            const sourceColumn =
                tileNumber %
                puzzleSize;


            /*
             * Position the complete image
             * behind the tile.
             *
             * The background size must be
             * exactly the puzzle dimensions.
             */

            piece.style.backgroundSize =
                `${puzzleSize * 100}% ${puzzleSize * 100}%`;


            /*
             * For a 3x3 puzzle:

                 tile 0 = top-left
                 tile 1 = top-middle
                 tile 2 = top-right
                 etc.
             */

            const backgroundX =
                puzzleSize === 1
                    ? 0
                    : (
                        sourceColumn /
                        (puzzleSize - 1)
                    ) * 100;


            const backgroundY =
                puzzleSize === 1
                    ? 0
                    : (
                        sourceRow /
                        (puzzleSize - 1)
                    ) * 100;


            piece.style.backgroundPosition =
                `${backgroundX}% ${backgroundY}%`;


            /*
             * Accessibility.
             */

            piece.setAttribute(
                'role',
                'button'
            );


            piece.setAttribute(
                'aria-label',
                `Puzzle tile ${tileNumber + 1}`
            );


            /*
             * Click handler.
             */

            piece.addEventListener(
                'click',
                function () {

                    handleTileClick(
                        position
                    );

                }
            );


            puzzleGrid.appendChild(
                piece
            );

        }
    );

}


/* =========================================================
   CHECK SOLVED
========================================================= */

function isSolved() {

    const lastIndex =
        tiles.length - 1;


    /*
     * Every tile must be in its original
     * position.
     */

    for (
        let i = 0;
        i < lastIndex;
        i++
    ) {

        if (
            tiles[i] !== i
        ) {

            return false;

        }

    }


    /*
     * The bottom-right position MUST
     * contain the empty space.
     */

    return (
        tiles[lastIndex] === -1
    );

}


/* =========================================================
   COMPLETE GAME
========================================================= */

function completeGame() {

    gameCompleted = true;

    stopTimer();


    /*
     * Make sure the solved arrangement is
     * rendered one final time.
     */

    renderPuzzle();


    /*
     * Add completion animation.
     */

    if (puzzleGrid) {

        puzzleGrid.classList.add(
            'puzzle-completed'
        );


        setTimeout(
            function () {

                puzzleGrid.classList.remove(
                    'puzzle-completed'
                );

            },
            1200
        );

    }


    /*
     * Show completion message.
     */

    showCompletionMessage();


    /*
     * Save result if the API exists.
     *
     * This won't break the game if the
     * endpoint hasn't been added yet.
     */

    saveGameResult();

}


/* =========================================================
   COMPLETION MESSAGE
========================================================= */

function showCompletionMessage() {

    /*
     * Remove an existing message first.
     */

    const existing =
        document.getElementById(
            'completionMessage'
        );


    if (existing) {

        existing.remove();

    }


    const message =
        document.createElement('div');


    message.id =
        'completionMessage';


    message.className =
        'completion-message';


    message.innerHTML = `

        <div class="completion-title">
            Puzzle Complete!
        </div>

        <div class="completion-time">
            Time:
            <span>
                ${formatTime(seconds)}
            </span>
        </div>

        <div class="completion-moves">
            Moves:
            <span>
                ${moves}
            </span>
        </div>

        <button
            type="button"
            class="play-again-button"
            id="playAgainButton"
        >
            Play Again
        </button>

    `;


    /*
     * Put it over the puzzle.
     */

    if (puzzleGrid) {

        puzzleGrid.parentElement.appendChild(
            message
        );

    } else {

        document.body.appendChild(
            message
        );

    }


    const playAgainButton =
        document.getElementById(
            'playAgainButton'
        );


    if (playAgainButton) {

        playAgainButton.addEventListener(
            'click',
            function () {

                message.remove();

                startNewGame();

            }
        );

    }

}


/* =========================================================
   SAVE GAME RESULT
========================================================= */

async function saveGameResult() {

    /*
     * This endpoint will be connected to
     * database.js when we update server.js.
     *
     * For now, safely do nothing if the
     * endpoint doesn't exist.
     */

    try {

        await fetch(
            '/api/game-result',
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body: JSON.stringify({

                    username: 'admin',

                    image_name:
                        getCurrentImageName(),

                    puzzle_size:
                        puzzleSize,

                    moves:
                        moves,

                    time_seconds:
                        seconds,

                    completed:
                        true

                })

            }
        );

    } catch (error) {

        /*
         * Don't stop the puzzle because
         * database saving failed.
         */

        console.warn(
            'Could not save game result:',
            error
        );

    }

}


/* =========================================================
   GET CURRENT IMAGE NAME
========================================================= */

function getCurrentImageName() {

    if (
        !selectedImage
    ) {

        return '';

    }


    try {

        const url =
            new URL(
                selectedImage,
                window.location.origin
            );


        const filename =
            decodeURIComponent(
                url.pathname.split('/').pop()
            );


        return filename;

    } catch (error) {

        return selectedImage;

    }

}


/* =========================================================
   INVALID MOVE
========================================================= */

function showInvalidMove(
    position
) {

    const piece =
        puzzleGrid
            ?.children[position];


    if (!piece) {

        return;

    }


    piece.classList.remove(
        'invalid-move'
    );


    /*
     * Force browser to restart animation.
     */

    void piece.offsetWidth;


    piece.classList.add(
        'invalid-move'
    );


    setTimeout(
        function () {

            piece.classList.remove(
                'invalid-move'
            );

        },
        200
    );

}


/* =========================================================
   TIMER
========================================================= */

function startTimer() {

    stopTimer();


    timer =
        setInterval(
            function () {

                if (
                    gameStarted &&
                    !gameCompleted
                ) {

                    seconds++;

                    updateDisplays();

                }

            },
            1000
        );

}


function stopTimer() {

    if (
        timer !== null
    ) {

        clearInterval(
            timer
        );


        timer = null;

    }

}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
    totalSeconds
) {

    const minutes =
        Math.floor(
            totalSeconds / 60
        );


    const remainingSeconds =
        totalSeconds % 60;


    return (
        String(minutes).padStart(2, '0') +
        ':' +
        String(remainingSeconds).padStart(2, '0')
    );

}


/* =========================================================
   UPDATE DISPLAYS
========================================================= */

function updateDisplays() {

    if (movesDisplay) {

        movesDisplay.textContent =
            moves;

    }


    if (timeDisplay) {

        timeDisplay.textContent =
            formatTime(seconds);

    }

}


/* =========================================================
   KEYBOARD CONTROLS
========================================================= */

function handleKeyboard(
    event
) {

    if (
        !gameStarted ||
        gameCompleted
    ) {

        return;

    }


    let tileIndex =
        -1;


    const row =
        Math.floor(
            emptyIndex /
            puzzleSize
        );


    const column =
        emptyIndex %
        puzzleSize;


    /*
     * Arrow UP:
     *
     * Move tile from below into empty space.
     */

    if (
        event.key === 'ArrowUp'
    ) {

        if (
            row < puzzleSize - 1
        ) {

            tileIndex =
                emptyIndex +
                puzzleSize;

        }

    }


    /*
     * Arrow DOWN:
     *
     * Move tile from above into empty space.
     */

    else if (
        event.key === 'ArrowDown'
    ) {

        if (
            row > 0
        ) {

            tileIndex =
                emptyIndex -
                puzzleSize;

        }

    }


    /*
     * Arrow LEFT:
     *
     * Move tile from right into empty space.
     */

    else if (
        event.key === 'ArrowLeft'
    ) {

        if (
            column < puzzleSize - 1
        ) {

            tileIndex =
                emptyIndex + 1;

        }

    }


    /*
     * Arrow RIGHT:
     *
     * Move tile from left into empty space.
     */

    else if (
        event.key === 'ArrowRight'
    ) {

        if (
            column > 0
        ) {

            tileIndex =
                emptyIndex - 1;

        }

    }


    if (
        tileIndex !== -1
    ) {

        event.preventDefault();

        handleTileClick(
            tileIndex
        );

    }

}


/* =========================================================
   HELP
========================================================= */

function openHelp() {

    if (!helpModal) {

        return;

    }


    helpModal.hidden =
        false;

}


function closeHelp() {

    if (!helpModal) {

        return;

    }


    helpModal.hidden =
        true;

}


/* =========================================================
   EXPORT FOR DEBUGGING
========================================================= */

/*
 * This is optional, but useful while developing.
 *
 * You can open the browser console and type:

       puzzleState()

 * to inspect the current puzzle.
 */

window.puzzleState =
    function () {

        return {

            size:
                puzzleSize,

            tiles:
                [...tiles],

            emptyIndex:
                emptyIndex,

            moves:
                moves,

            seconds:
                seconds,

            solved:
                isSolved(),

            image:
                selectedImage

        };

    };