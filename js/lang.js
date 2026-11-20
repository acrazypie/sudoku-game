// lang.js — loads lang/<code>.json, fills [data-i18n] elements and
// exposes t(key, vars) for text built in JavaScript.

const SUPPORTED_LANGS = ["en", "it", "fr", "de", "es", "ja"];
let strings = {};
let fallback = {};

export function t(key, vars = {}) {
    let s = strings[key] ?? fallback[key] ?? key;
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
    return s;
}

export function currentLang() {
    return document.documentElement.getAttribute("lang") || "en";
}

async function fetchLang(lang) {
    const res = await fetch(`lang/${lang}.json`);
    if (!res.ok) throw new Error(`Missing ${lang}.json`);
    return res.json();
}

export async function setLanguage(lang) {
    try {
        (window.SudokuStorage || localStorage).setItem("lang", lang);
    } catch (e) {}
    document.documentElement.setAttribute("lang", lang);

    const current = document.getElementById("lang-current");
    if (current) current.textContent = lang.toUpperCase();
    document.querySelectorAll("#lang-menu li").forEach((li) => {
        li.classList.toggle("active", li.dataset.lang === lang);
    });

    try {
        if (!Object.keys(fallback).length) fallback = await fetchLang("en");
        strings = lang === "en" ? fallback : await fetchLang(lang);
    } catch (error) {
        console.error("Translation load failed:", error);
    }
    applyTranslations();
    document.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
}

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-label]").forEach((el) => {
        const s = t(el.getAttribute("data-i18n-label"));
        el.setAttribute("aria-label", s);
        el.setAttribute("title", s);
    });
}

export function initLang() {
    const langToggle = document.getElementById("lang-toggle");
    const langMenu = document.getElementById("lang-menu");

    const setOpen = (open) => {
        langMenu.classList.toggle("show", open);
        langToggle.setAttribute("aria-expanded", String(open));
    };

    langToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        setOpen(!langMenu.classList.contains("show"));
    });
    document.addEventListener("click", (e) => {
        if (!langMenu.contains(e.target) && !langToggle.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setOpen(false);
    });

    langMenu.querySelectorAll("li").forEach((item) => {
        const choose = () => {
            setLanguage(item.dataset.lang);
            setOpen(false);
            langToggle.focus();
        };
        item.addEventListener("click", choose);
        item.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                choose();
            }
        });
    });

    let savedLang = null;
    try {
        savedLang = (window.SudokuStorage || localStorage).getItem("lang");
    } catch (e) {}
    const browserLang = (navigator.language || "en").split("-")[0];
    return setLanguage(
        SUPPORTED_LANGS.includes(savedLang)
            ? savedLang
            : SUPPORTED_LANGS.includes(browserLang)
              ? browserLang
              : "en",
    );
}
