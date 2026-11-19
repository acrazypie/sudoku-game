// store.js — everything the game remembers, kept in this browser only.

const PREFIX = "sudoku:";

export function load(name, fallback) {
    try {
        const raw = localStorage.getItem(PREFIX + name);
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
        if (value == null) localStorage.removeItem(PREFIX + name);
        else localStorage.setItem(PREFIX + name, JSON.stringify(value));
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
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k.startsWith(PREFIX)) out[k] = localStorage.getItem(k);
        }
    } catch (e) {}
    return { app: "sudoku", version: 1, data: out };
}

export function importAll(obj) {
    if (!obj || obj.app !== "sudoku" || typeof obj.data !== "object") return false;
    try {
        for (const [k, v] of Object.entries(obj.data))
            if (k.startsWith(PREFIX) && typeof v === "string") localStorage.setItem(k, v);
    } catch (e) {
        return false;
    }
    return true;
}
