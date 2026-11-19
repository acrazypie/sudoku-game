// The initial theme is set by the inline script in <head> (saved choice, else system).
function syncThemeColor(theme) {
    // browser bar / Android task switcher colour follows the in-app theme
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
        m.setAttribute("content", theme === "light" ? "#fafafa" : "#0a0a0a");
    });
}
syncThemeColor(document.documentElement.getAttribute("data-theme"));

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    syncThemeColor(theme);
    try {
        localStorage.setItem("theme", theme);
    } catch (e) {}
}

function toggleTheme(event) {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduceMotion) {
        applyTheme(next);
        return;
    }

    // Expand a circle from the click point (or the button's centre for
    // keyboard activation) until it covers the whole viewport.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    const transition = document.startViewTransition(() => applyTheme(next));
    transition.ready
        .then(() => {
            document.documentElement.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                {
                    duration: 600,
                    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                    pseudoElement: "::view-transition-new(root)",
                },
            );
        })
        .catch(() => {});
}

document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
