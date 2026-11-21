// store.js — everything the game remembers, kept in this browser only.

const PREFIX = "sudoku:";

// Where the data lives. In a browser this is localStorage, exactly as before.
// The iOS / Android app can set window.SudokuStorage before the game loads:
// the same getItem / setItem / removeItem as localStorage, plus keys(), and
// an optional `ready` promise the game waits for before reading anything.
const storage = window.SudokuStorage || {
    getItem: (k) => localStorage.getItem(k),
    setItem: (k, v) => localStorage.setItem(k, v),
    removeItem: (k) => localStorage.removeItem(k),
    keys: () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)),
};
if (storage.ready) await Promise.resolve(storage.ready).catch(() => {});

export function load(name, fallback) {
    try {
        const raw = storage.getItem(PREFIX + name);
        if (raw == null) return fallback;
        const val = JSON.parse(raw);
        return fallback && typeof fallback === "object" && !Array.isArray(fallback)
            ? { ...fallback, ...val }
            : val;
    } catch (e) {
        return fallback;
    }
}

export function save(name, value) {
    try {
        if (value == null) storage.removeItem(PREFIX + name);
        else storage.setItem(PREFIX + name, JSON.stringify(value));
    } catch (e) {}
}

export const DEFAULT_SETTINGS = {
    autoCheck: true,
    mistakeLimit: true,
    highlightArea: true,
    highlightSame: true,
    highlightDup: true,
    autoNotes: true,
    timer: true,
    sound: true,
};

export function emptyStats() {
    return {
        started: 0,
        won: 0,
        perfect: 0,
        bestTime: 0,
        bestDate: "", // YYYY-MM-DD of the best time
        totalTime: 0,
        streak: 0,
        bestStreak: 0,
        bestScore: 0,
    };
}

// Bundles all saved data into one object (export / import).
export function exportAll() {
    const out = {};
    try {
        for (const k of storage.keys()) {
            if (k.startsWith(PREFIX)) out[k] = storage.getItem(k);
        }
    } catch (e) {}
    return { app: "sudoku", version: 1, data: out };
}

export function importAll(obj) {
    if (!obj || obj.app !== "sudoku" || typeof obj.data !== "object") return false;
    try {
        for (const [k, v] of Object.entries(obj.data))
            if (k.startsWith(PREFIX) && typeof v === "string") storage.setItem(k, v);
    } catch (e) {
        return false;
    }
    return true;
}
