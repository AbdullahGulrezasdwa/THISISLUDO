// --- Game State ---
const players = ['red', 'green', 'yellow', 'blue'];
let currentTurn = 0; // 0=Red, 1=Green, 2=Yellow, 3=Blue
let diceValue = 0;
let hasRolled = false;

// --- Coordinates Map (15x15 Grid) ---
// Each step is [x, y] coordinates (0-14). 
// 0,0 is Top-Left. 14,14 is Bottom-Right.
// This path is the "Outer Loop" of 52 squares.
const mainPath = [
    [1,6], [2,6], [3,6], [4,6], [5,6], // Red Home Strip
    [6,5], [6,4], [6,3], [6,2], [6,1], [6,0], // Up Top Left
    [7,0], [8,0], // Top Middle Turn
    [8,1], [8,2], [8,3], [8,4], [8,5], // Down Top Right
    [9,6], [10,6], [11,6], [12,6], [13,6], [14,6], // Right Strip
    [14,7], [14,8], // Right Middle Turn
    [13,8], [12,8], [11,8], [10,8], [9,8], // Left Strip (Green Side)
    [8,9], [8,10], [8,11], [8,12], [8,13], [8,14], // Down Bottom Right
    [7,14], [6,14], // Bottom Middle Turn
    [6,13], [6,12], [6,11], [6,10], [6,9], // Up Bottom Left
    [5,8], [4,8], [3,8], [2,8], [1,8], [0,8], // Left Strip
    [0,7] // Back to Start
];

// Starting indices for each color on the mainPath
const startIndices = {
    'red': 0,      // Index 0 in mainPath
    'green': 13,   // Index 13 in mainPath
    'yellow': 26,  // Index 26 in mainPath
    'blue': 39     // Index 39 in mainPath
};

// Base positions (Waiting area coordinates)
const basePositions = {
    'red': [[2,2], [2,3], [3,2], [3,3]],
    'green': [[2,11], [2,12], [3,11], [3,12]],
    'yellow': [[11,11], [11,12], [12,11], [12,12]],
    'blue': [[11,2], [11,3], [12,2], [12,3]]
};

// Home Run Paths (The final stretch into center)
const homePaths = {
    'red': [[1,7], [2,7], [3,7], [4,7], [5,7], [6,7]],
    'green': [[7,1], [7,2], [7,3], [7,4], [7,5], [7,6]],
    'yellow': [[13,7], [12,7], [11,7], [10,7], [9,7], [8,7]],
    'blue': [[7,13], [7,12], [7,11], [7,10], [7,9], [7,8]]
};

// Current positions of all pieces: -1 means in base, 0-51 is main path, 100+ is home path
let pieceState = {
    'red': [-1, -1, -1, -1],
    'green': [-1, -1, -1, -1],
    'yellow': [-1, -1, -1, -1],
    'blue': [-1, -1, -1, -1]
};

// Safe spots (Stars/Globs) - indices on mainPath
const safeSpots = [0, 8, 13, 21, 26, 34, 39, 47];

// --- Initialization ---
function initGame() {
    renderBoard();
    updateStatus();
}

// Moves pieces visually to their coordinates
function renderBoard() {
    players.forEach(color => {
        pieceState[color].forEach((pos, index) => {
            const pieceEl = document.getElementById(`${color.charAt(0)}${index}`);
            let coords;

            if (pos === -1) {
                // In Base
                coords = basePositions[color][index];
            } else if (pos >= 100) {
                // In Home Path
                let homeIndex = pos - 100;
                coords = homePaths[color][homeIndex];
            } else {
                // On Main Path
                // Adjust for start index of that color
                let actualIndex = (pos + startIndices[color]) % 52;
                coords = mainPath[actualIndex];
            }

            // Convert Grid (0-14) to CSS Percentages
            // 1 square = 6.66%
            pieceEl.style.top = (coords[0] * 6.66) + '%';
            pieceEl.style.left = (coords[1] * 6.66) + '%';
            
            // Clear highlights
            pieceEl.classList.remove('highlight');
        });
    });
}

// --- Dice Logic ---
function rollDice() {
    if (hasRolled) return; // Prevent double rolling

    const rollSound = document.getElementById('roll-sound');
    if(rollSound) rollSound.play().catch(() => {});

    // Random number 1-6
    diceValue = Math.floor(Math.random() * 6) + 1;
    
    // Array of Unicode Dice Characters
    const diceIcons = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    
    // Update the HTML element
    const diceElement = document.getElementById('dice-display');
    diceElement.innerText = diceIcons[diceValue - 1];
    
    hasRolled = true;
    checkPossibleMoves();
}

// --- Move Logic ---
function checkPossibleMoves() {
    const color = players[currentTurn];
    const positions = pieceState[color];
    let possibleMoves = 0;

    positions.forEach((pos, index) => {
        const canMove = isValidMove(pos, diceValue);
        if (canMove) {
            document.getElementById(`${color.charAt(0)}${index}`).classList.add('highlight');
            possibleMoves++;
        }
    });

    // If no moves possible, skip turn
    if (possibleMoves === 0) {
        setTimeout(nextTurn, 1000);
    }
}

function isValidMove(currentPos, steps) {
    // Rule: Must roll 6 to leave base
    if (currentPos === -1) {
        return steps === 6;
    }
    // Rule: Cannot overshoot home (Goal is index 5 in home path)
    if (currentPos >= 100) {
        return (currentPos + steps) <= 105;
    }
    // Logic for entering home path
    // The path length is 51. If pos + steps > 50, we might enter home.
    // For simplicity here: standard path is 0-50 (51 steps). 
    // Actual logic needs to track "steps taken" vs "grid index", but simpler approach:
    // If steps + pos > 50, enter home path logic.
    // (Note: This is a simplified logic. In full Ludo, we track 'steps moved' not just index)
    
    return true; 
}

function handlePieceClick(color, index) {
    if (!hasRolled || players[currentTurn] !== color) return;

    const currentPos = pieceState[color][index];
    
    if (isValidMove(currentPos, diceValue)) {
        movePiece(color, index, diceValue);
    }
}

function movePiece(color, index, steps) {
    let currentPos = pieceState[color][index];

    // 1. Move out of base
    if (currentPos === -1) {
        pieceState[color][index] = 0; // Move to start of path
    } else {
        // 2. Normal Move
        // Check if we enter home path (Simple threshold for demo)
        if (currentPos < 100 && currentPos + steps > 50) {
            let overflow = (currentPos + steps) - 51;
            pieceState[color][index] = 100 + overflow; // Enter home
        } else if (currentPos >= 100) {
            pieceState[color][index] += steps;
        } else {
            pieceState[color][index] += steps;
        }
    }

    // 3. Capture Logic
    let landedPos = pieceState[color][index];
    // Convert relative pos to global mainPath index for collision check
    if (landedPos < 100 && landedPos !== -1) {
        let globalIndex = (landedPos + startIndices[color]) % 52;
        checkCollision(color, globalIndex);
    }

    renderBoard();
    checkWin(color);
    
    // Rule: Rolling a 6 gives another turn
    if (diceValue !== 6) {
        nextTurn();
    } else {
        hasRolled = false; // Reset for extra roll
        updateStatus("Roll again!");
    }
}

function checkCollision(activeColor, globalIndex) {
    // Don't capture on safe spots
    if (safeSpots.includes(globalIndex)) return;

    players.forEach(pColor => {
        if (pColor === activeColor) return; // Don't capture self

        pieceState[pColor].forEach((pos, pIndex) => {
            if (pos !== -1 && pos < 100) {
                let pGlobalIndex = (pos + startIndices[pColor]) % 52;
                if (pGlobalIndex === globalIndex) {
                    // CAPTURE! Send back to base
                    pieceState[pColor][pIndex] = -1;
                    console.log(`${pColor} piece captured!`);
                }
            }
        });
    });
}

function checkWin(color) {
    // Check if all 4 pieces are at end of home path (index 105)
    let wins = pieceState[color].filter(p => p === 105).length;
    if (wins === 4) {
        alert(`${color.toUpperCase()} WINS!`);
        location.reload();
    }
}

function nextTurn() {
    currentTurn = (currentTurn + 1) % 4;
    hasRolled = false;
    updateStatus();
}

function updateStatus(msg) {
    const color = players[currentTurn];
    const text = document.getElementById('turn-text');
    text.innerText = msg ? msg : `${color.toUpperCase()}'s Turn`;
    text.style.color = color;
}

// Start
initGame();

