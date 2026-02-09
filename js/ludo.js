$(function () {

    /* ===========================
       MODERN PREMIUM LUDO ENGINE
       =========================== */

    let currentPlayer = 1;
    let diceValue = 0;
    let mustPlay = false;

    /* PLAYER CONFIG */
    const playerData = {
        1: { color: "rd", start: "t14", homeSelector: '.plyr_top_1 .player_board_white' },
        2: { color: "gn", start: "t27", homeSelector: '.plyr_top_2 .player_board_white' },
        3: { color: "bl", start: "t1",  homeSelector: '.plyr_top_3 .player_board_white' },
        4: { color: "yl", start: "t40", homeSelector: '.plyr_top_4 .player_board_white' }
    };

    /* ===========================
       DICE DOT UPDATE FUNCTION
       =========================== */
    function updateDiceDots(num) {
        const dots = $("#dice span");
        dots.removeClass("active");

        const patterns = {
            1: [4],
            2: [0, 8],
            3: [0, 4, 8],
            4: [0, 2, 6, 8],
            5: [0, 2, 4, 6, 8],
            6: [0, 2, 3, 5, 6, 8]
        };

        patterns[num].forEach(i => dots.eq(i).addClass("active"));
    }

    /* ===========================
       DICE CLICK
       =========================== */
    $("#dice").on("click", function () {

        if (mustPlay) return;

        diceValue = Math.floor(Math.random() * 6) + 1;

        $(this).attr("data-chal-count", diceValue);

        updateDiceDots(diceValue);

        $(this).addClass("dice-anim");
        setTimeout(() => $(this).removeClass("dice-anim"), 450);

        mustPlay = true;
    });

    /* ===========================
       TOKEN CLICK
       =========================== */
    $("body").on("click", ".kati", function () {

        if (!mustPlay) return;

        const token = $(this);
        const tokenColor = token.attr("class").split(" ")[1];
        const playerColor = playerData[currentPlayer].color;

        if (tokenColor !== playerColor) return;

        moveToken(token);
    });

    /* ===========================
       MOVE TOKEN
       =========================== */
    function moveToken(token) {

        const parent = token.parent().parent();
        const isHome = parseInt(parent.attr("data-kati-count") || "0") > 0;

        if (isHome) {
            openToken(token);
            return;
        }

        moveOnBoard(token);
    }

    /* ===========================
       OPEN TOKEN FROM HOME
       =========================== */
    function openToken(token) {

        const p = currentPlayer;
        const home = token.parent().parent();
        let count = parseInt(home.attr("data-kati-count") || "0");

        if (count <= 0) return;

        const startCell = playerData[p].start;

        $("#" + startCell).append(token.attr("data-step-count", 1));

        count--;
        home.attr("data-kati-count", count);

        mustPlay = false;
        nextTurn();
    }

    /* ===========================
       MOVE TOKEN ON BOARD (WITH KILL SYSTEM)
       =========================== */
    function moveOnBoard(token) {

        const id = token.attr("id");
        const currentCell = token.parent().attr("id");
        const currentIndex = parseInt(currentCell.match(/\d+/)[0]);
        let steps = parseInt(token.attr("data-step-count") || "0");

        const newSteps = steps + diceValue;

        if (newSteps > 56) {
            console.log("Illegal move: cannot exceed final.");
            return;
        }

        const newIndex = currentIndex + diceValue;
        const targetId = (newSteps > 51 ? "b" : "t") + newIndex;

        // remove from old cell
        $("#" + currentCell).children("#" + id).remove();

        const $targetCell = $("#" + targetId);

        // KILL SYSTEM: if not safe and opponent present
        if (!$targetCell.hasClass("safe")) {
            const enemyTokens = $targetCell.find(".kati").filter(function () {
                const cls = $(this).attr("class").split(" ")[1];
                return cls !== playerData[currentPlayer].color;
            });

            enemyTokens.each(function () {
                sendTokenHome($(this));
            });
        }

        // place moving token
        $targetCell.append(token);
        token.attr("data-step-count", newSteps);

        mustPlay = false;
        nextTurn();
    }

    /* ===========================
       SEND TOKEN HOME AFTER KILL
       =========================== */
    function sendTokenHome($token) {

        const cls = $token.attr("class").split(" ")[1]; // rd/gn/bl/yl
        let playerIndex = null;

        Object.keys(playerData).forEach(p => {
            if (playerData[p].color === cls) playerIndex = parseInt(p);
        });

        if (!playerIndex) return;

        const homeSel = playerData[playerIndex].homeSelector;
        const $home = $(homeSel);
        let count = parseInt($home.attr("data-kati-count") || "0");

        // reset token
        $token.attr("data-step-count", 0);

        // visually back to home (inside a bg-circle)
        const wrapper = $("<span>").addClass("bg-circle");
        wrapper.append($token);
        $home.append(wrapper);

        count++;
        $home.attr("data-kati-count", count);
    }

    /* ===========================
       NEXT TURN
       =========================== */
    function nextTurn() {
        currentPlayer++;
        if (currentPlayer > 4) currentPlayer = 1;
    }

});
