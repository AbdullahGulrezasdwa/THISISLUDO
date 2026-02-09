const allColors = ['red', 'green', 'yellow', 'blue'];
const colorFile = { red: 'rd', green: 'gn', yellow: 'yl', blue: 'bl' };
const startOffsets = { red: 0, green: 13, yellow: 26, blue: 39 };
const safeSpots = [0, 8, 13, 21, 26, 34, 39, 47];

let activeColors = [], playerNames = {}, currentTurnIndex = 0, diceValue = 0;
let hasRolled = false, isAnimating = false, isMuted = false;
let killStatus = { red: false, green: false, yellow: false, blue: false };
let pieceState = { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] };

const sfx = {
    roll: new Audio('sfx/dice-roll.mp3'),
    move: new Audio('sfx/move.mp3'),
    capture: new Audio('sfx/capture.mp3'),
    win: new Audio('sfx/win.mp3')
};

function play(name) { 
    if (!isMuted && sfx[name]) { 
        if (name === 'move') {
            let snap = sfx[name].cloneNode(); snap.volume = 0.6; snap.play().catch(()=>{});
        } else {
            sfx[name].currentTime = 0; sfx[name].play().catch(()=>{}); 
        }
    } 
}

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
    box.classList.remove('bonus-glow');
    box.classList.add('dice-rolling');
    setTimeout(() => {
        box.classList.remove('dice-rolling');
        const c = activeColors[currentTurnIndex];
        diceValue = Math.floor(Math.random() * 6) + 1;
        box.innerText = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceValue-1];
        hasRolled = true; checkMoves(c);
    }, 400);
}

function checkMoves(c) {
    const canMove = pieceState[c].some((_, i) => isValid(c, i));
    if (!canMove) { setTimeout(nextTurn, 1500); }
    else {
        pieceState[c].forEach((_, i) => { if (isValid(c, i)) document.getElementById(`${c[0]}${i}`).classList.add('highlight'); });
    }
}

function isValid(c, i) {
    let p = pieceState[c][i];
    if (p === -1) return diceValue === 6;
    if (p + diceValue > 57) return false;
    if (!killStatus[c] && p + diceValue > 51) return false;
    return true;
}

async function handleMove(c, i) {
    if (!hasRolled || isAnimating || activeColors[currentTurnIndex] !== c || !isValid(c, i)) return;
    isAnimating = true;
    document.querySelectorAll('.piece').forEach(p => p.classList.remove('highlight'));
    
    let cur = pieceState[c][i];
    if (cur === -1) { 
        pieceState[c][i] = 0; play('move'); render(); 
        await new Promise(r => setTimeout(r, 200)); 
    } else {
        let target = cur + diceValue;
        for (let s = cur + 1; s <= target; s++) {
            pieceState[c][i] = s; play('move'); render();
            await new Promise(r => setTimeout(r, 180)); 
        }
    }
    isAnimating = false; resolve(c, pieceState[c][i]);
}

function resolve(c, pos) {
    let bonusTurn = false;
    
    if (pos === 57) { 
        bonusTurn = true; 
        confetti({ particleCount: 100, spread: 70 }); 
    }

    if (pos < 51) {
        let idx = (pos + startOffsets[c]) % 52;
        if (!safeSpots.includes(idx)) {
            activeColors.forEach(oc => {
                if (oc === c) return;
                pieceState[oc].forEach((op, oi) => {
                    // Check if opponent is on the same global square
                    if (op !== -1 && op < 51 && (op + startOffsets[oc]) % 52 === idx) {
                        
                        pieceState[oc][oi] = -1; // Send them home in logic
                        play('capture');
                        
                        // --- THE FIX IS HERE ---
                        render(); // Teleport the piece home VISUALLY immediately
                        // -----------------------

                        killStatus[c] = true; 
                        bonusTurn = true; 
                        
                        document.getElementById('board').classList.add('shake');
                        setTimeout(() => document.getElementById('board').classList.remove('shake'), 200);
                        
                        let s = document.getElementById(`stat-${c}`); 
                        if(s) s.querySelector('.lock').innerText = '⚔️';
                    }
                });
            });
        }
    }

    // Win Check
    if (pieceState[c].every(p => p === 57)) { 
        play('win'); 
        alert(playerNames[c] + " WINS!"); 
        location.reload(); 
        return;
    }

    // Turn Handling
    if (diceValue === 6 || bonusTurn) {
        hasRolled = false; 
        updateUI(bonusTurn ? "BONUS TURN!" : "ROLL AGAIN!");
    } else {
        nextTurn();
    }
}

function nextTurn() { currentTurnIndex = (currentTurnIndex + 1) % activeColors.length; hasRolled = false; updateUI(); }

function updateUI(m) {
    const c = activeColors[currentTurnIndex];
    const name = playerNames[c] || c.toUpperCase(); // Get the custom name or color name

    // 1. Update the Status Display (The big text)
    const sd = document.getElementById('status-display');
    sd.innerText = name + "'S TURN"; 
    
    // Set color based on active player
    const colors = { red: '#ff4757', green: '#2ed573', yellow: '#ffa502', blue: '#1e90ff' };
    sd.style.color = colors[c];

    // 2. Update the Player Label (Above the dice)
    const pl = document.getElementById('player-label');
    pl.innerText = `Player: ${name}`;
    pl.style.color = colors[c]; // This adds the missing color to the name
    pl.style.fontWeight = "bold";

    // 3. Highlight the Stat Board item
    document.querySelectorAll('.stat-item').forEach(s => s.classList.remove('active-player'));
    const statEl = document.getElementById(`stat-${c}`);
    if(statEl) statEl.classList.add('active-player');

    // 4. Instructions and Dice Glow
    document.getElementById('instruction').innerText = m || "Roll the Dice!";
    const box = document.getElementById('dice-box');
    if (m === "BONUS TURN!" || m === "ROLL AGAIN!") {
        box.classList.add('bonus-glow');
    } else {
        box.classList.remove('bonus-glow');
    }

    // 5. Board Tilt/Glow
    const board = document.getElementById('board');
    board.style.boxShadow = `0 0 40px ${colors[c]}`;
}

function render() {
    activeColors.forEach(c => {
        pieceState[c].forEach((p, i) => {
            const el = document.getElementById(`${c[0]}${i}`);
            let co = p === -1 ? baseCoords[c][i] : (p < 52 ? mainPath[(p + startOffsets[c]) % 52] : homePaths[c][p - 52]);
            el.style.top = (co[0] * 6.6666) + "%"; 
            el.style.left = (co[1] * 6.6666) + "%";
        });
    });
}

function toggleMute() { isMuted = !isMuted; document.getElementById('mute-btn').innerText = isMuted ? "🔇" : "🔊"; }


