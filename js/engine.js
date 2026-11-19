// engine.js
// -------------------------------------------
// Sudoku engine: seeded generator, fast solver, human-style logical
// solver (used to grade difficulty and to explain hints).
// Boards are arrays of 81 ints, 0 = empty. Digit d is bit 1 << (d - 1).
// -------------------------------------------

const ALL = 0x1ff;
const ROW = new Uint8Array(81);
const COL = new Uint8Array(81);
const BOX = new Uint8Array(81);
for (let i = 0; i < 81; i++) {
    ROW[i] = (i / 9) | 0;
    COL[i] = i % 9;
    BOX[i] = ((ROW[i] / 3) | 0) * 3 + ((COL[i] / 3) | 0);
}

// 27 units: rows 0-8, cols 9-17, boxes 18-26
export const UNITS = [];
for (let r = 0; r < 9; r++) UNITS.push([...Array(9)].map((_, c) => r * 9 + c));
for (let c = 0; c < 9; c++) UNITS.push([...Array(9)].map((_, r) => r * 9 + c));
for (let b = 0; b < 9; b++) {
    const r0 = ((b / 3) | 0) * 3;
    const c0 = (b % 3) * 3;
    UNITS.push([...Array(9)].map((_, k) => (r0 + ((k / 3) | 0)) * 9 + c0 + (k % 3)));
}

export const PEERS = [];
for (let i = 0; i < 81; i++) {
    const set = new Set();
    for (const u of [UNITS[ROW[i]], UNITS[9 + COL[i]], UNITS[18 + BOX[i]]])
        for (const j of u) if (j !== i) set.add(j);
    PEERS.push([...set]);
}

export const rowOf = (i) => ROW[i];
export const colOf = (i) => COL[i];
export const boxOf = (i) => BOX[i];
export const bit = (d) => 1 << (d - 1);

function popcount(m) {
    m = m - ((m >> 1) & 0x55555555);
    m = (m & 0x33333333) + ((m >> 2) & 0x33333333);
    return (((m + (m >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;
}
function lowDigit(m) {
    return 32 - Math.clz32(m & -m); // index of lowest set bit, 1-based
}
function digitsOf(m) {
    const out = [];
    for (let d = 1; d <= 9; d++) if (m & (1 << (d - 1))) out.push(d);
    return out;
}

// -------------------------------------------
// Seeded randomness (so a daily puzzle is the same for everyone)
// -------------------------------------------
export function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
}

export function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// -------------------------------------------
// Backtracking solver with bitmasks (MRV heuristic)
// Returns the number of solutions found, up to `limit`.
// If `out` is given the first solution is written into it.
// -------------------------------------------
export function countSolutions(grid, limit = 2, out = null, rng = null) {
    const g = Int8Array.from(grid);
    const rows = new Uint16Array(9);
    const cols = new Uint16Array(9);
    const boxes = new Uint16Array(9);
    for (let i = 0; i < 81; i++) {
        const v = g[i];
        if (!v) continue;
        const b = 1 << (v - 1);
        if ((rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & b) return 0;
        rows[ROW[i]] |= b;
        cols[COL[i]] |= b;
        boxes[BOX[i]] |= b;
    }
    let count = 0;
    const order = rng ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng) : null;

    function rec() {
        let best = -1;
        let bestMask = 0;
        let bestN = 10;
        for (let i = 0; i < 81; i++) {
            if (g[i]) continue;
            const m = ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & ALL;
            const n = popcount(m);
            if (n === 0) return false;
            if (n < bestN) {
                best = i;
                bestMask = m;
                bestN = n;
                if (n === 1) break;
            }
        }
        if (best === -1) {
            if (count === 0 && out) for (let i = 0; i < 81; i++) out[i] = g[i];
            count++;
            return count >= limit;
        }
        const r = ROW[best];
        const c = COL[best];
        const bx = BOX[best];
        const tryDigit = (d) => {
            const b = 1 << (d - 1);
            if (!(bestMask & b)) return false;
            g[best] = d;
            rows[r] |= b;
            cols[c] |= b;
            boxes[bx] |= b;
            const stop = rec();
            g[best] = 0;
            rows[r] &= ~b;
            cols[c] &= ~b;
            boxes[bx] &= ~b;
            return stop;
        };
        if (order) {
            for (const d of order) if (tryDigit(d)) return true;
        } else {
            for (let d = 1; d <= 9; d++) if (tryDigit(d)) return true;
        }
        return false;
    }
    rec();
    return count;
}

export function solve(grid) {
    const out = new Array(81).fill(0);
    return countSolutions(grid, 1, out) ? out : null;
}

function fullSolution(rng) {
    const out = new Array(81).fill(0);
    countSolutions(new Array(81).fill(0), 1, out, rng);
    return out;
}

// -------------------------------------------
// Logical solver
// Technique levels:
//   1 = naked / hidden singles
//   2 = locked candidates (pointing, claiming)
//   3 = naked / hidden pairs and triples
//   4 = X-wing, swordfish
//   5 = needs something beyond the above
// -------------------------------------------
function candidatesOf(grid) {
    const c = new Uint16Array(81);
    for (let i = 0; i < 81; i++) {
        if (grid[i]) continue;
        let m = ALL;
        for (const p of PEERS[i]) if (grid[p]) m &= ~(1 << (grid[p] - 1));
        c[i] = m;
    }
    return c;
}

function makeSolver(grid) {
    const g = Int8Array.from(grid);
    const cand = candidatesOf(g);

    function place(i, d) {
        g[i] = d;
        cand[i] = 0;
        const b = ~(1 << (d - 1));
        for (const p of PEERS[i]) cand[p] &= b;
    }

    // Each technique returns a step or null. A step either places a digit
    // ({cell, digit, kind, unit}) or eliminates candidates ({elim: true}).
    function nakedSingle() {
        for (let i = 0; i < 81; i++) {
            if (!g[i] && popcount(cand[i]) === 1)
                return { cell: i, digit: lowDigit(cand[i]), kind: "naked" };
        }
        return null;
    }

    function hiddenSingle() {
        // boxes first: that's how most people scan
        const order = [18, 19, 20, 21, 22, 23, 24, 25, 26, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
        for (const u of order) {
            for (let d = 1; d <= 9; d++) {
                const b = 1 << (d - 1);
                let pos = -1;
                let n = 0;
                for (const i of UNITS[u]) {
                    if (g[i] === d) {
                        n = 2;
                        break;
                    }
                    if (cand[i] & b) {
                        pos = i;
                        n++;
                    }
                }
                if (n === 1)
                    return {
                        cell: pos,
                        digit: d,
                        kind: u < 9 ? "hidden-row" : u < 18 ? "hidden-col" : "hidden-box",
                    };
            }
        }
        return null;
    }

    function lockedCandidates() {
        let changed = false;
        for (let b = 0; b < 9; b++) {
            const box = UNITS[18 + b];
            for (let d = 1; d <= 9; d++) {
                const m = 1 << (d - 1);
                const cells = box.filter((i) => cand[i] & m);
                if (cells.length < 2) continue;
                // pointing
                const r = ROW[cells[0]];
                const c = COL[cells[0]];
                if (cells.every((i) => ROW[i] === r)) {
                    for (const i of UNITS[r])
                        if (BOX[i] !== b && cand[i] & m) {
                            cand[i] &= ~m;
                            changed = true;
                        }
                }
                if (cells.every((i) => COL[i] === c)) {
                    for (const i of UNITS[9 + c])
                        if (BOX[i] !== b && cand[i] & m) {
                            cand[i] &= ~m;
                            changed = true;
                        }
                }
            }
        }
        // claiming
        for (let u = 0; u < 18; u++) {
            for (let d = 1; d <= 9; d++) {
                const m = 1 << (d - 1);
                const cells = UNITS[u].filter((i) => cand[i] & m);
                if (cells.length < 2) continue;
                const bx = BOX[cells[0]];
                if (!cells.every((i) => BOX[i] === bx)) continue;
                for (const i of UNITS[18 + bx]) {
                    const inLine = u < 9 ? ROW[i] === u : COL[i] === u - 9;
                    if (!inLine && cand[i] & m) {
                        cand[i] &= ~m;
                        changed = true;
                    }
                }
            }
        }
        return changed ? { elim: true } : null;
    }

    function subsets() {
        let changed = false;
        for (const unit of UNITS) {
            const empty = unit.filter((i) => !g[i]);
            if (empty.length < 3) continue;
            for (const k of [2, 3]) {
                // naked subsets: k cells whose candidates union has k digits
                combos(empty, k, (set) => {
                    let u = 0;
                    for (const i of set) u |= cand[i];
                    if (popcount(u) !== k) return;
                    for (const i of empty)
                        if (!set.includes(i) && cand[i] & u) {
                            cand[i] &= ~u;
                            changed = true;
                        }
                });
                // hidden subsets: k digits that only appear in the same k cells
                const digits = [];
                for (let d = 1; d <= 9; d++)
                    if (empty.some((i) => cand[i] & (1 << (d - 1)))) digits.push(d);
                combos(digits, k, (ds) => {
                    let dm = 0;
                    for (const d of ds) dm |= 1 << (d - 1);
                    const cells = empty.filter((i) => cand[i] & dm);
                    if (cells.length !== k) return;
                    if (!ds.every((d) => cells.some((i) => cand[i] & (1 << (d - 1))))) return;
                    for (const i of cells)
                        if (cand[i] & ~dm) {
                            cand[i] &= dm;
                            changed = true;
                        }
                });
                if (changed) return { elim: true };
            }
        }
        return null;
    }

    function fish() {
        for (const size of [2, 3]) {
            for (const byRow of [true, false]) {
                for (let d = 1; d <= 9; d++) {
                    const m = 1 << (d - 1);
                    const lines = [];
                    for (let l = 0; l < 9; l++) {
                        const unit = UNITS[byRow ? l : 9 + l];
                        let pos = 0;
                        for (const i of unit) if (cand[i] & m) pos |= 1 << (byRow ? COL[i] : ROW[i]);
                        const n = popcount(pos);
                        if (n >= 2 && n <= size) lines.push({ l, pos });
                    }
                    let changed = false;
                    combos(lines, size, (set) => {
                        let u = 0;
                        for (const s of set) u |= s.pos;
                        if (popcount(u) !== size) return;
                        const used = set.map((s) => s.l);
                        for (let x = 0; x < 9; x++) {
                            if (!(u & (1 << x))) continue;
                            for (const i of UNITS[byRow ? 9 + x : x]) {
                                const line = byRow ? ROW[i] : COL[i];
                                if (!used.includes(line) && cand[i] & m) {
                                    cand[i] &= ~m;
                                    changed = true;
                                }
                            }
                        }
                    });
                    if (changed) return { elim: true };
                }
            }
        }
        return null;
    }

    const techniques = [
        [1, nakedSingle],
        [1, hiddenSingle],
        [2, lockedCandidates],
        [3, subsets],
        [4, fish],
    ];

    return { g, cand, place, techniques };
}

function combos(arr, k, fn, start = 0, acc = []) {
    if (acc.length === k) return fn(acc);
    for (let i = start; i < arr.length; i++) {
        acc.push(arr[i]);
        combos(arr, k, fn, i + 1, acc);
        acc.pop();
    }
}

// Runs the logical solver; returns the hardest technique needed (5 = stuck).
export function grade(grid, maxTech = 4) {
    const s = makeSolver(grid);
    let hardest = 1;
    for (;;) {
        if (!s.g.includes(0)) return hardest;
        let progressed = false;
        for (const [lvl, fn] of s.techniques) {
            if (lvl > maxTech) break;
            const step = fn();
            if (!step) continue;
            if (lvl > hardest) hardest = lvl;
            if (!step.elim) s.place(step.cell, step.digit);
            progressed = true;
            break;
        }
        if (!progressed) return 5;
    }
}

// Finds the next placement a person could deduce, preferring `prefer`.
// Returns {cell, digit, kind, tech} or null.
export function nextStep(grid, prefer = -1) {
    const s = makeSolver(grid);
    let hardest = 1;
    for (let guard = 0; guard < 200; guard++) {
        // singles anywhere: if the preferred cell is one of them, pick it
        if (prefer >= 0 && !s.g[prefer]) {
            const m = s.cand[prefer];
            if (popcount(m) === 1)
                return { cell: prefer, digit: lowDigit(m), kind: "naked", tech: hardest };
            for (const u of [18 + BOX[prefer], ROW[prefer], 9 + COL[prefer]]) {
                for (const d of digitsOf(m)) {
                    const b = 1 << (d - 1);
                    const spots = UNITS[u].filter((i) => !s.g[i] && s.cand[i] & b);
                    if (spots.length === 1)
                        return {
                            cell: prefer,
                            digit: d,
                            kind: u < 9 ? "hidden-row" : u < 18 ? "hidden-col" : "hidden-box",
                            tech: hardest,
                        };
                }
            }
        }
        let progressed = false;
        for (const [lvl, fn] of s.techniques) {
            const step = fn();
            if (!step) continue;
            if (!step.elim) return { ...step, tech: hardest };
            if (lvl > hardest) hardest = lvl;
            progressed = true;
            break;
        }
        if (!progressed) return null;
    }
    return null;
}

export { candidatesOf };

// -------------------------------------------
// Generator
// -------------------------------------------
export const LEVELS = {
    easy: { givens: 40, maxTech: 1, minTech: 1, base: 10, attempts: 2 },
    medium: { givens: 33, maxTech: 1, minTech: 1, base: 20, attempts: 3 },
    hard: { givens: 29, maxTech: 2, minTech: 2, base: 35, attempts: 30 },
    expert: { givens: 26, maxTech: 3, minTech: 3, base: 50, attempts: 40 },
    master: { givens: 24, maxTech: 5, minTech: 4, base: 70, attempts: 10 },
    extreme: { givens: 22, maxTech: 5, minTech: 5, base: 90, attempts: 12 },
};
export const LEVEL_NAMES = Object.keys(LEVELS);

export function generate(level = "easy", seed = (Math.random() * 2 ** 32) >>> 0) {
    const L = LEVELS[level] || LEVELS.easy;
    const rng = mulberry32(seed);
    let best = null;

    for (let attempt = 0; attempt < L.attempts; attempt++) {
        const solution = fullSolution(rng);
        const puzzle = solution.slice();
        const order = shuffle([...Array(81).keys()], rng);
        let givens = 81;
        let tech = 1;

        // Remove clues while the puzzle stays unique and within the level's
        // techniques; past the target count keep going (a little) until it
        // is hard enough.
        for (const i of order) {
            if (givens <= L.givens && (tech >= L.minTech || givens <= L.givens - 4)) break;
            const v = puzzle[i];
            puzzle[i] = 0;
            if (countSolutions(puzzle, 2) !== 1) {
                puzzle[i] = v;
                continue;
            }
            if (L.maxTech < 5) {
                const t = grade(puzzle, L.maxTech);
                if (t > L.maxTech) {
                    puzzle[i] = v;
                    continue;
                }
                tech = t;
            }
            givens--;
        }

        tech = grade(puzzle);
        const candidate = { puzzle, solution, tech, givens };
        const fits = tech >= L.minTech && tech <= L.maxTech && givens <= L.givens + 3;
        if (fits) return { ...candidate, level, seed };
        if (
            !best ||
            Math.abs(Math.min(tech, L.maxTech) - L.minTech) < Math.abs(Math.min(best.tech, L.maxTech) - L.minTech) ||
            (best.tech === tech && givens < best.givens)
        )
            best = candidate;
    }
    return { ...best, level, seed };
}
