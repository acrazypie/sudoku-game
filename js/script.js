const startBtn = document.getElementById("start-button");
const retryBtn = document.getElementById("retry-button");

const diffBtns = document.querySelectorAll(".diff-select button");

diffBtns.forEach((button) => {
    button.addEventListener("click", () => {
        diffBtns.forEach((b) => b.classList.remove("selected"));
        button.classList.add("selected");
    });
});
