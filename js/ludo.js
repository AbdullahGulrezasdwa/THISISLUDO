// --- CONFIGURATION & STATE ---
const allColors = ['red', 'green', 'yellow', 'blue'];
const colorFile = { red: 'rd', green: 'gn', yellow: 'yl', blue: 'bl' };
const startOffsets = { red: 0, green: 13, yellow: 26, blue: 39 };
const safeSpots = [0, 8, 13, 21, 26, 34, 39, 47];

let activeColors = []; 
let playerNames = {}; 
let currentTurnIndex = 0;
let diceValue = 0;
let hasRolled = false;
let isMuted = false;
let killStatus = { red: false, green: false, yellow: false, blue: false };
let pieceState = { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] };

// --- SOUND MANAGER ---
const sfx = {
    roll: new Audio('sfx/dice-roll.mp3'),
    move: new Audio('sfx/move.mp3'),
    capture: new Audio('sfx/capture.mp3'),
    win: new Audio('sfx/win.mp3')
};

function playSound(name) {
    if (!isMuted && sfx[name]) {
        sfx[name].currentTime = 0;
        sfx[name].play().catch(() => {});
    }
}

function toggleMute() {
    isMuted = !isMuted;
    document.getElementById('mute-btn').innerText = isMuted ? "🔇" : "🔊";
}

// --- PATH DATA ---
const mainPath = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
const homePaths = {
    red:    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
    green:  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
    yellow: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
    blue:   [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
};
const baseCoords = {
    red:    [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]],
    green:  [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]],
    yellow: [[10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]],
    blue:   [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]]
};

// --- CORE FUNCTIONS ---
function toggleNameInputs() {
    const count = parseInt(document.getElementById('player-count').value);
    const container = document.getElementById('name-inputs');
    container.innerHTML = '';
    activeColors = (count === 1) ? ['red'] : (count === 2) ? ['red', 'yellow'] : (count === 3) ? ['red', 'green', 'yellow'] : ['red', 'green', 'yellow', 'blue'];

    activeColors.forEach(color => {
        const input = document.createElement('input');
        input.type = 'text'; input.id = `name-${color}`;
        input.placeholder = `${color.toUpperCase()} Name ${color === 'red' ? "(Try 'codered')" : ""}`;
        container.appendChild(input);
    });
}
toggleNameInputs();

function startGame() {
    const container = document.getElementById('pieces-container');
    const boardStat = document.getElementById('status-board');
    container.innerHTML = ''; boardStat.innerHTML = '';

    activeColors.forEach(color => {
        playerNames[color] = document.getElementById(`name-${color}`).value || color.toUpperCase();
        
        const div = document.createElement('div');
        div.id = `stat-${color}`; div.className = 'stat-item';
        div.innerHTML = `${color.toUpperCase()}: <span class="lock">🔒</span>`;
        boardStat.appendChild(div);

        for (let j = 0; j < 4; j++) {
            const p = document.createElement('div');
            p.className = `piece ${color}`; p.id = `${color[0]}${j}`;
            p.onclick = () => handlePieceClick(color, j);
            p.onmouseenter = () => showGhost(color, j);
            p.onmouseleave = () => hideGhost();
            p.innerHTML = `<img src="images/${colorFile[color]}_kati.png" onerror="this.src='https://via.placeholder.com/30?text=P'">`;
            container.appendChild(p);
        }
    });
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';
    render(); updateUI();
}

function rollDice() {
    if (hasRolled) return;
    playSound('roll');
    const box = document.getElementById('dice-box');
    box.classList.add('dice-rolling');
    setTimeout(() => {
        box.classList.remove('dice-rolling');
        const color = activeColors[currentTurnIndex];
        const name = playerNames[color].toLowerCase();
        let pool = (name === "codered" && color === 'red') ? [2,3,5,6] : [1,2,3,4,4,5,5,6];
        diceValue = pool[Math.floor(Math.random() * pool.length)];
        const icons = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        box.innerText = icons[diceValue - 1];
        hasRolled = true;
        checkPossibleMoves(color);
    }, 400);
}

function checkPossibleMoves(color) {
    const canMove = pieceState[color].some((p, i) => isValidMove(color, i));
    if (!canMove) {
        document.getElementById('instruction').innerText = !killStatus[color] && pieceState[color].some(p => p+diceValue > 51) ? "Need a kill to enter home!" : "No moves possible!";
        setTimeout(nextTurn, 1200);
    } else {
        document.getElementById('instruction').innerText = "Pick a piece!";
        pieceState[color].forEach((p, i) => {
            if (isValidMove(color, i)) document.getElementById(`${color[0]}${i}`).classList.add('highlight');
        });
    }
}

function isValidMove(color, index) {
    let p = pieceState[color][index];
    if (p === -1) return diceValue === 6;
    if (p >= 57) return false;
    let next = p + diceValue;
    if (next > 57) return false;
    if (!killStatus[color] && next > 51) return false; // KILL RULE BARRIER
    return true;
}

function handlePieceClick(color, index) {
    if (!hasRolled || activeColors[currentTurnIndex] !== color || !isValidMove(color, index)) return;
    playSound('move');
    hideGhost();
    if (pieceState[color][index] === -1) pieceState[color][index] = 0;
    else pieceState[color][index] += diceValue;
    moveResolved(color, pieceState[color][index]);
}

function moveResolved(color, newPos) {
    // Capture Logic
    if (newPos < 51) {
        let globalIdx = (newPos + startOffsets[color]) % 52;
        if (!safeSpots.includes(globalIdx)) {
            activeColors.forEach(pColor => {
                if (pColor === color) return;
                pieceState[pColor].forEach((otherPos, i) => {
                    if (otherPos !== -1 && otherPos < 51 && (otherPos + startOffsets[pColor]) % 52 === globalIdx) {
                        pieceState[pColor][i] = -1;
                        triggerCaptureEffects(color);
                    }
                });
            });
        }
    }
    // Win Logic
    if (pieceState[color].every(p => p === 57)) { 
        playSound('win');
        alert(playerNames[color] + " WINS!"); 
        location.reload(); 
    }
    document.querySelectorAll('.piece').forEach(p => p.classList.remove('highlight'));
    render();
    if (diceValue !== 6) nextTurn(); else { hasRolled = false; updateUI("Roll again!"); }
}

function triggerCaptureEffects(color) {
    playSound('capture');
    killStatus[color] = true;
    document.getElementById('board').classList.add('shake');
    setTimeout(() => document.getElementById('board').classList.remove('shake'), 200);
    const stat = document.getElementById(`stat-${color}`);
    stat.classList.add('unlocked');
    stat.querySelector('.lock').innerText = '⚔️';
}

function showGhost(color, index) {
    if (!hasRolled || activeColors[currentTurnIndex] !== color || !isValidMove(color, index)) return;
    let futurePos = pieceState[color][index] === -1 ? 0 : pieceState[color][index] + diceValue;
    let coords = futurePos < 52 ? mainPath[(futurePos + startOffsets[color]) % 52] : homePaths[color][futurePos - 52];
    const g = document.createElement('div');
    g.id = 'ghost'; g.className = `piece ${color} ghost`;
    g.style.top = (coords[0] * 6.666) + "%"; g.style.left = (coords[1] * 6.666) + "%";
    g.innerHTML = `<img src="images/${colorFile[color]}_kati.png">`;
    document.getElementById('board').appendChild(g);
}

function hideGhost() { const g = document.getElementById('ghost'); if (g) g.remove(); }

function nextTurn() { currentTurnIndex = (currentTurnIndex + 1) % activeColors.length; hasRolled = false; updateUI(); }

function updateUI(msg) {
    const color = activeColors[currentTurnIndex];
    document.querySelectorAll('.stat-item').forEach(s => s.classList.remove('active-player'));
    if(document.getElementById(`stat-${color}`)) document.getElementById(`stat-${color}`).classList.add('active-player');
    const sd = document.getElementById('status-display');
    sd.innerText = color.toUpperCase() + "'S TURN";
    sd.style.color = (color === 'yellow') ? '#f1c40f' : color;
    document.getElementById('player-label').innerText = `Player: ${playerNames[color]}`;
    document.getElementById('instruction').innerText = msg || "Roll the Dice!";
}

function render() {
    activeColors.forEach(color => {
        pieceState[color].forEach((pos, i) => {
            const el = document.getElementById(`${color[0]}${i}`);
            let coords = pos === -1 ? baseCoords[color][i] : (pos < 52 ? mainPath[(pos + startOffsets[color]) % 52] : homePaths[color][pos - 52]);
            el.style.top = (coords[0] * 6.666) + "%"; el.style.left = (coords[1] * 6.666) + "%";
            el.style.opacity = pos === 57 ? "0.3" : "1";
        });
    });
}
