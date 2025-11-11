const startBtn = document.getElementById("start-button");
const retryBtn = document.getElementById("retry-button");
const boardEl = document.getElementById("board");
const undoBtn = document.getElementById("undo");
const hintBtn = document.getElementById("hint");
const numPad = document.getElementById("numPad");
const hintRemaining = document.getElementById("num-hint");
const errCounter = document.getElementById("err-counter");
const timerMin = document.getElementById("timer-min");
const timerSec = document.getElementById("timer-sec");
const numBnts = document.querySelectorAll(".numbers-in button");
const diffBtns = document.querySelectorAll(".diff-select button");
const savedDiff = localStorage.getItem("diff");

const maxHints = 2;

let currentPuzzle = null;
let currentSolution = null;
let currentHints = 2;
let seconds = 0;
let minutes = 0;
let timerInteval;
let selectedCell = null;
let errorCount = 0;
let hintCount = 0;
let history = []; // For undo

if (savedDiff) {
    diffBtns.forEach((b) => {
        b.classList.toggle("Dselected", b.id === savedDiff);
    });
}

diffBtns.forEach((button) => {
    button.addEventListener("click", () => {
        diffBtns.forEach((b) => b.classList.remove("Dselected"));
        button.classList.add("Dselected");
        localStorage.setItem("diff", button.id);
    });
});

// Build board UI
function makeBoard() {
    boardEl.innerHTML = "";
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const idx = r * 9 + c;
            const cell = document.createElement("div");
            cell.className = "cell";

            if (c % 3 === 2) cell.classList.add("box-right");
            if (c % 3 === 0) cell.classList.add("box-left");
            if (r % 3 === 2) cell.classList.add("box-bottom");
            if (r % 3 === 0) cell.classList.add("box-top");

            const input = document.createElement("input");
            input.maxLength = 1;
            input.inputMode = "numeric";
            input.dataset.index = idx;
            input.addEventListener("input", onInput);
            input.addEventListener("keydown", onKeyDown);
            cell.appendChild(input);

            boardEl.appendChild(cell);
        }
    }
}

function renderFromString(puzzleStr) {
    const inputs = boardEl.querySelectorAll("input");
    for (let i = 0; i < 81; i++) {
        const ch = puzzleStr[i];
        const input = inputs[i];
        input.value = ch === "." ? "" : ch;
        input.readOnly = false;
        input.parentElement.classList.remove("given", "invalid");
        if (ch !== ".") {
            input.readOnly = true;
            input.parentElement.classList.add("given");
        }
    }
}

function getBoardStringFromUI() {
    const inputs = boardEl.querySelectorAll("input");
    return Array.from(inputs)
        .map((inp) => (inp.value.trim() === "" ? "." : inp.value))
        .join("");
}

function newPuzzle() {
    const diff = localStorage.getItem("diff");
    currentPuzzle = sudoku.generate(diff);
    currentSolution = sudoku.solve(currentPuzzle);
    hintRemaining.textContent = maxHints.toString();
    errorCount = 0;
    updateErrors();
    resetTimer();
    renderFromString(currentPuzzle);
}

function startTimer() {
    timerInteval = setInterval(() => {
        seconds++;
        if (seconds === 60) {
            seconds = 0;
            minutes++;
        }
        timerSec.textContent = String(seconds).padStart(2, "0");
        timerMin.textContent = String(minutes).padStart(2, "0");
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInteval);
    seconds = 0;
    minutes = 0;
    timerSec.textContent = "00";
    timerMin.textContent = "00";
}

boardEl.addEventListener("click", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell) return;

    const input = cell.querySelector("input");
    if (!input) return;

    clearHighlights();

    // If filled cell clicked → highlight same numbers
    if (
        input.value &&
        (input.readOnly ||
            input.parentElement.classList.contains("user-filled"))
    ) {
        highlightSameNumbers(input.value);
        return;
    }

    selectedCell = input;
    cell.classList.add("selected");
    highlightRowColBox(selectedCell);
});

// === EVENT: press number button ===
numPad.addEventListener("click", (e) => {
    const num = e.target.dataset.num;
    if (!num || !selectedCell) return;

    if (
        selectedCell.readOnly ||
        selectedCell.parentElement.classList.contains("locked")
    )
        return;

    const idx = parseInt(selectedCell.dataset.index);
    const correctValue = currentSolution[idx];

    if (num === correctValue) {
        // correct input
        selectedCell.value = num;
        selectedCell.readOnly = true;
        selectedCell.parentElement.classList.add("user-filled", "locked");
        history.push({ index: idx, value: num });
    } else {
        // wrong input
        errorCount++;
        updateErrors();
        if (errorCount >= 3) {
            alert("Game over! Too many errors.");
            disableAllInputs();
            changeScene("over-screen");
        }
    }
});

// === Undo ===
undoBtn.addEventListener("click", () => {
    if (history.length === 0) return;
    const last = history.pop();
    const input = boardEl.querySelector(`input[data-index="${last.index}"]`);
    if (input) {
        input.value = "";
        input.readOnly = false;
        input.parentElement.classList.remove("user-filled", "locked");
    }
});

// === Hint ===
hintBtn.addEventListener("click", () => {
    if (hintCount >= 2) return alert("No more hints allowed!");

    const inputs = Array.from(boardEl.querySelectorAll("input"));
    const empty = inputs.filter(
        (inp) =>
            inp.value === "" && !inp.parentElement.classList.contains("given")
    );
    if (empty.length === 0) return;

    const randomInput = empty[Math.floor(Math.random() * empty.length)];
    const idx = parseInt(randomInput.dataset.index);
    randomInput.value = currentSolution[idx];
    randomInput.readOnly = true;
    randomInput.parentElement.classList.add("user-filled", "locked");
    hintCount++;
});

// === Helper functions ===
function updateErrors() {
    errCounter.textContent = `Errors: ${errorCount} / 3`;
}

function disableAllInputs() {
    const inputs = boardEl.querySelectorAll("input");
    inputs.forEach((inp) => (inp.readOnly = true));
}
// Highlight row, column, box of selected cell
function highlightRowColBox(cell) {
    const idx = parseInt(cell.dataset.index);
    const row = Math.floor(idx / 9);
    const col = idx % 9;

    const inputs = boardEl.querySelectorAll("input");
    inputs.forEach((inp, i) => {
        const r = Math.floor(i / 9);
        const c = i % 9;

        // 3x3 box check
        const boxRow = Math.floor(r / 3);
        const boxCol = Math.floor(c / 3);
        const selBoxRow = Math.floor(row / 3);
        const selBoxCol = Math.floor(col / 3);

        if (
            r === row ||
            c === col ||
            (boxRow === selBoxRow && boxCol === selBoxCol)
        ) {
            inp.parentElement.classList.add("related");
        }
    });
}

// Highlight all same numbers
function highlightSameNumbers(num) {
    const inputs = boardEl.querySelectorAll("input");
    inputs.forEach((inp) => {
        if (inp.value === num) inp.parentElement.classList.add("same-number");
    });
}

function clearHighlights() {
    document
        .querySelectorAll(".selected, .related, .same-number")
        .forEach((el) =>
            el.classList.remove("selected", "related", "same-number")
        );
}

function changeScene(scene) {
    const allScreens = document.querySelectorAll(".screen");
    allScreens.forEach((s) => s.classList.remove("active"));
    const currentScene = document.getElementById(scene);
    currentScene.classList.add("active");
}

startBtn.addEventListener("click", () => {
    changeScene("game-screen");
    makeBoard();
    newPuzzle();
});

retryBtn.addEventListener("click", () => {
    changeScene("start-screen");
});
