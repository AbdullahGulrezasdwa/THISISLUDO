/* ===========================
   MODERN PREMIUM LUDO ENGINE
   =========================== */

let currentPlayer = 1;
let diceValue = 0;
let mustPlay = false;

/* PLAYER CONFIG */
const playerData = {
    1: { color: "rd", start: "t14" },
    2: { color: "gn", start: "t27" },
    3: { color: "bl", start: "t1"  },
    4: { color: "yl", start: "t40" }
};

/* DICE CLICK */
$("#dice").on("click", function () {

    if (mustPlay) return;

    diceValue = Math.floor(Math.random() * 6) + 1;

    $(this).attr("data-chal-count", diceValue);

    $(this).addClass("dice-anim");
    setTimeout(() => $(this).removeClass("dice-anim"), 450);

    mustPlay = true;
});

/* TOKEN CLICK */
$("body").on("click", ".kati", function () {

    if (!mustPlay) return;

    const token = $(this);
    const tokenColor = token.attr("class").split(" ")[1];
    const playerColor = playerData[currentPlayer].color;

    if (tokenColor !== playerColor) return;

    moveToken(token);
});

/* MOVE TOKEN */
function moveToken(token) {

    const parent = token.parent().parent();
    const isHome = parent.attr("data-kati-count") > 0;

    if (isHome) {
        openToken(token);
        return;
    }

    moveOnBoard(token);
}

/* OPEN TOKEN FROM HOME */
function openToken(token) {

    const p = currentPlayer;
    const home = token.parent().parent();
    let count = parseInt(home.attr("data-kati-count"));

    if (count <= 0) return;

    const startCell = playerData[p].start;

    $("#" + startCell).append(token.attr("data-step-count", 1));

    count--;
    home.attr("data-kati-count", count);

    mustPlay = false;
    nextTurn();
}

/* MOVE TOKEN ON BOARD */
function moveOnBoard(token) {

    const id = token.attr("id");
    const currentCell = token.parent().attr("id");
    const currentIndex = parseInt(currentCell.match(/\d+/)[0]);
    let steps = parseInt(token.attr("data-step-count"));

    const newSteps = steps + diceValue;

    if (newSteps > 56) {
        console.log("Illegal move: cannot exceed final.");
        return;
    }

    const newIndex = currentIndex + diceValue;

    $("#" + currentCell).children("#" + id).remove();

    if (newSteps > 51) {
        $("#b" + newIndex).append(token);
    } else {
        $("#t" + newIndex).append(token);
    }

    token.attr("data-step-count", newSteps);

    mustPlay = false;
    nextTurn();
}

/* NEXT TURN */
function nextTurn() {
    currentPlayer++;
    if (currentPlayer > 4) currentPlayer = 1;
}
