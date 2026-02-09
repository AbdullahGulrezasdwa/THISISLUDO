// --- CONFIGURATION ---
const players = ['red', 'green', 'yellow', 'blue'];
let currentTurn = 0;
let diceValue = 0;
let hasRolled = false;
let prankActive = false; // Set to true to trigger "The Prank"

// Path mapping (0-14 coordinates)
const mainPath = [
    [6,1], [6,2], [6,3], [6,4], [6,5], [5,6], [4,6], [3,6], [2,6], [1,6], [0,6],
    [0,7], [0,8], [1,8], [2,8], [3,8], [4,8], [5,8], [6,9], [6,10], [6,11], [6,12], [6,13], [6,14],
    [7,14], [8,14], [8,13], [8,12], [8,11], [8,10], [8,9], [9,8], [10,8], [11,8], [12,8], [13,8], [14,8],
    [14,7], [14,6], [13,6], [12,6], [11,6], [10,6], [9,6], [8,5], [8,4], [8,3], [8,2], [8,1], [8,0],
    [7,0], [6,0]
];

const startOffsets = { red: 0, green: 13, yellow: 26, blue: 39 };

// Spread-out base positions so they don't huddle
const baseCoords = {
    red:    [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]],
    green:  [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]],
    yellow: [[10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]],
    blue:   [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]]
};

let pieceState = {
    red: [-1, -1, -1, -1], green: [-1, -1, -1, -1],
    yellow: [-1, -1, -1, -1], blue: [-1, -1, -1, -1]
};

function init() {
    render();
    updateUI();
}

function rollDice() {
    if (hasRolled) return;

    // --- PRANK LOGIC ---
    if (prankActive && players[currentTurn] === 'red') {
        diceValue = 1; // Red always rolls 1
    } else if (prankActive) {
        diceValue = 6; // Everyone else rolls 6
    } else {
        diceValue = Math.floor(Math.random() * 6) + 1;
    }

    const icons = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    document.getElementById('dice-box').innerText = icons[diceValue - 1];
    hasRolled = true;

    // Auto-skip if no moves possible
    const color = players[currentTurn];
    const canMove = pieceState[color].some((pos) => (pos === -1 && diceValue === 6) || pos !== -1);
    
    if (!canMove) {
        setTimeout(() => { alert("No moves possible!"); nextTurn(); }, 800);
    } else {
        highlightMoves(color);
    }
}

function highlightMoves(color) {
    pieceState[color].forEach((pos, i) => {
        if ((pos === -1 && diceValue === 6) || pos !== -1) {
            document.getElementById(`${color[0]}${i}`).classList.add('highlight');
        }
    });
}

function handlePieceClick(color, index) {
    if (!hasRolled || players[currentTurn] !== color) return;
    
    let pos = pieceState[color][index];
    if (pos === -1 && diceValue === 6) {
        pieceState[color][index] = 0;
        finishMove();
    } else if (pos !== -1) {
        pieceState[color][index] += diceValue;
        finishMove();
    }
}

function finishMove() {
    document.querySelectorAll('.piece').forEach(p => p.classList.remove('highlight'));
    render();
    if (diceValue !== 6) nextTurn();
    else hasRolled = false;
}

function nextTurn() {
    currentTurn = (currentTurn + 1) % 4;
    hasRolled = false;
    updateUI();
}

function updateUI() {
    const status = document.getElementById('status-display');
    const activeColor = players[currentTurn];
    status.innerText = `${activeColor}'s Turn`;
    status.style.color = activeColor;
}

function render() {
    players.forEach(color => {
        pieceState[color].forEach((pos, i) => {
            const el = document.getElementById(`${color[0]}${i}`);
            let coords;
            if (pos === -1) {
                coords = baseCoords[color][i];
            } else {
                let pathIdx = (pos + startOffsets[color]) % 52;
                coords = mainPath[pathIdx];
            }
            el.style.top = (coords[0] * 6.666) + "%";
            el.style.left = (coords[1] * 6.666) + "%";
        });
    });
}

init();
