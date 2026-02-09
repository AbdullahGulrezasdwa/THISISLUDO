const allColors = ['red', 'green', 'yellow', 'blue'];
const colorFile = { red: 'rd', green: 'gn', yellow: 'yl', blue: 'bl' };
const startOffsets = { red: 0, green: 13, yellow: 26, blue: 39 };
const safeSpots = [0, 8, 13, 21, 26, 34, 39, 47];

let activeColors = []; 
let playerNames = {}; 
let currentTurnIndex = 0;
let diceValue = 0;
let hasRolled = false;
let pieceState = { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] };

const mainPath = [
    [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
    [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],
    [12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]
];

const baseCoords = {
    red:    [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]],
    green:  [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]],
    yellow: [[10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]],
    blue:   [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]]
};

function toggleNameInputs() {
    const count = parseInt(document.getElementById('player-count').value);
    const container = document.getElementById('name-inputs');
    container.innerHTML = '';

    if (count === 1) activeColors = ['red'];
    else if (count === 2) activeColors = ['red', 'yellow']; 
    else if (count === 3) activeColors = ['red', 'green', 'yellow'];
    else activeColors = ['red', 'green', 'yellow', 'blue'];

    activeColors.forEach(color => {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `name-${color}`;
        input.placeholder = `${color.toUpperCase()} Name ${color === 'red' ? "(Try 'codered')" : ""}`;
        container.appendChild(input);
    });
}

// Run initialization
toggleNameInputs();

function startGame() {
    const container = document.getElementById('pieces-container');
    container.innerHTML = '';
    
    activeColors.forEach(color => {
        const nameVal = document.getElementById(`name-${color}`).value;
        playerNames[color] = nameVal || color.toUpperCase();
        
        for (let j = 0; j < 4; j++) {
            const p = document.createElement('div');
            p.className = `piece ${color}`;
            p.id = `${color[0]}${j}`;
            p.onclick = () => handlePieceClick(color, j);
            p.innerHTML = `<img src="images/${colorFile[color]}_kati.png" onerror="this.src='https://via.placeholder.com/30?text=P'">`;
            container.appendChild(p);
        }
    });

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';
    render();
    updateUI();
}

function rollDice() {
    if (hasRolled) return;
    const box = document.getElementById('dice-box');
    box.classList.add('dice-rolling');

    setTimeout(() => {
        box.classList.remove('dice-rolling');
        const color = activeColors[currentTurnIndex];
        const name = playerNames[color].toLowerCase();
        
        // PRANK: 1 in 3 chance for a 6 for codered
        if (name === "codered" && color === 'red') {
            const prankPool = [1, 2, 3, 4, 5, 6, 6, 6]; 
            diceValue = prankPool[Math.floor(Math.random() * prankPool.length)];
        } else {
            diceValue = Math.floor(Math.random() * 6) + 1;
        }

        const icons = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        box.innerText = icons[diceValue - 1];
        hasRolled = true;

        checkPossibleMoves(color);
    }, 500);
}

function checkPossibleMoves(color) {
    const canMove = pieceState[color].some(p => (p === -1 && diceValue === 6) || p !== -1);
    
    if (!canMove) {
        document.getElementById('instruction').innerText = "No moves possible!";
        setTimeout(nextTurn, 1000);
    } else {
        document.getElementById('instruction').innerText = "Select a piece to move";
        pieceState[color].forEach((p, i) => {
            if ((p === -1 && diceValue === 6) || p !== -1) {
                document.getElementById(`${color[0]}${i}`).classList.add('highlight');
            }
        });
    }
}

function handlePieceClick(color, index) {
    if (!hasRolled || activeColors[currentTurnIndex] !== color) return;
    let pos = pieceState[color][index];

    if (pos === -1 && diceValue === 6) {
        pieceState[color][index] = 0;
        moveResolved(color, 0);
    } else if (pos !== -1) {
        pieceState[color][index] += diceValue;
        moveResolved(color, pieceState[color][index]);
    }
}

function moveResolved(color, newPos) {
    if (newPos < 52) {
        let globalIdx = (newPos + startOffsets[color]) % 52;
        if (!safeSpots.includes(globalIdx)) {
            activeColors.forEach(pColor => {
                if (pColor === color) return;
                pieceState[pColor].forEach((otherPos, i) => {
                    if (otherPos !== -1 && otherPos < 52) {
                        if ((otherPos + startOffsets[pColor]) % 52 === globalIdx) {
                            pieceState[pColor][i] = -1; 
                        }
                    }
                });
            });
        }
    }
    
    document.querySelectorAll('.piece').forEach(p => p.classList.remove('highlight'));
    render();
    if (diceValue !== 6) nextTurn();
    else { hasRolled = false; updateUI("Roll again!"); }
}

function nextTurn() {
    currentTurnIndex = (currentTurnIndex + 1) % activeColors.length;
    hasRolled = false;
    updateUI();
}

function updateUI(msg) {
    const s = document.getElementById('status-display');
    const label = document.getElementById('player-label');
    const color = activeColors[currentTurnIndex];
    s.innerText = color.toUpperCase() + "'S TURN";
    s.style.color = (color === 'yellow') ? '#f1c40f' : color;
    label.innerText = `Player: ${playerNames[color]}`;
    document.getElementById('instruction').innerText = msg || "Click Dice to Roll";
}

function render() {
    activeColors.forEach(color => {
        pieceState[color].forEach((pos, i) => {
            const el = document.getElementById(`${color[0]}${i}`);
            if (!el) return;
            let coords = (pos === -1) ? baseCoords[color][i] : mainPath[(pos + startOffsets[color]) % 52];
            el.style.top = (coords[0] * 6.666) + "%";
            el.style.left = (coords[1] * 6.666) + "%";
        });
    });
}
