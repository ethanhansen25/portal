/* Oakframe Media OS — light/dark theme controller.
   Sets data-theme on <html>; every color in portal.css/refine.css is a CSS
   custom property keyed off that attribute, so this file's only job is to
   pick the mode, persist it, and re-render charts (which are raw SVG, not
   CSS vars, so they need a repaint — see js/charts.js syncPalette()). */
(function () {
  const OM = (window.OM = window.OM || {});
  const KEY = "om.theme";

  function systemPref() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function get() {
    return localStorage.getItem(KEY) || systemPref();
  }
  function apply(mode) {
    document.documentElement.dataset.theme = mode === "dark" ? "dark" : "light";
  }
  function set(mode) {
    localStorage.setItem(KEY, mode);
    apply(mode);
    document.dispatchEvent(new CustomEvent("om:theme-changed", { detail: { mode } }));
    // Charts are drawn as raw SVG so CSS alone can't repaint their colors —
    // re-render whatever page is currently on screen to pick up the new palette.
    if (OM.router) OM.router.refresh();
  }
  function toggle() {
    set(get() === "dark" ? "light" : "dark");
  }

  // Applied immediately (before first paint, since this script tag sits
  // early in <head>/<body> load order ahead of app.js's DOMContentLoaded
  // boot) to avoid a flash of the wrong theme.
  apply(get());

  // Follow the OS if the user hasn't explicitly chosen a mode themselves.
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!localStorage.getItem(KEY)) apply(e.matches ? "dark" : "light");
    });
  }

  OM.theme = { get, set, toggle, apply };
})();
