// game.js
// -------------------------------------------
// Sudoku UI: screens, board, input, hints, scoring, daily challenges,
// statistics and settings.
// -------------------------------------------

import * as E from "./engine.js";
import { load, save, DEFAULT_SETTINGS, emptyStats, exportAll, importAll } from "./store.js";
import { sfx, setSound } from "./sound.js";
import { t, initLang, currentLang } from "./lang.js";
import "./platform.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const MAX_MISTAKES = 3;
const HINTS_PER_GAME = 3;
// a finish under this many seconds earns a time bonus
const PAR_TIME = { easy: 480, medium: 720, hard: 1080, expert: 1500, master: 2100, extreme: 2700 };
// level of each daily puzzle by weekday (0 = Sunday)
const DAILY_LEVELS = ["master", "easy", "medium", "hard", "medium", "hard", "expert"];
const DAILY_START = "2025-01-01";

// --- STATE ---
let settings = load("settings", DEFAULT_SETTINGS);
let stats = load("stats", {});
let daily = load("daily", {});
let game = load("game", null);
let selected = -1;
let notesMode = false;
let clock = null;
let screen = "home";
let calMonth = monthStart(new Date());
let calSelected = todayKey();
let statsTab = "easy";

for (const lv of E.LEVEL_NAMES) stats[lv] = { ...emptyStats(), ...(stats[lv] || {}) };
if (game && (!Array.isArray(game.values) || game.values.length !== 81)) game = null;

// -------------------------------------------
// Helpers
// -------------------------------------------
function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${String(m).padStart(2, "0")}:${sec}`;
}
function fmtNum(n) {
    return new Intl.NumberFormat(currentLang()).format(n);
}
function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayKey() {
    return dateKey(new Date());
}
function parseKey(k) {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d);
}
function monthStart(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function fmtDate(k, opts = { day: "numeric", month: "long", year: "numeric" }) {
    return new Intl.DateTimeFormat(currentLang(), opts).format(parseKey(k));
}
function levelName(lv) {
    return t(`${lv}-diff`);
}
function dailyLevel(k) {
    return DAILY_LEVELS[parseKey(k).getDay()];
}
function saveGame() {
    save("game", game && !game.won ? game : null);
}
function inProgress() {
    return game && !game.won && game.values.some((v, i) => v && !game.puzzle[i]);
}

// Restarts a CSS animation class on an element.
function animate(el, cls, delay = 0) {
    if (!el || reduceMotion.matches) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    if (delay) el.style.setProperty("--d", `${delay}ms`);
    el.classList.add(cls);
    el.addEventListener(
        "animationend",
        () => {
            el.classList.remove(cls);
            el.style.removeProperty("--d");
        },
        { once: true },
    );
}

function countUp(el, to, fmt = fmtNum, dur = 900) {
    if (reduceMotion.matches) return (el.textContent = fmt(to));
    const t0 = performance.now();
    const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => (el.textContent = fmt(to)), dur + 60);
}

let toastTimer = null;
function toast(msg, kind = "") {
    const el = $("#toast");
    el.textContent = msg;
    el.className = `toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3600);
}

// -------------------------------------------
// Dialogs
// -------------------------------------------
function openDialog(id) {
    const d = $(id);
    if (!d.open) d.showModal();
    return d;
}
function closeDialog(d) {
    if (typeof d === "string") d = $(d);
    if (!d.open) return;
    if (reduceMotion.matches) return d.close();
    d.classList.add("closing");
    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        d.classList.remove("closing");
        d.close();
    };
    d.addEventListener("animationend", finish, { once: true });
    setTimeout(finish, 350); // in case the animation never runs (background tab)
}
$$("dialog").forEach((d) => {
    d.addEventListener("click", (e) => {
        // click on the backdrop, or on a [data-close] button
        if (e.target === d || e.target.closest("[data-close]")) closeDialog(d);
    });
    d.addEventListener("cancel", (e) => {
        e.preventDefault();
        if (d.id === "dlg-over") return; // must choose an option
        closeDialog(d);
    });
    d.addEventListener("close", () => {
        if (screen === "play") startClock();
    });
});

let confirmAction = null;
function confirmBox(text, okLabel, action) {
    $("#confirm-text").textContent = text;
    $("#confirm-ok").textContent = okLabel;
    confirmAction = action;
    openDialog("#dlg-confirm");
}
$("#confirm-ok").addEventListener("click", () => {
    closeDialog("#dlg-confirm");
    const a = confirmAction;
    confirmAction = null;
    if (a) a();
});

// -------------------------------------------
// Routing
// -------------------------------------------
function go(route) {
    const hash = route === "home" ? "#/" : `#/${route}`;
    if (location.hash !== hash) location.hash = hash;
    else show(route);
}

function show(route) {
    if (route === "play" && !game) route = "home";
    if (route !== "play" && game && game.won) game = null;
    screen = route;
    $$("dialog[open]").forEach((d) => d.close());
    $$(".screen").forEach((s) => s.classList.toggle("active", s.dataset.screen === route));
    $$("[data-route]").forEach((a) => a.classList.toggle("current", a.dataset.route === route));
    document.body.dataset.screen = route;
    window.scrollTo(0, 0);

    if (route === "home") renderHome();
    if (route === "daily") renderDaily();
    if (route === "stats") renderStats();
    if (route === "install") renderInstall();
    if (route === "play") {
        renderAll();
        startClock();
        if (game.lost) setTimeout(showOver, 300);
    } else stopClock();
}

function routeFromHash() {
    const r = location.hash.replace(/^#\/?/, "") || "home";
    return ["home", "play", "daily", "stats", "install"].includes(r) ? r : "home";
}
addEventListener("hashchange", () => show(routeFromHash()));

// -------------------------------------------
// New game
// -------------------------------------------
function newGame(level, { mode = "classic", date = null } = {}) {
    if (inProgress() && !game.lost) breakStreak(game.level);
    const seed = mode === "daily" ? E.hashSeed(`daily:${date}`) : (Math.random() * 2 ** 32) >>> 0;
    const p = E.generate(level, seed);
    game = {
        mode,
        date,
        level,
        seed,
        puzzle: p.puzzle,
        solution: p.solution,
        values: p.puzzle.slice(),
        notes: new Array(81).fill(0),
        scored: new Array(81).fill(0),
        history: [],
        mistakes: 0,
        hints: HINTS_PER_GAME,
        time: 0,
        score: 0,
        second: false,
        paused: false,
        lost: false,
        won: false,
    };
    stats[level].started++;
    save("stats", stats);
    selected = -1;
    notesMode = false;
    saveGame();
    $("#board").classList.add("intro");
    go("play");
    setTimeout(() => $("#board").classList.remove("intro"), 1200);
}

function restartGame() {
    if (!game) return;
    Object.assign(game, {
        values: game.puzzle.slice(),
        notes: new Array(81).fill(0),
        history: [],
        mistakes: 0,
        hints: HINTS_PER_GAME,
        time: 0,
        score: 0,
        scored: new Array(81).fill(0),
        second: false,
        lost: false,
        paused: false,
    });
    selected = -1;
    saveGame();
    $("#board").classList.add("intro");
    renderAll();
    setTimeout(() => $("#board").classList.remove("intro"), 1200);
}

function askNewGame(level, opts) {
    if (inProgress() && !game.lost && !(opts && opts.mode === "daily" && game.date === opts.date)) {
        confirmBox(t("new-warn"), t("start"), () => newGame(level, opts));
    } else newGame(level, opts);
}

function breakStreak(level) {
    stats[level].streak = 0;
    save("stats", stats);
}

// -------------------------------------------
// Clock
// -------------------------------------------
function startClock() {
    stopClock();
    if (!game || game.won || game.lost || game.paused || screen !== "play") return;
    if (document.querySelector("dialog[open]")) return;
    clock = setInterval(() => {
        game.time++;
        renderTime();
        if (game.time % 5 === 0) saveGame();
    }, 1000);
}
function stopClock() {
    clearInterval(clock);
    clock = null;
}
function setPaused(p) {
    if (!game || game.won || game.lost) return;
    game.paused = p;
    saveGame();
    renderAll();
    if (p) stopClock();
    else startClock();
}
document.addEventListener("visibilitychange", () => {
    if (document.hidden && screen === "play" && game && !game.paused) setPaused(true);
    if (document.hidden) saveGame();
});
addEventListener("pagehide", saveGame);

// -------------------------------------------
// Board
// -------------------------------------------
const boardEl = $("#board");
const cells = [];

function buildBoard() {
    for (let i = 0; i < 81; i++) {
        const c = document.createElement("div");
        c.className = "cell";
        c.setAttribute("role", "gridcell");
        c.dataset.i = i;
        const r = E.rowOf(i);
        const col = E.colOf(i);
        if (col % 3 === 2 && col !== 8) c.classList.add("br");
        if (r % 3 === 2 && r !== 8) c.classList.add("bb");
        c.style.setProperty("--r", r);
        c.style.setProperty("--c", col);
        c.innerHTML =
            '<span class="v"></span><span class="notes">' +
            [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<i>${d}</i>`).join("") +
            "</span>";
        c._v = c.firstChild;
        c._notes = c.lastChild;
        boardEl.appendChild(c);
        cells.push(c);
    }
    boardEl.addEventListener("pointerdown", (e) => {
        const c = e.target.closest(".cell");
        if (!c || !game || game.paused) return;
        select(+c.dataset.i);
        sfx.tap();
    });
}

function buildNumpad() {
    const pad = $("#numpad");
    for (let d = 1; d <= 9; d++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "num";
        b.dataset.d = d;
        b.innerHTML = `<span class="num__d">${d}</span><span class="num__left"></span>`;
        b.addEventListener("click", () => {
            animate(b, "press");
            input(d);
        });
        pad.appendChild(b);
    }
}

function select(i) {
    selected = i;
    renderBoard();
}

function isLocked(i) {
    return !!game.puzzle[i] || (settings.autoCheck && game.values[i] && game.values[i] === game.solution[i]);
}

function sameUnit(a, b) {
    return E.rowOf(a) === E.rowOf(b) || E.colOf(a) === E.colOf(b) || E.boxOf(a) === E.boxOf(b);
}

function renderBoard() {
    if (!game) return;
    const g = game;
    const sv = selected >= 0 ? g.values[selected] : 0;
    boardEl.classList.toggle("is-paused", g.paused);
    for (let i = 0; i < 81; i++) {
        const c = cells[i];
        const v = g.values[i];
        const vEl = c._v;
        const txt = v ? String(v) : "";
        if (vEl.textContent !== txt) vEl.textContent = txt;

        const notesEl = c._notes;
        const nm = v ? 0 : g.notes[i];
        for (let d = 1; d <= 9; d++) {
            const on = !!(nm & E.bit(d));
            const n = notesEl.children[d - 1];
            n.classList.toggle("on", on);
            n.classList.toggle("hit", on && settings.highlightSame && sv === d);
        }

        const wrong = !!v && !g.puzzle[i] && settings.autoCheck && v !== g.solution[i];
        let conflict = false;
        if (v && settings.highlightDup) {
            for (const p of E.PEERS[i])
                if (g.values[p] === v) {
                    conflict = true;
                    break;
                }
        }
        c.classList.toggle("given", !!g.puzzle[i]);
        c.classList.toggle("user", !!v && !g.puzzle[i]);
        c.classList.toggle("wrong", wrong);
        c.classList.toggle("conflict", conflict && !wrong);
        c.classList.toggle("selected", i === selected);
        c.classList.toggle("area", settings.highlightArea && selected >= 0 && i !== selected && sameUnit(i, selected));
        c.classList.toggle("same", settings.highlightSame && !!sv && v === sv && i !== selected);
        c.setAttribute("aria-label", `r${E.rowOf(i) + 1}c${E.colOf(i) + 1} ${v || ""}`);
    }
}

function renderNumpad() {
    if (!game) return;
    const count = new Array(10).fill(0);
    game.values.forEach((v, i) => {
        if (v && (!settings.autoCheck || v === game.solution[i])) count[v]++;
    });
    $$(".num").forEach((b) => {
        const d = +b.dataset.d;
        const left = 9 - count[d];
        b.querySelector(".num__left").textContent = left > 0 ? left : "";
        const wasDone = b.classList.contains("done");
        b.classList.toggle("done", left <= 0);
        if (left <= 0 && !wasDone) animate(b, "finish");
    });
    $("#numpad").classList.toggle("notes-mode", notesMode);
}

function renderHud() {
    if (!game) return;
    const lvl = levelName(game.level);
    $("#hud-level").textContent = game.mode === "daily" ? `${lvl} · ${fmtDate(game.date, { day: "numeric", month: "short" })}` : lvl;
    $("#hud-mistakes").textContent = settings.mistakeLimit ? `${game.mistakes}/${MAX_MISTAKES}` : game.mistakes;
    $("#hud-mistakes-cell").hidden = !settings.autoCheck;
    $("#hud-score").textContent = fmtNum(game.score);
    $("#hint-badge").textContent = game.hints;
    $("#t-hint").classList.toggle("empty", game.hints <= 0);
    $("#t-notes").setAttribute("aria-pressed", String(notesMode));
    $("#t-notes").classList.toggle("on", notesMode);
    $("#notes-badge").textContent = notesMode ? t("on") : t("off");
    $("#pause").classList.toggle("is-paused", game.paused);
    $("#paused").hidden = !game.paused;
    $(".hud").classList.toggle("no-timer", !settings.timer);
    renderTime();
}

function renderTime() {
    $("#hud-time").textContent = settings.timer ? fmtTime(game.time) : "—";
}

function renderAll() {
    renderHud();
    renderBoard();
    renderNumpad();
}

// -------------------------------------------
// Moves
// -------------------------------------------
function snapshot(list, i) {
    if (!list.some((s) => s.i === i)) list.push({ i, v: game.values[i], n: game.notes[i] });
}

function pushHistory(changes) {
    game.history.push(changes);
    if (game.history.length > 300) game.history.shift();
}

function clearNotesAround(i, d, changes) {
    const b = E.bit(d);
    for (const p of E.PEERS[i]) {
        if (game.notes[p] & b) {
            snapshot(changes, p);
            game.notes[p] &= ~b;
        }
    }
}

function input(d, forceNote = false) {
    if (!game || game.won || game.lost || game.paused) return;
    if (selected < 0) {
        // no cell chosen: just highlight that digit's cells
        const first = game.values.findIndex((v) => v === d);
        if (first >= 0) select(first);
        return;
    }
    if (notesMode || forceNote) toggleNote(selected, d);
    else place(selected, d);
}

function toggleNote(i, d) {
    if (game.values[i]) {
        animate(cells[i], "nudge");
        return;
    }
    const changes = [];
    snapshot(changes, i);
    game.notes[i] ^= E.bit(d);
    pushHistory(changes);
    sfx.note();
    renderBoard();
    animate(cells[i]._notes.children[d - 1], "pop");
    saveGame();
}

function place(i, d, fromHint = false) {
    const g = game;
    if (isLocked(i)) {
        animate(cells[i], "nudge");
        return;
    }
    if (g.values[i] === d && !fromHint) return;

    const changes = [];
    snapshot(changes, i);
    g.values[i] = d;
    g.notes[i] = 0;
    const correct = d === g.solution[i];
    if (settings.autoNotes && (correct || !settings.autoCheck)) clearNotesAround(i, d, changes);
    pushHistory(changes);

    if (!correct && settings.autoCheck) {
        g.mistakes++;
        sfx.wrong();
        renderAll();
        animate(cells[i], "shake");
        if (settings.mistakeLimit) animate($("#hud-mistakes"), "bump");
        if (settings.mistakeLimit && g.mistakes >= MAX_MISTAKES) lose();
        saveGame();
        return;
    }

    const base = E.LEVELS[g.level].base;
    let gained = 0;
    if (correct && !g.scored[i]) {
        g.scored[i] = 1;
        if (!fromHint) gained += base;
    }

    // completed rows, columns, boxes
    const done = correct ? completedUnits(i) : [];
    if (done.length && !fromHint) gained += done.length * base * 2;
    g.score += gained;

    renderAll();
    animate(cells[i], fromHint ? "hinted" : "pop");
    if (gained) {
        animate($("#hud-score"), "bump");
        floatScore(i, gained);
    }

    if (isSolved()) return win(i);
    if (done.length) {
        sfx.unit();
        wave(i, done);
    } else if (!fromHint) sfx.place();

    if (!settings.autoCheck && g.values.every((v) => v)) toast(t("complete-wrong"), "warn");
    saveGame();
}

function completedUnits(i) {
    const out = [];
    for (const u of [E.rowOf(i), 9 + E.colOf(i), 18 + E.boxOf(i)]) {
        if (E.UNITS[u].every((j) => game.values[j] === game.solution[j])) out.push(u);
    }
    return out;
}

function isSolved() {
    return game.values.every((v, i) => v === game.solution[i]);
}

function wave(from, units) {
    const fr = E.rowOf(from);
    const fc = E.colOf(from);
    const seen = new Set();
    for (const u of units)
        for (const j of E.UNITS[u]) {
            if (seen.has(j)) continue;
            seen.add(j);
            const dist = Math.max(Math.abs(E.rowOf(j) - fr), Math.abs(E.colOf(j) - fc));
            animate(cells[j], "wave", dist * 45 + 1);
        }
}

function floatScore(i, pts) {
    if (reduceMotion.matches) return;
    const f = document.createElement("span");
    f.className = "float";
    f.textContent = `+${pts}`;
    cells[i].appendChild(f);
    f.addEventListener("animationend", () => f.remove(), { once: true });
}

function erase() {
    if (!game || game.won || game.lost || game.paused || selected < 0) return;
    const i = selected;
    if (isLocked(i)) {
        animate(cells[i], "nudge");
        return;
    }
    if (!game.values[i] && !game.notes[i]) return;
    const changes = [];
    snapshot(changes, i);
    game.values[i] = 0;
    game.notes[i] = 0;
    pushHistory(changes);
    sfx.tap();
    renderAll();
    animate(cells[i], "fade");
    saveGame();
}

function undo() {
    if (!game || game.won || game.lost || game.paused) return;
    const changes = game.history.pop();
    if (!changes) return;
    for (const s of changes) {
        game.values[s.i] = s.v;
        game.notes[s.i] = s.n;
    }
    selected = changes[0].i;
    sfx.tap();
    renderAll();
    animate(cells[selected], "fade");
    saveGame();
}

function hint() {
    if (!game || game.won || game.lost || game.paused) return;
    if (game.hints <= 0) {
        animate($("#t-hint"), "nudge");
        return toast(t("no-hints"));
    }
    const g = game;

    // a wrong number on the board is the first thing worth pointing out
    const wrong = g.values.findIndex((v, i) => v && !g.puzzle[i] && v !== g.solution[i]);
    if (wrong >= 0 && (selected < 0 || selected === wrong || !g.values[selected] || g.values[selected] === g.solution[selected])) {
        selected = wrong;
        g.hints--;
        g.values[wrong] = 0;
        sfx.hint();
        place(wrong, g.solution[wrong], true);
        g.scored[wrong] = 1;
        return toast(t("hint-wrong", { n: g.solution[wrong] }));
    }

    const known = g.values.map((v, i) => (v === g.solution[i] ? v : 0));
    const prefer = selected >= 0 && !known[selected] ? selected : -1;
    const step = E.nextStep(known, prefer);
    let i;
    let msg;
    if (step) {
        i = step.cell;
        const key = step.tech > 1 ? "hint-advanced" : `hint-${step.kind}`;
        msg = t(key, { n: step.digit });
    } else {
        i = prefer >= 0 ? prefer : known.findIndex((v) => !v);
        msg = t("hint-reveal", { n: g.solution[i] });
    }
    if (i < 0) return;
    selected = i;
    g.hints--;
    g.scored[i] = 1;
    sfx.hint();
    place(i, g.solution[i], true);
    toast(msg);
    saveGame();
}

// -------------------------------------------
// Win / lose
// -------------------------------------------
function win(last) {
    const g = game;
    g.won = true;
    stopClock();
    const base = E.LEVELS[g.level].base;
    const par = PAR_TIME[g.level];
    const timeBonus = Math.round(base * 30 * Math.max(0, 1 - g.time / par));
    const perfectBonus = g.mistakes === 0 ? base * 10 : 0;
    g.score += timeBonus + perfectBonus;

    const s = stats[g.level];
    const record = !s.bestTime || g.time < s.bestTime;
    s.won++;
    if (g.mistakes === 0) s.perfect++;
    if (record) s.bestTime = g.time;
    s.totalTime += g.time;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.bestScore = Math.max(s.bestScore, g.score);
    save("stats", stats);
    if (g.mode === "daily") {
        daily[g.date] = { time: g.time, score: g.score, level: g.level };
        save("daily", daily);
    }
    save("game", null);

    selected = -1;
    renderAll();
    sfx.win();
    // ripple across the whole board from the last cell
    const fr = E.rowOf(last);
    const fc = E.colOf(last);
    cells.forEach((c, j) => {
        const dist = Math.hypot(E.rowOf(j) - fr, E.colOf(j) - fc);
        animate(c, "wave", Math.round(dist * 60) + 1);
    });

    setTimeout(
        () => {
            $("#win-record").hidden = !record || s.won === 1;
            $("#win-next").textContent = g.mode === "daily" ? t("back-calendar") : t("new-game");
            const rows = [
                [t("time"), fmtTime(g.time)],
                [t("level"), levelName(g.level)],
                [t("mistakes"), g.mistakes],
                [t("time-bonus"), `+${fmtNum(timeBonus)}`],
            ];
            if (perfectBonus) rows.push([t("perfect-bonus"), `+${fmtNum(perfectBonus)}`]);
            $("#win-list").innerHTML = rows
                .map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`)
                .join("");
            openDialog("#dlg-win");
            countUp($("#win-score"), g.score, fmtNum, 1100);
        },
        reduceMotion.matches ? 100 : 1300,
    );
}

function lose() {
    game.lost = true;
    stopClock();
    sfx.lose();
    saveGame();
    setTimeout(showOver, 700);
}

function showOver() {
    if (!game || !game.lost) return;
    $("#over-second").hidden = game.second;
    openDialog("#dlg-over");
}

function finishLost() {
    if (game && game.lost) {
        breakStreak(game.level);
        save("game", null);
    }
}

$("#over-second").addEventListener("click", () => {
    game.second = true;
    game.lost = false;
    game.mistakes = MAX_MISTAKES - 1;
    saveGame();
    closeDialog("#dlg-over");
    renderAll();
});
$("#over-new").addEventListener("click", () => {
    const lv = game.level;
    const daily = game.mode === "daily";
    finishLost();
    game = null;
    closeDialog("#dlg-over");
    if (daily) go("daily");
    else newGame(lv);
});
$("#over-home").addEventListener("click", () => {
    finishLost();
    game = null;
    closeDialog("#dlg-over");
    go("home");
});
$("#win-next").addEventListener("click", () => {
    closeDialog("#dlg-win");
    if (game.mode === "daily") {
        game = null;
        go("daily");
    } else newGame(game.level);
});
$("#win-home").addEventListener("click", () => {
    closeDialog("#dlg-win");
    game = null;
    go("home");
});

// -------------------------------------------
// Controls
// -------------------------------------------
$("#t-undo").addEventListener("click", undo);
$("#t-erase").addEventListener("click", erase);
$("#t-hint").addEventListener("click", hint);
$("#t-notes").addEventListener("click", () => {
    notesMode = !notesMode;
    sfx.tap();
    renderHud();
    renderNumpad();
    animate($("#notes-badge"), "pop");
});
$("#pause").addEventListener("click", () => setPaused(!game.paused));
$("#resume-play").addEventListener("click", () => setPaused(false));
$("#play-new").addEventListener("click", () => {
    $("#new-warn").hidden = !inProgress();
    $("#new-restart").hidden = !game;
    renderLevelRows($("#new-level-list"), (lv) => {
        closeDialog("#dlg-new");
        newGame(lv);
    });
    openDialog("#dlg-new");
    stopClock();
});
$("#new-restart").addEventListener("click", () => {
    closeDialog("#dlg-new");
    restartGame();
});

document.addEventListener("keydown", (e) => {
    if (screen !== "play" || !game || document.querySelector("dialog[open]")) return;
    if (e.target.closest?.("input, textarea, select")) return;
    const k = e.key;
    const digit = /^(Digit|Numpad)([1-9])$/.exec(e.code);
    if (digit && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        return input(+digit[2], e.shiftKey);
    }
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "z") {
        e.preventDefault();
        return undo();
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    if (k in moves) {
        e.preventDefault();
        if (game.paused) return;
        if (selected < 0) return select(40);
        const r = E.rowOf(selected);
        const c = E.colOf(selected);
        const nr = (r + (k === "ArrowUp" ? 8 : k === "ArrowDown" ? 1 : 0)) % 9;
        const nc = (c + (k === "ArrowLeft" ? 8 : k === "ArrowRight" ? 1 : 0)) % 9;
        return select(nr * 9 + nc);
    }
    if (k === "Backspace" || k === "Delete" || k === "0") {
        e.preventDefault();
        return erase();
    }
    const lower = k.toLowerCase();
    if (lower === "n") return $("#t-notes").click();
    if (lower === "u") return undo();
    if (lower === "h") return hint();
    if (k === " " || lower === "p") {
        e.preventDefault();
        return setPaused(!game.paused);
    }
    if (k === "Escape") return select(-1);
});

// click outside the board clears the selection
document.addEventListener("pointerdown", (e) => {
    if (screen !== "play" || selected < 0) return;
    if (e.target.closest?.(".board, .play__side, dialog, .toast, .nav")) return;
    select(-1);
});

// -------------------------------------------
// Home
// -------------------------------------------
function renderLevelRows(list, onPick) {
    list.innerHTML = "";
    E.LEVEL_NAMES.forEach((lv, k) => {
        const s = stats[lv];
        const li = document.createElement("li");
        li.style.setProperty("--k", k);
        const meta = s.bestTime ? `${t("best")} ${fmtTime(s.bestTime)}` : "";
        li.innerHTML = `<button type="button" class="row" data-level="${lv}">
            <span class="row__idx">0${k + 1}</span>
            <span class="row__name">${levelName(lv)}</span>
            <span class="row__dots" aria-hidden="true">${Array.from({ length: 6 }, (_, j) => `<i${j <= k ? ' class="on"' : ""}></i>`).join("")}</span>
            <span class="row__meta">${meta}</span>
            <span class="row__arrow" aria-hidden="true">→</span>
        </button>`;
        li.firstElementChild.addEventListener("click", () => onPick(lv));
        list.appendChild(li);
    });
}

function renderHome() {
    renderLevelRows($("#level-list"), (lv) => askNewGame(lv));
    const resume = $("#resume");
    resume.hidden = !(game && !game.won);
    if (game && !game.won) {
        const where = game.mode === "daily" ? `${t("daily-short")} · ` : "";
        $("#resume-meta").textContent = `${where}${levelName(game.level)} · ${fmtTime(game.time)}`;
    }
    const today = todayKey();
    $("#home-daily-meta").textContent = daily[today] ? `✓ ${t("solved")}` : levelName(dailyLevel(today));
    const won = E.LEVEL_NAMES.reduce((a, lv) => a + stats[lv].won, 0);
    $("#home-stats-meta").textContent = won ? t("wins-count", { n: won }) : "";
    $("#home-install-meta").textContent = isInstalled() ? `✓ ${t("installed")}` : "";
}
$("#resume").addEventListener("click", () => go("play"));
$("#home-rules").addEventListener("click", () => openRules());
$("#open-rules").addEventListener("click", () => openRules());

// -------------------------------------------
// Daily challenge
// -------------------------------------------
function renderDaily() {
    const today = parseKey(todayKey());
    const first = calMonth;
    const y = first.getFullYear();
    const m = first.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    const lang = currentLang();

    $("#cal-month").textContent = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(first);
    $("#cal-prev").disabled = first <= monthStart(parseKey(DAILY_START));
    $("#cal-next").disabled = first >= monthStart(today);

    // weekday header, Monday first
    const wk = new Intl.DateTimeFormat(lang, { weekday: "narrow" });
    $("#cal-week").innerHTML = [1, 2, 3, 4, 5, 6, 0]
        .map((d) => `<span>${wk.format(new Date(2024, 0, 7 + d))}</span>`)
        .join("");

    const grid = $("#cal-grid");
    grid.innerHTML = "";
    const offset = (first.getDay() + 6) % 7;
    for (let k = 0; k < offset; k++) grid.appendChild(document.createElement("span"));
    let solved = 0;
    for (let d = 1; d <= days; d++) {
        const date = new Date(y, m, d);
        const key = dateKey(date);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "day";
        b.style.setProperty("--k", d);
        b.textContent = d;
        const done = !!daily[key];
        if (done) solved++;
        b.classList.toggle("done", done);
        b.classList.toggle("today", key === todayKey());
        b.classList.toggle("sel", key === calSelected);
        b.classList.toggle("going", !!(game && !game.won && game.mode === "daily" && game.date === key));
        b.disabled = date > today || key < DAILY_START;
        b.setAttribute("aria-label", fmtDate(key));
        b.addEventListener("click", () => {
            calSelected = key;
            sfx.tap();
            renderDaily();
        });
        grid.appendChild(b);
    }
    $("#cal-count").textContent = `${solved}/${days}`;
    $("#cal-bar").style.transform = `scaleX(${solved / days})`;

    // selected day card
    if (!calSelected.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`) || parseKey(calSelected) > today) {
        calSelected = first <= today && monthStart(today).getTime() === first.getTime() ? todayKey() : dateKey(first);
    }
    const sel = calSelected;
    const lv = dailyLevel(sel);
    $("#day-date").textContent = fmtDate(sel, { weekday: "long", day: "numeric", month: "long" });
    $("#day-level").textContent = levelName(lv);
    const rec = daily[sel];
    const going = game && !game.won && game.mode === "daily" && game.date === sel;
    $("#day-status").textContent = rec
        ? `✓ ${t("solved")} · ${fmtTime(rec.time)} · ${fmtNum(rec.score)} ${t("points")}`
        : going
          ? `${t("in-progress")} · ${fmtTime(game.time)}`
          : t("not-played");
    const btn = $("#day-play");
    btn.textContent = rec ? t("play-again") : going ? t("continue") : t("play");
    animate($("#day-card"), "fade");

    // trophies: every month where each day was solved
    const tro = $("#trophies");
    tro.innerHTML = "";
    const months = new Set(Object.keys(daily).map((k) => k.slice(0, 7)));
    const earned = [...months].sort().reverse().filter((mk) => {
        const [yy, mm] = mk.split("-").map(Number);
        const n = new Date(yy, mm, 0).getDate();
        for (let d = 1; d <= n; d++) if (!daily[`${mk}-${String(d).padStart(2, "0")}`]) return false;
        return true;
    });
    if (!earned.length) {
        tro.innerHTML = `<li class="muted">${t("no-trophies")}</li>`;
    } else {
        for (const mk of earned) {
            const li = document.createElement("li");
            li.className = "trophy";
            li.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/></svg>
                <span>${new Intl.DateTimeFormat(lang, { month: "short", year: "numeric" }).format(parseKey(mk + "-01"))}</span>`;
            tro.appendChild(li);
        }
    }
}

$("#cal-prev").addEventListener("click", () => {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1);
    calSelected = "";
    renderDaily();
    animate($("#cal-grid"), "slide-r");
});
$("#cal-next").addEventListener("click", () => {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
    calSelected = "";
    renderDaily();
    animate($("#cal-grid"), "slide-l");
});
$("#day-play").addEventListener("click", () => {
    const key = calSelected;
    if (game && !game.won && game.mode === "daily" && game.date === key) return go("play");
    askNewGame(dailyLevel(key), { mode: "daily", date: key });
});

// -------------------------------------------
// Statistics
// -------------------------------------------
function renderStats() {
    const tabs = $("#stats-tabs");
    tabs.innerHTML = "";
    E.LEVEL_NAMES.forEach((lv) => {
        const b = document.createElement("button");
        b.type = "button";
        b.role = "tab";
        b.className = "tab";
        b.textContent = levelName(lv);
        b.setAttribute("aria-selected", String(lv === statsTab));
        b.addEventListener("click", () => {
            statsTab = lv;
            renderStats();
        });
        tabs.appendChild(b);
    });

    const s = stats[statsTab];
    const rate = s.started ? Math.round((s.won / s.started) * 100) : 0;
    const rows = [
        ["games-started", s.started],
        ["games-won", s.won],
        ["win-rate", rate, (n) => `${n}%`],
        ["perfect-wins", s.perfect],
        ["best-time", s.bestTime, (n) => (n ? fmtTime(n) : "—")],
        ["avg-time", s.won ? Math.round(s.totalTime / s.won) : 0, (n) => (n ? fmtTime(n) : "—")],
        ["best-score", s.bestScore],
        ["cur-streak", s.streak],
        ["best-streak", s.bestStreak],
    ];
    const list = $("#stats-list");
    list.innerHTML = "";
    rows.forEach(([key, val, fmt], k) => {
        const li = document.createElement("li");
        li.style.setProperty("--k", k);
        li.innerHTML = `<span>${t(key)}</span><b></b>`;
        list.appendChild(li);
        countUp(li.querySelector("b"), val, fmt || fmtNum, 700);
    });
    const bar = document.createElement("li");
    bar.className = "stat-bar";
    bar.innerHTML = `<i style="transform:scaleX(${rate / 100})"></i>`;
    list.insertBefore(bar, list.children[3]);
}

$("#stats-reset").addEventListener("click", () => {
    confirmBox(t("reset-confirm"), t("reset"), () => {
        for (const lv of E.LEVEL_NAMES) stats[lv] = emptyStats();
        save("stats", stats);
        renderStats();
    });
});

// -------------------------------------------
// Settings
// -------------------------------------------
const SETTING_KEYS = [
    ["autoCheck", "s-autocheck"],
    ["mistakeLimit", "s-limit"],
    ["highlightArea", "s-area"],
    ["highlightSame", "s-same"],
    ["highlightDup", "s-dup"],
    ["autoNotes", "s-autonotes"],
    ["timer", "s-timer"],
    ["sound", "s-sound"],
];

function renderSettings() {
    const list = $("#settings-list");
    list.innerHTML = "";
    for (const [k, label] of SETTING_KEYS) {
        const li = document.createElement("li");
        const id = `set-${k}`;
        li.innerHTML = `<label class="toggle" for="${id}">
            <span class="toggle__text"><span>${t(label)}</span><small>${t(label + "-d")}</small></span>
            <input type="checkbox" id="${id}" ${settings[k] ? "checked" : ""} />
            <span class="switch" aria-hidden="true"></span>
        </label>`;
        li.querySelector("input").addEventListener("change", (e) => {
            settings[k] = e.target.checked;
            save("settings", settings);
            setSound(settings.sound);
            if (k === "sound" && settings.sound) sfx.place();
            if (game) renderAll();
        });
        list.appendChild(li);
    }
}
$("#open-settings").addEventListener("click", () => {
    renderSettings();
    stopClock();
    openDialog("#dlg-settings");
});

$("#data-export").addEventListener("click", () => {
    saveGame();
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sudoku-progress-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$("#data-import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
        const ok = importAll(JSON.parse(await file.text()));
        if (!ok) throw new Error("bad file");
        toast(t("import-ok"));
        setTimeout(() => location.reload(), 900);
    } catch (err) {
        toast(t("import-bad"), "warn");
    }
});

// -------------------------------------------
// Rules (with a small animated demo board)
// -------------------------------------------
function openRules() {
    const demo = $("#rules-demo");
    if (!demo.children.length) {
        const row = [5, 3, 0, 6, 7, 8, 9, 1, 2];
        demo.innerHTML = row.map((v) => `<span class="${v ? "" : "gap"}">${v || "4"}</span>`).join("");
    }
    stopClock();
    openDialog("#dlg-rules");
}

// -------------------------------------------
// Add to home screen
// -------------------------------------------
let installPrompt = null;

function isInstalled() {
    return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

function detectPlatform() {
    const ua = navigator.userAgent;
    // iPadOS reports itself as a Mac, but has touch
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
    if (/Android/.test(ua)) return "android";
    return "desktop";
}

function renderInstall() {
    const platform = detectPlatform();
    const wrap = $("#install-cards");
    // the visitor's own device goes first
    const mine = wrap.querySelector(`[data-platform="${platform}"]`);
    wrap.prepend(mine);
    $$(".install-card", wrap).forEach((c, k) => {
        c.classList.toggle("mine", c === mine);
        c.style.setProperty("--k", k);
    });
    const installed = isInstalled();
    $("#install-status").textContent = installed
        ? t("install-done")
        : installPrompt
          ? t("install-ready")
          : t(`install-how-${platform}`);
    $(".install-hero").classList.toggle("done", installed);
    $("#install-now").hidden = installed || !installPrompt;
}

// Chrome / Edge / Samsung Internet offer a one-tap install prompt
addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;
    if (screen === "install") renderInstall();
});
addEventListener("appinstalled", () => {
    installPrompt = null;
    if (screen === "install") renderInstall();
    toast(t("install-done"));
});
$("#install-now").addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => {});
    installPrompt = null;
    renderInstall();
});

// -------------------------------------------
// Language changes re-render text built in JS
// -------------------------------------------
document.addEventListener("langchange", () => {
    show(screen);
    if ($("#dlg-settings").open) renderSettings();
});

// -------------------------------------------
// Boot
// -------------------------------------------
setSound(settings.sound);
buildBoard();
buildNumpad();
initLang().then(() => show(routeFromHash()));

if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
}
