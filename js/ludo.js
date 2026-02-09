const players = ['red', 'green', 'yellow', 'blue'];
const icons = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const startOffsets = { red: 0, green: 13, yellow: 26, blue: 39 };
const safeSpots = [0, 8, 13, 21, 26, 34, 39, 47];

let numPlayers = 2;
let currentTurn = 0;
let diceValue = 0;
let hasRolled = false;
let playerNames = [];
let pieceState = { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] };

// Coordinate Map (X, Y)
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

// --- SETUP FUNCTIONS ---
function toggleNameInputs() {
    const count = parseInt(document.getElementById('player-count').value);
    for (let i = 0; i < 4; i++) {
        document.getElementById(`p${i}-name`).style.display = (i < count) ? 'block' : 'none';
    }
}

function startGame() {
    numPlayers = parseInt(document.getElementById('player-count').value);
    playerNames = [];
    const container = document.getElementById('pieces-container');
    container.innerHTML = '';

    // Mapping colors to your specific filenames
    const colorMap = {
        red: 'rd',
        green: 'gn',
        yellow: 'yl',
        blue: 'bl'
    };

    for (let i = 0; i < numPlayers; i++) {
        let name = document.getElementById(`p${i}-name`).value || players[i].toUpperCase();
        playerNames.push(name);
        
        for (let j = 0; j < 4; j++) {
            const p = document.createElement('div');
            p.className = `piece ${players[i]}`;
            p.id = `${players[i][0]}${j}`;
            p.onclick = () => handlePieceClick(players[i], j);
            
            // Fixed the path to match your actual filenames (rd, gn, yl, bl)
            const filePrefix = colorMap[players[i]];
            p.innerHTML = `<img src="images/${filePrefix}_kati.png" alt="${players[i]}">`;
            
            container.appendChild(p);
        }
    }

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';
    render();
    updateUI();
}

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';
    render();
    updateUI();
}

// --- CORE LOGIC ---
function rollDice() {
    if (hasRolled) return;
    const diceBtn = document.getElementById('dice-box');
    diceBtn.classList.add('dice-rolling');

    setTimeout(() => {
        diceBtn.classList.remove('dice-rolling');
        
        let name = playerNames[currentTurn].toLowerCase();
        // PRANK: 10% higher chance for 5 or 6 if name is codered
        if (name === "codered" && players[currentTurn] === 'red') {
            const weightedPool = [1, 2, 3, 4, 5, 5, 6, 6]; 
            diceValue = weightedPool[Math.floor(Math.random() * weightedPool.length)];
        } else {
            diceValue = Math.floor(Math.random() * 6) + 1;
        }

        diceBtn.innerText = icons[diceValue - 1];
        hasRolled = true;

        const color = players[currentTurn];
        const canMove = pieceState[color].some(pos => (pos === -1 && diceValue === 6) || pos !== -1);
        
        if (!canMove) {
            document.getElementById('instruction').innerText = "No moves! Next turn...";
            setTimeout(nextTurn, 1200);
        } else {
            document.getElementById('instruction').innerText = "Pick a piece!";
            highlightPieces(color);
        }
    }, 600);
}

function highlightPieces(color) {
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
            // Check for captures
            players.forEach(pColor => {
                if (pColor === color) return;
                pieceState[pColor].forEach((otherPos, i) => {
                    if (otherPos !== -1 && otherPos < 52) {
                        if ((otherPos + startOffsets[pColor]) % 52 === globalIdx) {
                            pieceState[pColor][i] = -1; // Kicked back
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
    currentTurn = (currentTurn + 1) % numPlayers;
    hasRolled = false;
    updateUI();
}

function updateUI(msg) {
    const s = document.getElementById('status-display');
    const label = document.getElementById('player-label');
    const color = players[currentTurn];
    s.innerText = color.toUpperCase() + "'S TURN";
    s.style.color = color;
    label.innerText = `Player: ${playerNames[currentTurn]}`;
    document.getElementById('instruction').innerText = msg || "Click the Dice to Roll";
}

function render() {
    players.forEach(color => {
        if (!pieceState[color]) return;
        pieceState[color].forEach((pos, i) => {
            const el = document.getElementById(`${color[0]}${i}`);
            if (!el) return;
            let coords = (pos === -1) ? baseCoords[color][i] : mainPath[(pos + startOffsets[color]) % 52];
            el.style.top = (coords[0] * 6.666) + "%";
            el.style.left = (coords[1] * 6.666) + "%";
        });
    });
}

