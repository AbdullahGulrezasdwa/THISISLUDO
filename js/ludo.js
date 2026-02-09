const CONFIG = {
    COLORS: ['red', 'green', 'yellow', 'blue'],
    FILES: { red: 'rd', green: 'gn', yellow: 'yl', blue: 'bl' },
    OFFSETS: { red: 0, green: 13, yellow: 26, blue: 39 },
    SAFE_SPOTS: [0, 8, 13, 21, 26, 34, 39, 47],
    ANIM_SPEED: 180
};

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

const GRID = {
    main: [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]],
    home: { red:[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]], green:[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]], yellow:[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]], blue:[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]] },
    base: { red:[[1.5,1.5],[1.5,3.5],[3.5,1.5],[3.5,3.5]], green:[[1.5,10.5],[1.5,12.5],[3.5,10.5],[3.5,12.5]], yellow:[[10.5,10.5],[10.5,12.5],[12.5,10.5],[12.5,12.5]], blue:[[10.5,1.5],[10.5,3.5],[12.5,1.5],[12.5,3.5]] }
};

function toggleNameInputs() {
    const count = parseInt(document.getElementById('player-count').value);
    const container = document.getElementById('name-inputs');
    container.innerHTML = '';
    gameState.activeColors = count === 2 ? ['red', 'yellow'] : CONFIG.COLORS.slice(0, count);
    gameState.activeColors.forEach(c => {
        const input = document.createElement('input');
        input.id = `name-${c}`;
        input.placeholder = `${c.toUpperCase()} Name`;
        container.appendChild(input);
    });
}

function startGame() {
    gameState.activeColors.forEach(c => {
        gameState.playerNames[c] = document.getElementById(`name-${c}`).value || c.toUpperCase();
        const stat = document.createElement('div');
        stat.id = `stat-${c}`; stat.className = 'stat-item';
        stat.innerHTML = `<span>${gameState.playerNames[c]}</span> <span class="lock">🔒</span>`;
        document.getElementById('status-board').appendChild(stat);
        createPieces(c);
    });
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';
    render(); updateUI();
}

function createPieces(color) {
    for (let i = 0; i < 4; i++) {
        const p = document.createElement('div');
        p.className = `piece ${color}`; p.id = `${color[0]}${i}`;
        p.onclick = () => handleMove(color, i);
        const img = document.createElement('img');
        img.src = `images/${CONFIG.FILES[color]}_kati.png`;
        img.onerror = function() {
            this.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
            this.style.background = color; this.style.borderRadius = "50%";
        };
        p.appendChild(img);
        document.getElementById('pieces-container').appendChild(p);
    }
}

async function rollDice() {
    if (gameState.hasRolled || gameState.isAnimating) return;
    const box = document.getElementById('dice-box');
    box.classList.add('dice-rolling');
    await new Promise(r => setTimeout(r, 500));
    box.classList.remove('dice-rolling');
    
    const color = gameState.activeColors[gameState.turnIndex];
    const pool = gameState.playerNames[color].toLowerCase() === "codered" ? [2,3,5,6] : [1,2,3,4,5,6];
    gameState.diceValue = pool[Math.floor(Math.random() * pool.length)];
    box.innerText = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][gameState.diceValue - 1];
    gameState.hasRolled = true;
    
    let canMove = false;
    gameState.pieceState[color].forEach((p, i) => {
        if (isValid(color, i)) { document.getElementById(`${color[0]}${i}`).classList.add('highlight'); canMove = true; }
    });
    if (!canMove) setTimeout(nextTurn, 1000);
}

function isValid(c, i) {
    let p = gameState.pieceState[c][i];
    if (p === -1) return gameState.diceValue === 6;
    if (p + gameState.diceValue > 57) return false;
    if (!gameState.killStatus[c] && p + gameState.diceValue > 51) return false;
    return true;
}

async function handleMove(c, i) {
    if (!gameState.hasRolled || gameState.isAnimating || gameState.activeColors[gameState.turnIndex] !== c || !isValid(c, i)) return;
    gameState.isAnimating = true;
    document.querySelectorAll('.piece').forEach(p => p.classList.remove('highlight'));
    
    if (gameState.pieceState[c][i] === -1) {
        gameState.pieceState[c][i] = 0; render();
        await new Promise(r => setTimeout(r, 200));
    } else {
        const target = gameState.pieceState[c][i] + gameState.diceValue;
        for (let s = gameState.pieceState[c][i] + 1; s <= target; s++) {
            gameState.pieceState[c][i] = s; render();
            await new Promise(r => setTimeout(r, CONFIG.ANIM_SPEED));
        }
    }
    gameState.isAnimating = false;
    resolve(c, gameState.pieceState[c][i]);
}

function resolve(c, pos) {
    let bonus = false;
    if (pos === 57) { bonus = true; confetti(); }
    if (pos < 51 && !CONFIG.SAFE_SPOTS.includes((pos + CONFIG.OFFSETS[c]) % 52)) {
        const gIdx = (pos + CONFIG.OFFSETS[c]) % 52;
        gameState.activeColors.forEach(oc => {
            if (oc === c) return;
            gameState.pieceState[oc].forEach((op, oi) => {
                if (op !== -1 && op < 51 && (op + CONFIG.OFFSETS[oc]) % 52 === gIdx) {
                    gameState.pieceState[oc][oi] = -1;
                    gameState.killStatus[c] = true; bonus = true;
                    document.getElementById('board').classList.add('shake');
                    setTimeout(() => document.getElementById('board').classList.remove('shake'), 200);
                }
            });
        });
    }
    render();
    if (gameState.diceValue === 6 || bonus) { gameState.hasRolled = false; updateUI("BONUS!"); }
    else nextTurn();
}

function nextTurn() { gameState.turnIndex = (gameState.turnIndex + 1) % gameState.activeColors.length; gameState.hasRolled = false; updateUI(); }

function render() {
    gameState.activeColors.forEach(c => {
        gameState.pieceState[c].forEach((p, i) => {
            const el = document.getElementById(`${c[0]}${i}`);
            let co = p === -1 ? GRID.base[c][i] : (p < 52 ? GRID.main[(p + CONFIG.OFFSETS[c]) % 52] : GRID.home[c][p-52]);
            el.style.top = (co[0] * 6.6666) + "%"; el.style.left = (co[1] * 6.6666) + "%";
        });
    });
}

function updateUI(m) {
    const c = gameState.activeColors[gameState.turnIndex];
    const colors = { red: '#ff4757', green: '#2ed573', yellow: '#ffa502', blue: '#1e90ff' };
    const name = gameState.playerNames[c];
    
    document.getElementById('status-display').innerText = name + "'S TURN";
    document.getElementById('status-display').style.color = colors[c];
    document.getElementById('player-label').innerText = "Player: " + name;
    document.getElementById('player-label').style.color = colors[c];
    
    document.querySelectorAll('.stat-item').forEach(s => s.classList.remove('active-player'));
    const stat = document.getElementById(`stat-${c}`);
    if(stat) {
        stat.classList.add('active-player');
        stat.style.borderColor = colors[c];
        if (gameState.killStatus[c]) stat.querySelector('.lock').innerText = '⚔️';
    }

    const tilts = { red: "rotateX(5deg) rotateY(-5deg)", yellow: "rotateX(-5deg) rotateY(5deg)", green: "rotateX(-5deg) rotateY(-5deg)", blue: "rotateX(5deg) rotateY(5deg)" };
    document.getElementById('board').style.transform = tilts[c] || "none";
}

toggleNameInputs();
