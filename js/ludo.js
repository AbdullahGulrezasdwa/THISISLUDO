// ... existing constants ...
let killStatus = { red: false, green: false, yellow: false, blue: false }; // NEW: Track kills

// Update checkPossibleMoves to enforce the barrier
function checkPossibleMoves(color) {
    const canMove = pieceState[color].some((p, i) => {
        if (p === -1) return diceValue === 6;
        if (p >= 57) return false;
        
        let nextPos = p + diceValue;
        // RULE: If haven't killed, cannot move past position 51 (the entry square)
        if (!killStatus[color] && nextPos > 51) return false;
        if (nextPos > 57) return false;
        return true;
    });
    
    if (!canMove) {
        let msg = !killStatus[color] && pieceState[color].some(p => p + diceValue > 51) 
                  ? "Need a kill to enter home!" 
                  : "No moves possible!";
        document.getElementById('instruction').innerText = msg;
        setTimeout(nextTurn, 1500);
    } else {
        document.getElementById('instruction').innerText = "Pick a piece!";
        pieceState[color].forEach((p, i) => {
            let nextPos = p + diceValue;
            let canEnter = killStatus[color] || nextPos <= 51; // Check rule
            
            if ((p === -1 && diceValue === 6) || (p !== -1 && nextPos <= 57 && canEnter)) {
                document.getElementById(`${color[0]}${i}`).classList.add('highlight');
            }
        });
    }
}

// Update moveResolved to trigger the kill status
function moveResolved(color, newPos) {
    if (newPos < 51) {
        let globalIdx = (newPos + startOffsets[color]) % 52;
        if (!safeSpots.includes(globalIdx)) {
            activeColors.forEach(pColor => {
                if (pColor === color) return;
                pieceState[pColor].forEach((otherPos, i) => {
                    if (otherPos !== -1 && otherPos < 51) {
                        if ((otherPos + startOffsets[pColor]) % 52 === globalIdx) {
                            pieceState[pColor][i] = -1;
                            
                            // RULE TRIGGERED: Player earned their home entry
                            if (!killStatus[color]) {
                                killStatus[color] = true;
                                notifyKill(color);
                            }
                        }
                    }
                });
            });
        }
    }
    // ... rest of your win check ...
    document.querySelectorAll('.piece').forEach(p => p.classList.remove('highlight'));
    render();
    if (diceValue !== 6) nextTurn(); else { hasRolled = false; updateUI("Roll again!"); }
}

function notifyKill(color) {
    const display = document.getElementById('instruction');
    display.innerText = "KILL CONFIRMED! Home Path Unlocked!";
    display.style.color = "#2ecc71";
    setTimeout(() => { display.style.color = "white"; }, 2000);
}
