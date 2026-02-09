const allColors = ['red', 'green', 'yellow', 'blue'];
const colorFile = { red: 'rd', green: 'gn', yellow: 'yl', blue: 'bl' };
const startOffsets = { red: 0, green: 13, yellow: 26, blue: 39 };
const safeSpots = [0, 8, 13, 21, 26, 34, 39, 47];

let activeColors = [], playerNames = {}, currentTurnIndex = 0, diceValue = 0;
let hasRolled = false, isAnimating = false, isMuted = false;
let killStatus = { red: false, green: false, yellow: false, blue: false };
let pieceState = { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] };

// SFX Engine
const sfx = {
    roll: new Audio('sfx/dice-roll.mp3'),
    move: new Audio('sfx/move.mp3'),
    capture: new Audio('sfx/capture.mp3'),
    win: new Audio('sfx/win.mp3')
};

function play(name) { if (!isMuted && sfx[name]) { sfx[name].currentTime = 0; sfx[name].play().catch(()=>{}); } }
function toggleMute() { isMuted = !isMuted; document.getElementById('mute-btn').innerText = isMuted ? "🔇" : "🔊"; }

// Coordinates
const mainPath = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
const homePaths = { red:[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]], green:[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]], yellow:[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]], blue:[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]] };
const baseCoords = { red:[[1.5,1.5],[1.5,3.5],[3.5,1.5],[3.5,3.5]], green:[[1.5,10.5],[1.5,12.5],[3.5,10.5],[3.5,12.5]], yellow:[[10.5,10.5],[10.5,12.5],[12.5,10.5],[12.5,12.5]], blue:[[10.5,1.5],[10.5,3.5],[12.5,1.5],[12.5,3.5]] };

function toggleNameInputs() {
    const count = parseInt(document.getElementById('player-count').value);
    const container = document.getElementById('name-inputs');
    container.innerHTML = '';
    activeColors = (count === 1) ? ['red'] : (count === 2) ? ['red', 'yellow'] : (count === 3) ? ['red', 'green', 'yellow'] : ['red', 'green', 'yellow', 'blue'];
    activeColors.forEach(c => {
        const i = document.createElement('input'); i.id = `name-${c}`; i.placeholder = `${c.toUpperCase()} Name`;
        container.appendChild(i);
    });
}
toggleNameInputs();

function startGame() {
    activeColors.forEach(c => {
        playerNames[c] = document.getElementById(`name-${c}`).value || c.toUpperCase();
        const stat = document.createElement('div'); stat.id = `stat-${c}`; stat.className = 'stat-item';
        stat.innerHTML = `${playerNames[c]}: <span class="lock">🔒</span>`;
        document.getElementById('status-board').appendChild(stat);
        for (let j=0; j<4; j++) {
            const p = document.createElement('div'); p.className=`piece ${c}`; p.id=`${c[0]}${j}`;
            p.onclick = () => handleMove(c, j);
            p.onmouseenter = () => showGhost(c, j); p.onmouseleave = hideGhost;
            p.innerHTML = `<img src="images/${colorFile[c]}_kati.png" onerror="this.src='https://via.placeholder.com/30?text=P'">`;
            document.getElementById('pieces-container').appendChild(p);
        }
    });
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';
    render(); updateUI();
}

function rollDice() {
    if (hasRolled || isAnimating) return;
    play('roll');
    const box = document.getElementById('dice-box');
    box.classList.add('dice-rolling');
    setTimeout(() => {
        box.classList.remove('dice-rolling');
        const c = activeColors[currentTurnIndex];
        let pool = (playerNames[c].toLowerCase() === "codered") ? [2,3,5,6] : [1,2,3,4,4,5,5,6];
        diceValue = pool[Math.floor(Math.random() * pool.length)];
        box.innerText = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceValue-1];
        hasRolled = true; checkMoves(c);
    }, 400);
}

function checkMoves(c) {
    const canMove = pieceState[c].some((_, i) => isValid(c, i));
    if (!canMove) {
        document.getElementById('instruction').innerText = !killStatus[c] && pieceState[c].some(p => p+diceValue > 51) ? "Must kill to enter home!" : "No moves!";
        setTimeout(nextTurn, 1500);
    } else {
        document.getElementById('instruction').innerText = "Pick a piece!";
        pieceState[c].forEach((_, i) => { if (isValid(c, i)) document.getElementById(`${c[0]}${i}`).classList.add('highlight'); });
    }
}

function isValid(c, i) {
    let p = pieceState[c][i];
    if (p === -1) return diceValue === 6;
    if (p >= 57 || p + diceValue > 57) return false;
    if (!killStatus[c] && p + diceValue > 51) return false;
    return true;
}

async function handleMove(c, i) {
    if (!hasRolled || isAnimating || activeColors[currentTurnIndex] !== c || !isValid(c, i)) return;
    isAnimating = true; hideGhost();
    document.querySelectorAll('.piece').forEach(p => p.classList.remove('highlight'));
    
    let cur = pieceState[c][i];
    if (cur === -1) { 
        pieceState[c][i] = 0; play('move'); render(); 
    } else {
        let target = cur + diceValue;
        for (let s = cur + 1; s <= target; s++) {
            pieceState[c][i] = s; play('move'); render();
            await new Promise(r => setTimeout(r, 200));
        }
    }
    
    if (pieceState[c][i] === 57) { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); }
    isAnimating = false; resolve(c, pieceState[c][i]);
}

function resolve(c, pos) {
    if (pos < 51) {
        let idx = (pos + startOffsets[c]) % 52;
        if (!safeSpots.includes(idx)) {
            activeColors.forEach(oc => {
                if (oc === c) return;
                pieceState[oc].forEach((op, oi) => {
                    if (op !== -1 && op < 51 && (op + startOffsets[oc]) % 52 === idx) {
                        pieceState[oc][oi] = -1; play('capture');
                        killStatus[c] = true; document.getElementById('board').classList.add('shake');
                        setTimeout(() => document.getElementById('board').classList.remove('shake'), 200);
                        let s = document.getElementById(`stat-${c}`); s.classList.add('unlocked'); s.querySelector('.lock').innerText = '⚔️';
                    }
                });
            });
        }
    }
    if (pieceState[c].every(p => p === 57)) { play('win'); alert(playerNames[c] + " WINS!"); location.reload(); }
    if (diceValue !== 6) nextTurn(); else { hasRolled = false; updateUI("Roll again!"); }
}

function showGhost(c, i) {
    if (!hasRolled || isAnimating || activeColors[currentTurnIndex] !== c || !isValid(c, i)) return;
    let f = pieceState[c][i] === -1 ? 0 : pieceState[c][i] + diceValue;
    let co = f < 52 ? mainPath[(f + startOffsets[c]) % 52] : homePaths[c][f - 52];
    const g = document.createElement('div'); g.id = 'ghost'; g.className = `piece ${c} ghost`;
    g.style.top = `${co[0] * 6.666}%`; g.style.left = `${co[1] * 6.666}%`;
    g.innerHTML = `<img src="images/${colorFile[c]}_kati.png">`;
    document.getElementById('board').appendChild(g);
}
function hideGhost() { const g = document.getElementById('ghost'); if (g) g.remove(); }
function nextTurn() { currentTurnIndex = (currentTurnIndex + 1) % activeColors.length; hasRolled = false; updateUI(); }

function updateUI(m) {
    const c = activeColors[currentTurnIndex];
    document.querySelectorAll('.stat-item').forEach(s => s.classList.remove('active-player'));
    if(document.getElementById(`stat-${c}`)) document.getElementById(`stat-${c}`).classList.add('active-player');
    const sd = document.getElementById('status-display');
    sd.innerText = c.toUpperCase() + "'S TURN"; sd.style.color = (c === 'yellow') ? '#f1c40f' : c;
    document.getElementById('player-label').innerText = `Player: ${playerNames[c]}`;
    document.getElementById('instruction').innerText = m || "Roll the Dice!";
    
    const tilts = { red: "rotateX(4deg) rotateY(-4deg)", green: "rotateX(-4deg) rotateY(-4deg)", yellow: "rotateX(-4deg) rotateY(4deg)", blue: "rotateX(4deg) rotateY(4deg)" };
    document.getElementById('board').style.transform = tilts[c] || "none";
}

function render() {
    activeColors.forEach(c => {
        pieceState[c].forEach((p, i) => {
            const el = document.getElementById(`${c[0]}${i}`);
            let co = p === -1 ? baseCoords[c][i] : (p < 52 ? mainPath[(p + startOffsets[c]) % 52] : homePaths[c][p - 52]);
            el.style.top = `${co[0] * 6.666}%`; el.style.left = `${co[1] * 6.666}%`;
            el.style.opacity = p === 57 ? "0.3" : "1";
        });
    });
}
