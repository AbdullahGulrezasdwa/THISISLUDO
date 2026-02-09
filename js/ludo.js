/**
 * LUDO ELITE ENGINE v2.0
 * Features: Sound Pooling, Async Move Queuing, State-Driven UI
 */

// --- CONFIGURATION ---
const CONFIG = {
    COLORS: ['red', 'green', 'yellow', 'blue'],
    OFFSETS: { red: 0, green: 13, yellow: 26, blue: 39 },
    SAFE_SPOTS: [0, 8, 13, 21, 26, 34, 39, 47],
    ANIM_SPEED: 180, // MS per step
    DICE_VALUES: [1, 2, 3, 4, 5, 6],
    CODE_RED_POOL: [2, 3, 5, 6]
};

// --- CORE STATE ---
let gameState = {
    activeColors: [],
    playerNames: {},
    turnIndex: 0,
    diceValue: 0,
    hasRolled: false,
    isAnimating: false,
    killStatus: { red: false, green: false, yellow: false, blue: false },
    pieceState: { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] },
    isMuted: false
};

// --- AUDIO POOLING ---
const SoundManager = {
    pool: {
        roll: [new Audio('sfx/dice-roll.mp3')],
        move: Array.from({length: 4}, () => new Audio('sfx/move.mp3')),
        capture: [new Audio('sfx/capture.mp3')],
        win: [new Audio('sfx/win.mp3')]
    },
    indices: { move: 0 },
    play(name) {
        if (gameState.isMuted) return;
        let track;
        if (name === 'move') {
            track = this.pool.move[this.indices.move];
            this.indices.move = (this.indices.move + 1) % this.pool.move.length;
        } else {
            track = this.pool[name][0];
        }
        track.currentTime = 0;
        track.play().catch(() => {});
    }
};

// --- NAVIGATION DATA ---
const GRID = {
    main: [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]],
    home: {
        red:[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
        green:[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
        yellow:[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
        blue:[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
    },
    base: {
        red:[[1.5,1.5],[1.5,3.5],[3.5,1.5],[3.5,3.5]],
        green:[[1.5,10.5],[1.5,12.5],[3.5,10.5],[3.5,12.5]],
        yellow:[[10.5,10.5],[10.5,12.5],[12.5,10.5],[12.5,12.5]],
        blue:[[10.5,1.5],[10.5,3.5],[12.5,1.5],[12.5,3.5]]
    }
};

// --- ENGINE LOGIC ---

function toggleNameInputs() {
    const count = parseInt(document.getElementById('player-count').value);
    const container = document.getElementById('name-inputs');
    container.innerHTML = '';
    gameState.activeColors = CONFIG.COLORS.slice(0, count === 1 ? 1 : count === 2 ? 3 : count); 
    // Logic tweak for 2 player (Red vs Yellow)
    if(count === 2) gameState.activeColors = ['red', 'yellow'];

    gameState.activeColors.forEach(c => {
        const input = document.createElement('input');
        input.id = `name-${c}`;
        input.placeholder = `${c.toUpperCase()} Name`;
        input.className = "setup-input";
        container.appendChild(input);
    });
}

async function startGame() {
    gameState.activeColors.forEach(c => {
        gameState.playerNames[c] = document.getElementById(`name-${c}`).value || c.toUpperCase();
        createStatusItem(c);
        createPieces(c);
    });
    document.getElementById('setup-screen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-area').style.display = 'block';
        render();
        updateUI();
    }, 500);
}

function createStatusItem(color) {
    const item = document.createElement('div');
    item.id = `stat-${color}`;
    item.className = 'stat-item';
    item.innerHTML = `<span>${gameState.playerNames[color]}</span> <span class="lock">🔒</span>`;
    document.getElementById('status-board').appendChild(item);
}

function createPieces(color) {
    for (let i = 0; i < 4; i++) {
        const p = document.createElement('div');
        p.className = `piece ${color}`;
        p.id = `${color[0]}${i}`;
        p.onclick = () => handleMove(color, i);
        p.innerHTML = `<img src="images/${color[0]}d_kati.png" onerror="this.src='https://via.placeholder.com/30?text=P'">`;
        document.getElementById('pieces-container').appendChild(p);
    }
}

async function rollDice() {
    if (gameState.hasRolled || gameState.isAnimating) return;
    
    SoundManager.play('roll');
    const box = document.getElementById('dice-box');
    box.classList.add('dice-rolling');
    
    await new Promise(r => setTimeout(r, 600));
    
    const color = gameState.activeColors[gameState.turnIndex];
    const pool = gameState.playerNames[color].toLowerCase() === "codered" ? CONFIG.CODE_RED_POOL : CONFIG.DICE_VALUES;
    gameState.diceValue = pool[Math.floor(Math.random() * pool.length)];
    
    box.classList.remove('dice-rolling');
    box.innerText = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][gameState.diceValue - 1];
    gameState.hasRolled = true;
    
    highlightValidMoves(color);
}

function highlightValidMoves(color) {
    let movePossible = false;
    gameState.pieceState[color].forEach((pos, i) => {
        if (checkValidity(color, i)) {
            document.getElementById(`${color[0]}${i}`).classList.add('highlight');
            movePossible = true;
        }
    });
    
    if (!movePossible) {
        updateUI("No Moves!");
        setTimeout(nextTurn, 1000);
    } else {
        updateUI("Select a Piece");
    }
}

function checkValidity(color, i) {
    const pos = gameState.pieceState[color][i];
    if (pos === -1) return gameState.diceValue === 6;
    if (pos + gameState.diceValue > 57) return false;
    if (!gameState.killStatus[color] && (pos + gameState.diceValue > 51)) return false;
    return true;
}

async function handleMove(color, i) {
    if (!gameState.hasRolled || gameState.isAnimating || gameState.activeColors[gameState.turnIndex] !== color) return;
    if (!checkValidity(color, i)) return;

    gameState.isAnimating = true;
    document.querySelectorAll('.piece').forEach(p => p.classList.remove('highlight'));
    
    let currentPos = gameState.pieceState[color][i];
    
    // Step 1: Exit Base
    if (currentPos === -1) {
        gameState.pieceState[color][i] = 0;
        SoundManager.play('move');
        render();
        await new Promise(r => setTimeout(r, 300));
    } else {
        // Step 2: Walk the Path
        const target = currentPos + gameState.diceValue;
        for (let s = currentPos + 1; s <= target; s++) {
            gameState.pieceState[color][i] = s;
            SoundManager.play('move');
            render();
            await new Promise(r => setTimeout(r, CONFIG.ANIM_SPEED));
        }
    }
    
    gameState.isAnimating = false;
    resolveTurn(color, gameState.pieceState[color][i]);
}

function resolveTurn(color, finalPos) {
    let earnedBonus = false;

    // 1. Goal Bonus
    if (finalPos === 57) {
        earnedBonus = true;
        confetti({ particleCount: 150, spread: 60 });
    }

    // 2. Capture Logic
    if (finalPos < 51 && !CONFIG.SAFE_SPOTS.includes((finalPos + CONFIG.OFFSETS[color]) % 52)) {
        const globalIdx = (finalPos + CONFIG.OFFSETS[color]) % 52;
        
        gameState.activeColors.forEach(otherColor => {
            if (otherColor === color) return;
            gameState.pieceState[otherColor].forEach((otherPos, otherIdx) => {
                if (otherPos !== -1 && otherPos < 51) {
                    const otherGlobal = (otherPos + CONFIG.OFFSETS[otherColor]) % 52;
                    if (globalIdx === otherGlobal) {
                        gameState.pieceState[otherColor][otherIdx] = -1; // Send home
                        gameState.killStatus[color] = true;
                        earnedBonus = true;
                        SoundManager.play('capture');
                        document.getElementById('board').classList.add('shake');
                        setTimeout(() => document.getElementById('board').classList.remove('shake'), 200);
                    }
                }
            });
        });
        render(); // Teleport captured pieces home instantly
    }

    // 3. Win Check
    if (gameState.pieceState[color].every(p => p === 57)) {
        SoundManager.play('win');
        alert(`${gameState.playerNames[color]} is Victorious!`);
        location.reload();
        return;
    }

    // 4. Bonus for 6 or Capture
    if (gameState.diceValue === 6 || earnedBonus) {
        gameState.hasRolled = false;
        updateUI("BONUS TURN!");
    } else {
        nextTurn();
    }
}

function nextTurn() {
    gameState.turnIndex = (gameState.turnIndex + 1) % gameState.activeColors.length;
    gameState.hasRolled = false;
    updateUI();
}

// --- RENDERING PIPELINE ---

function render() {
    gameState.activeColors.forEach(color => {
        gameState.pieceState[color].forEach((pos, i) => {
            const el = document.getElementById(`${color[0]}${i}`);
            let coords;
            
            if (pos === -1) {
                coords = GRID.base[color][i];
            } else if (pos < 52) {
                coords = GRID.main[(pos + CONFIG.OFFSETS[color]) % 52];
            } else {
                coords = GRID.home[color][pos - 52];
            }
            
            el.style.top = `${coords[0] * 6.6666}%`;
            el.style.left = `${coords[1] * 6.6666}%`;
            el.style.opacity = pos === 57 ? "0.4" : "1";
        });
    });
}

function updateUI(msg) {
    const color = gameState.activeColors[gameState.turnIndex];
    const colors = { red: '#ff4757', green: '#2ed573', yellow: '#ffa502', blue: '#1e90ff' };
    
    // Status Text
    const sd = document.getElementById('status-display');
    sd.innerText = `${gameState.playerNames[color].toUpperCase()}'S TURN`;
    sd.style.color = colors[color];
    
    // Dice Glow
    const box = document.getElementById('dice-box');
    box.classList.remove('bonus-glow');
    if (msg === "BONUS TURN!") box.classList.add('bonus-glow');
    box.style.boxShadow = gameState.hasRolled ? "none" : `0 0 20px ${colors[color]}`;

    // Stat Panel
    document.querySelectorAll('.stat-item').forEach(s => s.classList.remove('active-player'));
    const currentStat = document.getElementById(`stat-${color}`);
    if (currentStat) {
        currentStat.classList.add('active-player');
        if (gameState.killStatus[color]) currentStat.querySelector('.lock').innerText = '⚔️';
    }

    // Instruction
    document.getElementById('instruction').innerText = msg || "Roll the Dice";
    
    // Tilt Board
    const tilts = { 
        red: "rotateX(5deg) rotateY(-5deg)", 
        green: "rotateX(-5deg) rotateY(-5deg)", 
        yellow: "rotateX(-5deg) rotateY(5deg)", 
        blue: "rotateX(5deg) rotateY(5deg)" 
    };
    document.getElementById('board').style.transform = tilts[color] || "none";
}

function toggleMute() {
    gameState.isMuted = !gameState.isMuted;
    document.getElementById('mute-btn').innerText = gameState.isMuted ? "🔇" : "🔊";
}

// Init
toggleNameInputs();
