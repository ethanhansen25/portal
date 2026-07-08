/* Oakframe Media OS — inline SVG icon set.
   Replaces the placeholder Unicode glyphs (◆▣☑ etc.) that made the nav read
   as a generic templated app. Every icon shares one stroke language (24x24
   viewBox, currentColor, 1.6 stroke) so they read as one drawn set rather
   than mismatched symbol-font characters. Self-contained — no icon font,
   no CDN — just template strings, consistent with the rest of the app. */
(function () {
  const OM = window.OM;
  const S = (a, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="icon" ${extra}>${a}</svg>`;

  const ICONS = {
    home: S(`<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/>`),
    checklist: S(`<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/>`),
    layers: S(`<path d="m12 4 8 4-8 4-8-4 8-4Z"/><path d="m4 13 8 4 8-4"/>`),
    calendar: S(`<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>`),
    bell: S(`<path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z"/><path d="M10 18.5a2 2 0 0 0 4 0"/>`),
    compass: S(`<circle cx="12" cy="12" r="8.5"/><path d="m14.5 9.5-1.8 4.7-4.7 1.8 1.8-4.7 4.7-1.8Z"/>`),
    trending: S(`<path d="m4 16 5-5 3.5 3.5L20 7"/><path d="M14.5 7H20v5.5"/>`),
    target: S(`<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/>`),
    users: S(`<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M16 8.2a2.7 2.7 0 1 1 0 5.4"/><path d="M15.5 14.6c2.5.3 4.5 2.1 4.5 4.9"/>`),
    shield: S(`<path d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-2.5Z"/><path d="m9 12 2 2 4-4"/>`),
    alert: S(`<path d="M12 4 21 19.5H3L12 4Z"/><path d="M12 10v4"/><circle cx="12" cy="16.7" r="0.6" fill="currentColor"/>`),
    ledger: S(`<rect x="4.5" y="3.5" width="15" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>`),
    diamond: S(`<path d="m12 3.5 8 6.5-8 10.5-8-10.5 8-6.5Z"/><path d="M4 10h16"/>`),
    funnel: S(`<path d="M4 5h16l-6 7.5v6l-4 2v-8L4 5Z"/>`),
    list: S(`<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>`),
    phone: S(`<path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2C10.5 19 5 13.5 4.5 6.2A2 2 0 0 1 6.5 4Z"/>`),
    dollar: S(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M14.8 9.3c-.4-.8-1.4-1.3-2.6-1.3-1.6 0-2.7.9-2.7 2s1 1.6 2.7 2c1.7.4 2.7 1 2.7 2.1 0 1.1-1.1 2-2.7 2-1.2 0-2.2-.5-2.6-1.3"/>`),
    building: S(`<rect x="4.5" y="3.5" width="10" height="17" rx="1"/><path d="M14.5 9.5H19a1 1 0 0 1 1 1v10h-5.5M8 8h.01M8 12h.01M11 8h.01M11 12h.01M8 16h.01M11 16h.01"/>`),
    mail: S(`<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 6.5 8 6.5 8-6.5"/>`),
    wrench: S(`<path d="M14.7 6.3a4 4 0 0 0-5.4 4.9L4 16.5V20h3.5l5.3-5.3a4 4 0 0 0 4.9-5.4l-2.7 2.7-2-2 2.7-2.7Z"/>`),
    checkCircle: S(`<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.3 2.4 2.4 5-5"/>`),
    archive: S(`<rect x="3.5" y="4" width="17" height="4.5" rx="1"/><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5"/><path d="M10 13h4"/>`),
    file: S(`<path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5V8h4"/>`),
    search: S(`<circle cx="10.5" cy="10.5" r="6.5"/><path d="m19.5 19.5-4.2-4.2"/>`),
    sun: S(`<circle cx="12" cy="12" r="4.2"/><path d="M12 3v2.2M12 18.8V21M4.2 12H6.4M17.6 12h2.2M6.3 6.3l1.5 1.5M16.2 16.2l1.5 1.5M17.7 6.3l-1.5 1.5M7.8 16.2l-1.5 1.5"/>`),
    moon: S(`<path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a6.8 6.8 0 0 0 9.5 9.5Z"/>`),
    menu: S(`<path d="M4 7h16M4 12h16M4 17h16"/>`),
    chevronLeft: S(`<path d="M14.5 5.5 8 12l6.5 6.5"/>`),
    chevronRight: S(`<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>`),
    package: S(`<path d="m3.5 8 8.5-4.5L20.5 8v8L12 20.5 3.5 16V8Z"/><path d="M3.5 8 12 12.5m0 0L20.5 8M12 12.5V21"/>`),
    signature: S(`<path d="M4 17.5c2-1 3.5-3 4-5.5.5-2.5 0-6-1.5-6S5 9 6 12s3 4.5 6 4.5c2.5 0 4-1.5 4.5-3.5"/><path d="M15 19.5h5"/>`),
    folder: S(`<path d="M3.5 7a1 1 0 0 1 1-1H10l2 2.5h7.5a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V7Z"/>`),
    chat: S(`<path d="M4 5.5h16v10H9l-4 3.5v-3.5H4Z"/><path d="M8 9.5h8M8 12.5h5"/>`),
    lifeBuoy: S(`<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="m6.3 6.3 3.5 3.5M17.7 6.3l-3.5 3.5M6.3 17.7l3.5-3.5M17.7 17.7l-3.5-3.5"/>`),
    clock: S(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.3l3.5 2"/>`),
    grid: S(`<rect x="3.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.2"/>`),
    // Oakframe Media's real mark, traced from the brand logo — a viewfinder
    // around a lens, not a placeholder glyph. Used everywhere the sidebar/
    // boot screen previously showed a plain "O" letter.
    oakframeMark: S(`<path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/>`),
  };

  OM.icon = function (name, cls) {
    const svg = ICONS[name] || ICONS.file;
    return cls ? svg.replace('class="icon"', `class="icon ${cls}"`) : svg;
  };
})();
