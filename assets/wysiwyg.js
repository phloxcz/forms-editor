/*!
 * editor.js  –  phloxcz/forms-editor
 *
 * Theme-aware vanilla-JS rich-text editor for Phlox\Forms\Editor\EditorInput.
 * CSS classes are read from data-theme (JSON) set by resolveThemeClasses(),
 * so Bootstrap, Tailwind, or any custom theme works without changing this file.
 *
 * MIT License
 */
(function (global) {
  'use strict';

  // =========================================================================
  // DOM helpers
  // =========================================================================

  function el(tag, opts) {
    const e = document.createElement(tag);
    if (!opts) return e;
    const { cls, html, text, style, ...rest } = opts;
    if (cls)   e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    if (text !== undefined) e.textContent = text;
    if (style) Object.assign(e.style, style);
    Object.entries(rest).forEach(([k, v]) => {
      if (k === 'data' && typeof v === 'object') {
        Object.entries(v).forEach(([dk, dv]) => (e.dataset[dk] = dv));
      } else {
        e.setAttribute(k, v);
      }
    });
    return e;
  }

  function saveRange(win) {
    const s = (win || window).getSelection();
    return s && s.rangeCount ? s.getRangeAt(0).cloneRange() : null;
  }

  function restoreRange(range, win) {
    if (!range) return;
    const s = (win || window).getSelection();
    s.removeAllRanges();
    s.addRange(range);
  }

  function closestEl(node, selector) {
    let n = node instanceof Element ? node : (node && node.parentElement);
    while (n) {
      if (n.matches && n.matches(selector)) return n;
      n = n.parentElement;
    }
    return null;
  }

  const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

  function getBreakpointClasses(colEl) {
    // Returns { xs:'auto'|'1'..'12'|'none', sm:…, … }
    const bp = { xs:'none', sm:'none', md:'none', lg:'none', xl:'none', xxl:'none' };
    colEl.classList.forEach(c => {
      if (c === 'col')           { bp.xs = 'auto'; return; }
      const mXs = c.match(/^col-(\d+)$/);
      if (mXs)                   { bp.xs = mXs[1]; return; }
      BREAKPOINTS.slice(1).forEach(b => {
        if (c === 'col-' + b)    { bp[b] = 'auto'; return; }
        const m = c.match(new RegExp('^col-' + b + '-(\\d+)$'));
        if (m)                   { bp[b] = m[1]; }
      });
    });
    return bp;
  }

  function applyBreakpointClass(colEl, breakpoint, size) {
    // Remove existing class for this breakpoint
    const toRemove = [];
    colEl.classList.forEach(c => {
      if (breakpoint === 'xs') {
        if (c === 'col' || /^col-\d+$/.test(c)) toRemove.push(c);
      } else {
        if (c === 'col-' + breakpoint || new RegExp('^col-' + breakpoint + '-\\d+$').test(c)) toRemove.push(c);
      }
    });
    toRemove.forEach(c => colEl.classList.remove(c));
    // Add new
    if (size === 'none') return;
    let newCls;
    if (breakpoint === 'xs') {
      newCls = size === 'auto' ? 'col' : 'col-' + size;
    } else {
      newCls = size === 'auto' ? 'col-' + breakpoint : 'col-' + breakpoint + '-' + size;
    }
    colEl.classList.add(newCls);
  }

  // Keep simple getColSize for popup (xs only)
  function getColSize(colEl) {
    const bp = getBreakpointClasses(colEl);
    return bp.xs === 'none' ? 'auto' : bp.xs;
  }

  // ── Table helpers ────────────────────────────────────────────────────────

  function getCellIndex(cell) {
    return Array.from(cell.parentElement.children).indexOf(cell);
  }

  function getColCount(table) {
    let max = 0;
    table.querySelectorAll('tr').forEach(tr => {
      if (tr.children.length > max) max = tr.children.length;
    });
    return max;
  }

  function insertTableRow(table, refRow, position) {
    const cols = getColCount(table);
    const newRow = document.createElement('tr');
    for (let i = 0; i < cols; i++) {
      const td = document.createElement('td');
      td.innerHTML = '&nbsp;';
      newRow.appendChild(td);
    }
    if (position === 'above') {
      refRow.parentElement.insertBefore(newRow, refRow);
    } else {
      refRow.parentElement.insertBefore(newRow, refRow.nextSibling);
    }
    return newRow;
  }

  function insertTableCol(table, colIdx, position) {
    const insertIdx = position === 'right' ? colIdx + 1 : colIdx;
    table.querySelectorAll('tr').forEach(tr => {
      const isHeader = tr.parentElement.tagName === 'THEAD';
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.innerHTML = isHeader ? 'Záhlaví' : '&nbsp;';
      const ref = tr.children[insertIdx];
      if (ref) {
        tr.insertBefore(newCell, ref);
      } else {
        tr.appendChild(newCell);
      }
    });
  }

  function deleteTableRow(row) {
    const tbody = row.parentElement;
    row.remove();
    // If tbody is now empty, remove it
    if (tbody && tbody.children.length === 0 && tbody.tagName !== 'THEAD') {
      tbody.remove();
    }
  }

  function deleteTableCol(table, colIdx) {
    table.querySelectorAll('tr').forEach(tr => {
      const cell = tr.children[colIdx];
      if (cell) cell.remove();
    });
  }

  // =========================================================================
  // SVG icon set
  // =========================================================================

  const ICONS = {
    bold:       '<svg viewBox="0 0 24 24"><path d="M15.6 11.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 7.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>',
    italic:     '<svg viewBox="0 0 24 24"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>',
    underline:  '<svg viewBox="0 0 24 24"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>',
    strike:     '<svg viewBox="0 0 24 24"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>',
    blockquote: '<svg viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>',
    code:       '<svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',
    codeblock:  '<svg viewBox="0 0 24 24"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg>',
    ul:         '<svg viewBox="0 0 24 24"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>',
    ol:         '<svg viewBox="0 0 24 24"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-5v2h14V6H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>',
    link:       '<svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
    image:      '<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
    table:      '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM4 6h6v3H4V6zm0 5h6v3H4v-3zm0 5h6v3H4v-3zm10 3h-2v-3h2v3zm0-5h-2v-3h2v3zm0-5h-2V6h2v3zm4 10h-2v-3h2v3zm0-5h-2v-3h2v3zm0-5h-2V6h2v3z"/></svg>',
    grid:       '<svg viewBox="0 0 24 24"><path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z"/></svg>',
    source:     '<svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',
    link2:      '<svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
    unlink:     '<svg viewBox="0 0 24 24"><path d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.43-.98 2.63-2.31 2.98l1.46 1.46C20.59 15.74 22 14.04 22 12c0-2.76-2.24-5-5-5zm-1 4h-2.19l2 2H16v-2zM2 4.27l3.11 3.11C3.29 8.12 2 9.91 2 12c0 2.76 2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1 0-1.59 1.21-2.9 2.76-3.07L8.73 11H8v2h2.73l2 2H8v1.9h4.46l3.31 3.31 1.27-1.27L3.27 3 2 4.27z"/></svg>',
    image2:     '<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
    sup:        '<svg viewBox="0 0 24 24"><path d="M22 7h-2v1h3v1h-4V7c0-.55.45-1 1-1h2V5h-3V4h3c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1zm-9.04 5.23c.52-.45.98-.87 1.38-1.25.4-.38.74-.75 1.02-1.1.28-.35.49-.69.63-1.02.14-.33.21-.68.21-1.04 0-.43-.07-.82-.22-1.17s-.35-.65-.62-.9a2.8 2.8 0 0 0-.97-.58A3.7 3.7 0 0 0 13.14 5c-.53 0-1.02.08-1.45.24s-.8.38-1.1.67c-.3.28-.54.62-.7 1.01C9.73 7.3 9.64 7.72 9.64 8.18h1.79c0-.29.04-.55.13-.78s.21-.42.37-.58c.16-.16.34-.28.56-.37.22-.08.46-.13.72-.13.29 0 .53.04.74.13.21.09.38.21.52.36.14.15.24.33.31.53s.1.42.1.65c0 .3-.07.59-.2.86-.13.27-.32.54-.56.81-.24.27-.53.55-.87.84s-.72.6-1.14.94L9.3 13.5V15H16v-1.5h-4.04l1-.77z"/></svg>',
    sub:        '<svg viewBox="0 0 24 24"><path d="M22 17h-2v1h3v1h-4v-2c0-.55.45-1 1-1h2v-1h-3v-1h3c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1zM12.96 12.23c.52-.45.98-.87 1.38-1.25.4-.38.74-.75 1.02-1.1.28-.35.49-.69.63-1.02.14-.33.21-.68.21-1.04 0-.43-.07-.82-.22-1.17s-.35-.65-.62-.9a2.8 2.8 0 0 0-.97-.58A3.7 3.7 0 0 0 13.14 5c-.53 0-1.02.08-1.45.24s-.8.38-1.1.67c-.3.28-.54.62-.7 1.01C9.73 7.3 9.64 7.72 9.64 8.18h1.79c0-.29.04-.55.13-.78s.21-.42.37-.58c.16-.16.34-.28.56-.37.22-.08.46-.13.72-.13.29 0 .53.04.74.13.21.09.38.21.52.36.14.15.24.33.31.53s.1.42.1.65c0 .3-.07.59-.2.86-.13.27-.32.54-.56.81-.24.27-.53.55-.87.84s-.72.6-1.14.94L9.3 13.5V15H16v-1.5h-4.04l1-.77z"/></svg>',
    emoji:      '😊',
    fontcolor:  '<svg viewBox="0 0 24 24"><path d="M11 3L5.5 17h2.25l1.12-3h6.25l1.12 3h2.25L13 3h-2zm-1.38 9L12 5.67 14.38 12H9.62z"/><rect x="3" y="20" width="18" height="2" rx="1"/></svg>',
    bgcolor:    '<svg viewBox="0 0 24 24"><path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15a1.49 1.49 0 0 0 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z"/><rect x="3" y="20" width="18" height="2" rx="1" fill="currentColor"/></svg>',
    clearfmt:   '<svg viewBox="0 0 24 24"><path d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z"/></svg>',
    specialchar: 'Ω',
    hr:          '<svg viewBox="0 0 24 24"><path d="M19 12H5v1.5h14V12zM4 19h16v-1.5H4V19zM4 5v1.5h16V5H4z"/></svg>',
    alignleft:   '<svg viewBox="0 0 24 24"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg>',
    aligncenter: '<svg viewBox="0 0 24 24"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/></svg>',
    alignright:  '<svg viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>',
    alignjustify:'<svg viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z"/></svg>',
    lowercase:   '<svg viewBox="0 0 24 24"><text x="2" y="18" font-size="16" font-family="serif" font-weight="bold">aa</text></svg>',
    uppercase:   '<svg viewBox="0 0 24 24"><text x="1" y="18" font-size="16" font-family="serif" font-weight="bold">AA</text></svg>',
    titlecase:   '<svg viewBox="0 0 24 24"><text x="1" y="18" font-size="16" font-family="serif" font-weight="bold">Aa</text></svg>',
    fullscreen:  '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
    exitfullscr: '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
  };



  // =========================================================================
  // PhloxEditor — main class
  // =========================================================================

  // Registry of live instances, keyed by form field name — lets code outside
  // the editor (e.g. a CMS widget browser panel) target a specific editor via
  // window.PhloxEditor.insertWidget(). activeInstance tracks the last focused
  // editor so callers can omit the field name in the common single-editor case.
  const instances = new Map();
  let activeInstance = null;

  class PhloxEditor {

    constructor(wrapper) {
      this.w           = wrapper;
      this.uploadUrl   = wrapper.dataset.uploadUrl || '';
      this.fieldName   = wrapper.dataset.name || '';
      this.initValue   = wrapper.dataset.value || '';
      // toolbarRows: array of rows, each row is array of group names
      // data-toolbar: rows separated by "|", groups by ","
      // null = show all in single row (default)
      if (wrapper.dataset.toolbar) {
        this.toolbarRows = wrapper.dataset.toolbar.split('|').map(
          row => row.split(',').map(s => s.trim()).filter(Boolean)
        );
        this.toolbarGroups = this.toolbarRows.flat();
      } else {
        this.toolbarRows   = null;
        this.toolbarGroups = null;
      }
      this.minHeight   = parseInt(wrapper.dataset.minHeight, 10) || 300;
      this.maxHeight   = parseInt(wrapper.dataset.maxHeight, 10) || 700;
      this.contentClass = wrapper.dataset.contentClass || '';
      // Theme classes resolved server-side by EditorInput::resolveThemeClasses()
      this.cls         = wrapper.dataset.theme ? JSON.parse(wrapper.dataset.theme) : {};
      this.bs          = this.cls.bsModal === true;
      const colorScheme = wrapper.dataset.colorScheme || 'light';
      if (colorScheme !== 'light') wrapper.setAttribute('data-theme', colorScheme);
      this.sourceMode  = false;
      this.savedRange  = null;
      this.overlay     = null;       // active popup overlay
      this.gridFloat   = null;       // floating grid toolbar (appended to body)
      this.activeRow   = null;       // currently selected .row element
      this.isFullscreen = false;

      this._render();
      this._bindEvents();

      if (this.fieldName) instances.set(this.fieldName, this);
      activeInstance = this;
    }

    // ── Render ──────────────────────────────────────────────────────────────

    _render() {
      this.w.innerHTML = '';
      if (this.cls.wrapper) {
        this.cls.wrapper.split(' ').filter(Boolean).forEach(c => this.w.classList.add(c));
      }

      // Hidden input carries form value
      this.input = el('textarea', { name: this.fieldName, cls: 'phx-editor-value-field' });
      this.input.value = this.initValue;
      this.w.appendChild(this.input);

      // Toolbar
      this.toolbar = this._buildToolbar();
      this.w.appendChild(this.toolbar);

      // Editable pane
      const paneCls = this.cls.editor + (this.contentClass ? ' ' + this.contentClass : '');
      this.pane = el('div', { cls: paneCls, contenteditable: 'true' });
      this.pane.style.minHeight = this.minHeight + 'px';
      this.pane.style.maxHeight = this.maxHeight + 'px';
      this.pane.innerHTML = this.initValue;
      // Enter vytváří <p> místo <div>
      document.execCommand('defaultParagraphSeparator', false, 'p');
      this.w.appendChild(this.pane);

      // Source pane
      this.srcPane = el('textarea', { cls: this.cls.source });
      this.w.appendChild(this.srcPane);

      // Grid / table / image floating toolbars
      this.gridFloat  = el('div', { cls: this.cls.floatBar });
      this.tableFloat = el('div', { cls: this.cls.floatBar });
      this.imgFloat   = el('div', { cls: this.cls.floatBarImg });
      this.w.appendChild(this.gridFloat);
      this.w.appendChild(this.tableFloat);
      this.w.appendChild(this.imgFloat);
      this.activeTable = null;
      this.activeImg   = null;
    }





    // ── Helpers ──────────────────────────────────────────────────────────────

    _posFloat(floatEl, el) {
      const rect = el.getBoundingClientRect();
      if (this.isFullscreen) {
        const wRect = this.w.getBoundingClientRect();
        floatEl.style.position = 'absolute';
        floatEl.style.top  = (rect.bottom - wRect.top  + 6) + 'px';
        floatEl.style.left = (rect.left   - wRect.left)     + 'px';
      } else {
        floatEl.style.position = 'fixed';
        floatEl.style.top  = (rect.bottom + 6) + 'px';
        floatEl.style.left = rect.left + 'px';
      }
    }

    _el(tag)             { return document.createElement(tag); }
    _range()             { return document.createRange(); }
    _walker(root, what)  { return document.createTreeWalker(root, what); }
    _sel()               { return window.getSelection(); }
    _exec(cmd, val)      { return document.execCommand(cmd, false, val !== undefined ? val : null); }
    _qstate(cmd)         { return document.queryCommandState(cmd); }
    _qval(cmd)           { return document.queryCommandValue(cmd); }
    _saveRange()         { return saveRange(); }
    _restoreRange(r)     { restoreRange(r); }

    // ── Toolbar ─────────────────────────────────────────────────────────────

    // Returns true if this toolbar group should be shown
    _hasGroup(name) {
      return !this.toolbarGroups || this.toolbarGroups.includes(name);
    }

    _buildToolbar() {
      const tb = el('div', { cls: this.cls.toolbar + ' phx-editor-toolbar-wrap' });

      // Determine row boundaries from toolbarRows
      // Each row in toolbarRows gets its own flex div
      const rows = this.toolbarRows || [null]; // null = single row with all groups
      let rowIdx = 0;
      let currentRow = el('div', { cls: 'phx-editor-toolbar-row' });
      tb.appendChild(currentRow);
      let sep = false;

      const newRow = () => {
        currentRow = el('div', { cls: 'phx-editor-toolbar-row' });
        tb.appendChild(currentRow);
        sep = true;  // prevent sep as first element of a new row
      };
      // Called before each group section — advances to next row if needed
      const maybeNewRow = (groupName) => {
        if (!this.toolbarRows) return;
        const targetRow = this.toolbarRows.findIndex(row => row.includes(groupName));
        if (targetRow > rowIdx) {
          for (let i = rowIdx; i < targetRow; i++) newRow();
          rowIdx = targetRow;
        }
      };
      const addSep = () => {
        if (!sep) { this._sep(currentRow); sep = true; }
      };
      const addBtn = (btn) => { currentRow.appendChild(btn); sep = false; };

      // ── Styles ────────────────────────────────────────────────────────────
      maybeNewRow('styles'); if (this._hasGroup('styles')) {
        this.styleSelect = el('select', { cls: this.cls.select, title: 'Styl odstavce' });
        [
          ['',           'Styl…'],
          ['p',          'Odstavec'],
          ['h1',         'Nadpis 1'],
          ['h2',         'Nadpis 2'],
          ['h3',         'Nadpis 3'],
          ['h4',         'Nadpis 4'],
          ['h5',         'Nadpis 5'],
          ['h6',         'Nadpis 6'],
          ['blockquote', 'Citace'],
          ['pre',        'Blok kódu'],
        ].forEach(([v, t]) => {
          this.styleSelect.appendChild(el('option', { value: v, text: t }));
        });
        this.styleSelect.addEventListener('mousedown', () => { this.savedRange = this._saveRange(); });
        this.styleSelect.addEventListener('change', () => this._applyBlockStyle(this.styleSelect.value));
        addBtn(this.styleSelect);
      } else {
        this.styleSelect = null;
      }

      // ── Format ────────────────────────────────────────────────────────────
      maybeNewRow('format'); if (this._hasGroup('format')) {
        addSep();
        [
          { id:'bold',      icon:'bold',      title:'Tučné (Ctrl+B)',     cmd:'bold'          },
          { id:'italic',    icon:'italic',    title:'Kurzíva (Ctrl+I)',   cmd:'italic'        },
          { id:'underline', icon:'underline', title:'Podtržení (Ctrl+U)', cmd:'underline'     },
          { id:'strike',    icon:'strike',    title:'Přeškrtnutí',        cmd:'strikeThrough' },
        ].forEach(b => {
          addBtn(this._btn(b.icon, b.title, b.id, () => {
            this.pane.focus(); this._exec(b.cmd); this._sync(); this._updateState();
          }));
        });
      }

      // ── Script ────────────────────────────────────────────────────────────
      maybeNewRow('script'); if (this._hasGroup('script')) {
        addSep();
        addBtn(this._btn('sup', 'Horní index', 'sup', () => {
          this.pane.focus(); this._exec('superscript'); this._sync(); this._updateState();
        }));
        addBtn(this._btn('sub', 'Dolní index', 'sub', () => {
          this.pane.focus(); this._exec('subscript'); this._sync(); this._updateState();
        }));
      }

      // ── Font size ─────────────────────────────────────────────────────────
      maybeNewRow('fontsize'); if (this._hasGroup('fontsize')) {
        addSep();
        this.fontSizeSelect = el('select', { cls: this.cls.select, title: 'Velikost písma', 'data-btn-id': 'fontsize' });
        this.fontSizeSelect.style.width = '68px';
        // Placeholder option
        this.fontSizeSelect.appendChild(el('option', { value: '', text: 'Vel…' }));
        // Pixel sizes: common small steps then larger
        const SIZES = [
          8,9,10,11,12,13,14,15,16,17,18,19,20,
          22,24,26,28,30,32,36,40,44,48,56,64,72,96
        ];
        SIZES.forEach(px => {
          this.fontSizeSelect.appendChild(el('option', { value: px + 'px', text: px + 'px' }));
        });
        this.fontSizeSelect.addEventListener('mousedown', () => { this.savedRange = this._saveRange(); });
        this.fontSizeSelect.addEventListener('change', () => {
          const val = this.fontSizeSelect.value;
          if (!val) return;
          this.pane.focus();
          this._restoreRange(this.savedRange);
          // Wrap selection in a span with explicit font-size
          const sel = this._sel();
          if (sel && !sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            const span  = this._el('span');
            span.style.fontSize = val;
            try { range.surroundContents(span); }
            catch(e) {
              // Selection spans multiple elements — use execCommand fallback
              this._exec('fontSize', '7');
              this.pane.querySelectorAll('font[size="7"]').forEach(f => {
                f.removeAttribute('size');
                f.style.fontSize = val;
                // Change tag from <font> to <span>
                const s = this._el('span');
                s.style.fontSize = val;
                while (f.firstChild) s.appendChild(f.firstChild);
                f.replaceWith(s);
              });
            }
          }
          this._sync();
          setTimeout(() => { this.fontSizeSelect.value = ''; }, 50);
        });
        addBtn(this.fontSizeSelect);
      } else {
        this.fontSizeSelect = null;
      }

      // ── Color ─────────────────────────────────────────────────────────────
      maybeNewRow('color'); if (this._hasGroup('color')) {
        addSep();
        this.colorBtn = el('button', { type:'button', cls: this.cls.colorBtn, title:'Barva písma', 'data-btn-id':'fontcolor' });
        this.colorBtn.innerHTML = ICONS.fontcolor;
        this.colorIndicator = el('span', { cls:'phx-editor-color-indicator' });
        this.colorIndicator.style.background = '#e53935';
        this.colorBtn.appendChild(this.colorIndicator);
        this._currentColor = '#e53935';
        this.colorBtn.addEventListener('mousedown', e => e.preventDefault());
        this.colorBtn.addEventListener('click', () => this._showColorPicker());
        addBtn(this.colorBtn);
      } else {
        this.colorBtn = null; this.colorIndicator = null;
      }

      // ── Background color ──────────────────────────────────────────────────
      maybeNewRow('bgcolor'); if (this._hasGroup('bgcolor')) {
        addSep();
        this.bgColorBtn = el('button', { type:'button', cls: this.cls.colorBtn, title:'Barva pozadí', 'data-btn-id':'bgcolor' });
        this.bgColorBtn.innerHTML = ICONS.bgcolor;
        this.bgColorIndicator = el('span', { cls:'phx-editor-color-indicator' });
        this.bgColorIndicator.style.background = '#fdd835';
        this.bgColorBtn.appendChild(this.bgColorIndicator);
        this._currentBgColor = '#fdd835';
        this.bgColorBtn.addEventListener('mousedown', e => e.preventDefault());
        this.bgColorBtn.addEventListener('click', () => this._showBgColorPicker());
        addBtn(this.bgColorBtn);
      } else {
        this.bgColorBtn = null; this.bgColorIndicator = null;
      }

      // ── Align ─────────────────────────────────────────────────────────────
      maybeNewRow('align'); if (this._hasGroup('align')) {
        addSep();
        [
          { id:'alignleft',    icon:'alignleft',    title:'Zarovnat vlevo',   cmd:'justifyLeft'   },
          { id:'aligncenter',  icon:'aligncenter',  title:'Na střed',         cmd:'justifyCenter' },
          { id:'alignright',   icon:'alignright',   title:'Zarovnat vpravo',  cmd:'justifyRight'  },
          { id:'alignjustify', icon:'alignjustify', title:'Do bloku',         cmd:'justifyFull'   },
        ].forEach(b => {
          addBtn(this._btn(b.icon, b.title, b.id, () => {
            this.pane.focus(); this._exec(b.cmd); this._sync(); this._updateState();
          }));
        });
      }

      // ── Case ──────────────────────────────────────────────────────────────
      maybeNewRow('case'); if (this._hasGroup('case')) {
        addSep();
        addBtn(this._btn('lowercase',  'Malá písmena',   'lowercase',  () => this._convertCase('lower')));
        addBtn(this._btn('uppercase',  'VELKÁ PÍSMENA',  'uppercase',  () => this._convertCase('upper')));
        addBtn(this._btn('titlecase',  'Každé Slovo',    'titlecase',  () => this._convertCase('title')));
      }

      // ── Blocks ────────────────────────────────────────────────────────────
      maybeNewRow('blocks'); if (this._hasGroup('blocks')) {
        addSep();
        addBtn(this._btn('blockquote', 'Citace',     'blockquote', () => this._insertBlockquote()));
        addBtn(this._btn('code',       'Inline kód', 'code',       () => this._insertInlineCode()));
        addBtn(this._btn('codeblock',  'Blok kódu',  'codeblock',  () => this._insertCodeBlock()));
      }

      // ── Lists ─────────────────────────────────────────────────────────────
      maybeNewRow('lists'); if (this._hasGroup('lists')) {
        addSep();
        addBtn(this._btn('ul', 'Odrážky',  'ul', () => { this.pane.focus(); this._exec('insertUnorderedList'); this._sync(); }));
        addBtn(this._btn('ol', 'Číslování','ol', () => { this.pane.focus(); this._exec('insertOrderedList');   this._sync(); }));
      }

      // ── Link ──────────────────────────────────────────────────────────────
      maybeNewRow('link'); if (this._hasGroup('link')) {
        addSep();
        addBtn(this._btn('link', 'Vložit / upravit odkaz', 'link', () => this._showLinkPopup()));
        this.unlinkBtn = this._btn('unlink', 'Odebrat odkaz', 'unlink', () => {
          this.pane.focus();
          const sel = this._sel();
          const aEl = sel?.anchorNode && closestEl(sel.anchorNode, 'a');
          if (aEl) {
            const range = this._range();
            range.selectNodeContents(aEl);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          this._exec('unlink');
          this._sync(); this._updateState();
        });
        this.unlinkBtn.style.display = 'none';
        addBtn(this.unlinkBtn);
      } else {
        this.unlinkBtn = null;
      }

      // ── Image ─────────────────────────────────────────────────────────────
      maybeNewRow('image'); if (this._hasGroup('image')) {
        addSep();
        addBtn(this._btn('image', 'Vložit obrázek', 'image', () => this._showImagePopup()));
      }

      // ── Table ─────────────────────────────────────────────────────────────
      maybeNewRow('table'); if (this._hasGroup('table')) {
        addSep();
        addBtn(this._btn('table', 'Vložit tabulku', 'table', () => this._showTablePopup()));
      }

      // ── Emoji ─────────────────────────────────────────────────────────────
      maybeNewRow('emoji'); if (this._hasGroup('emoji')) {
        addSep();
        addBtn(this._btn('emoji', 'Vložit emoji', 'emoji', () => this._showEmojiPicker()));
      }

      // ── Special characters ────────────────────────────────────────────────
      maybeNewRow('specialchar'); if (this._hasGroup('specialchar')) {
        addSep();
        addBtn(this._btn('specialchar', 'Vložit speciální znak', 'specialchar', () => this._showSpecialCharPicker()));
      }

      // ── HR ────────────────────────────────────────────────────────────────
      maybeNewRow('hr'); if (this._hasGroup('hr')) {
        addSep();
        addBtn(this._btn('hr', 'Vložit vodorovnou čáru', 'hr', () => {
          this.pane.focus();
          this._exec('insertHTML', '<hr><p><br></p>');
          this._sync();
        }));
      }

      // ── Clear formatting ──────────────────────────────────────────────────
      maybeNewRow('clearfmt'); if (this._hasGroup('clearfmt')) {
        addSep();
        addBtn(this._btn('clearfmt', 'Vymazat formátování', 'clearfmt', () => {
          this.pane.focus();
          this._exec('removeFormat');
          const sel = this._sel();
          if (sel && !sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            const frag  = range.extractContents();
            const tmp   = this._el('div');
            tmp.appendChild(frag);
            tmp.querySelectorAll('[style],[color],[face]').forEach(n => {
              n.removeAttribute('style'); n.removeAttribute('color'); n.removeAttribute('face');
            });
            tmp.querySelectorAll('span,font').forEach(n => {
              if (!n.attributes.length) n.replaceWith(...n.childNodes);
            });
            range.insertNode(tmp.firstChild || tmp);
          }
          this._sync(); this._updateState();
        }));
      }

      // ── Grid ──────────────────────────────────────────────────────────────
      maybeNewRow('grid'); if (this._hasGroup('grid')) {
        addSep();
        addBtn(this._btn('grid', 'Bootstrap 5 Grid — přidat řádek', 'grid', () => this._showGridPopup()));
      }

      // ── Source ────────────────────────────────────────────────────────────
      maybeNewRow('source'); if (this._hasGroup('source')) {
        addSep();
        addBtn(this._btn('source', 'Zdrojový kód (Ctrl+Shift+S)', 'source', () => this._toggleSource()));
      }

      // ── Fullscreen ────────────────────────────────────────────────────────
      maybeNewRow('fullscreen'); if (this._hasGroup('fullscreen')) {
        addSep();
        this.fullscreenBtn = this._btn('fullscreen', 'Celá obrazovka (F11)', 'fullscreen', () => this._toggleFullscreen());
        addBtn(this.fullscreenBtn);
      } else {
        this.fullscreenBtn = null;
      }

      // Odstranit trailing separátory z každého řádku
      tb.querySelectorAll('.phx-editor-toolbar-row').forEach(row => {
        while (row.lastChild && (row.lastChild.classList?.contains('phx-editor-sep') || row.lastChild.classList?.contains('vr'))) {
          row.lastChild.remove();
        }
      });

      return tb;
    }

    _btn(iconKey, title, id, onClick) {
      const cls = this.cls.btn;
      const btn = el('button', { type: 'button', cls, title });
      btn.innerHTML = ICONS[iconKey] || iconKey;
      btn.dataset.btnId = id;
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', e => { e.preventDefault(); onClick(); });
      return btn;
    }

    _sep(parent) {
      const tag = this.cls.bsModal ? 'div' : 'span';
      parent.appendChild(el(tag, { cls: this.cls.sep }));
    }

    // ── Events ───────────────────────────────────────────────────────────────

    _bindEvents() {
      this.pane.addEventListener('input',   () => this._sync());
      this.pane.addEventListener('keyup',   () => this._updateState());
      this.pane.addEventListener('mouseup', () => { this._updateState(); this._checkFloatContext(); });
      this.pane.addEventListener('click',   e  => this._handleEditorClick(e));
      this.pane.addEventListener('keydown', e  => this._handleKeydown(e));
      this.pane.addEventListener('focus',   () => { activeInstance = this; this._updateState(); });
      this.pane.addEventListener('blur',    () => { this.savedRange = this._saveRange(); });
      this.pane.addEventListener('paste',   e  => this._handlePaste(e));

      // Image click
      this.pane.addEventListener('click', e => {
        if (e.target.tagName === 'IMG' && this.pane.contains(e.target)) {
          this._showImgFloat(e.target);
        } else if (!this.imgFloat?.contains(e.target)) {
          this._hideImgFloat();
        }
      });

      this.srcPane.addEventListener('input', () => { this.input.value = this.srcPane.value; });

      document.addEventListener('click', e => {
        const inGrid  = this.gridFloat?.contains(e.target);
        const inTable = this.tableFloat?.contains(e.target);
        const inImg   = this.imgFloat?.contains(e.target);
        const inPane  = this.w.contains(e.target);
        if (!inGrid  && !inPane) this._hideGridFloat();
        if (!inTable && !inPane) this._hideTableFloat();
        if (!inImg   && !inPane) this._hideImgFloat();
      });

      document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
          e.preventDefault();
          this._toggleSource();
        }
      });
    }

    _handleKeydown(e) {
      // Esc exits fullscreen
      if (e.key === 'Escape' && this.isFullscreen) {
        this._toggleFullscreen();
        return;
      }
      // F11 toggles fullscreen when editor is focused
      if (e.key === 'F11' && this.fullscreenBtn) {
        e.preventDefault();
        this._toggleFullscreen();
        return;
      }
      if (e.key === 'Tab') {
        const anchor = this._sel()?.anchorNode;
        const pre    = closestEl(anchor, 'pre');
        const li     = closestEl(anchor, 'li');
        if (pre) {
          e.preventDefault();
          this._exec('insertText', '    ');
        } else if (li) {
          e.preventDefault();
          this._exec(e.shiftKey ? 'outdent' : 'indent');
          this._sync();
        }
      }
      // Escape from block elements (pre, blockquote) to new paragraph below
      // Shift+Enter at end of block = insert paragraph after it
      if (e.key === 'Enter' && e.shiftKey) {
        const sel = this._sel();
        if (!sel || !sel.rangeCount) return;
        const block = closestEl(sel.anchorNode, 'pre, blockquote');
        if (block && this.pane.contains(block)) {
          // Check cursor is at very end of the block
          const range = sel.getRangeAt(0);
          const endRange = this._range();
          endRange.selectNodeContents(block);
          endRange.collapse(false);
          if (range.compareBoundaryPoints(Range.START_TO_START, endRange) >= 0) {
            e.preventDefault();
            this._insertParagraphAfter(block);
            this._sync();
          }
        }
      }
    }

    _insertParagraphAfter(blockEl) {
      const p = this._el('p');
      p.innerHTML = '<br>';
      blockEl.parentElement.insertBefore(p, blockEl.nextSibling);
      // Move cursor into new p
      const range = this._range();
      range.setStart(p, 0);
      range.collapse(true);
      const sel = this._sel();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    _handleEditorClick(e) {
      this._updateState();

      // Fix: Click below all content → append paragraph and focus there
      if (e.target === this.pane) {
        const lastChild = this.pane.lastElementChild;
        if (lastChild) {
          const rect = lastChild.getBoundingClientRect();
          if (e.clientY > rect.bottom + 4) {
            const tag = lastChild.tagName.toLowerCase();
            if (['pre', 'blockquote', 'div', 'table', 'ul', 'ol'].includes(tag)) {
              e.preventDefault();
              this._insertParagraphAfter(lastChild);
              this._sync();
              return;
            }
          }
        }
      }

      // Grid row context
      const row = closestEl(e.target, '.row');
      if (row && this.pane.contains(row)) {
        this._showGridFloat(row);
      } else if (!this.gridFloat.contains(e.target)) {
        this._hideGridFloat();
      }

      // Table cell context
      const cell = closestEl(e.target, 'td, th');
      if (cell && this.pane.contains(cell)) {
        this._showTableFloat(cell);
      } else if (!this.tableFloat.contains(e.target)) {
        this._hideTableFloat();
      }
    }

    _checkFloatContext() {
      if (!this.gridFloat || !this.tableFloat) return;
      const sel = this._sel();
      if (!sel || !sel.anchorNode) return;

      // Grid row context
      const row = closestEl(sel.anchorNode, '.row');
      if (row && this.pane.contains(row)) {
        this._showGridFloat(row);
      } else if (!this.gridFloat.contains(document.activeElement)) {
        this._hideGridFloat();
      }

      // Table cell context
      const cell = closestEl(sel.anchorNode, 'td, th');
      if (cell && this.pane.contains(cell)) {
        this._showTableFloat(cell);
      } else if (!this.tableFloat.contains(document.activeElement)) {
        this._hideTableFloat();
      }
    }

    // ── Toolbar state ────────────────────────────────────────────────────────

    _updateState() {
      if (this.sourceMode) return;
      ['bold','italic','underline','superscript','subscript',
       'justifyLeft','justifyCenter','justifyRight','justifyFull'].forEach(cmd => {
        const a  = this._qstate(cmd);
        const id = { superscript:'sup', subscript:'sub',
                     justifyLeft:'alignleft', justifyCenter:'aligncenter',
                     justifyRight:'alignright', justifyFull:'alignjustify' }[cmd] || cmd;
        const b  = this.toolbar.querySelector('[data-btn-id="' + id + '"]');
        if (b) b.classList.toggle('active', a);
      });
      const block = (this._qval('formatBlock') || '').toLowerCase();
      this.styleSelect.value = block in {'p':1,'h1':1,'h2':1,'h3':1,'h4':1,'h5':1,'h6':1,'blockquote':1,'pre':1} ? block : '';
      const srcBtn = this.toolbar.querySelector('[data-btn-id="source"]');
      if (srcBtn) srcBtn.classList.toggle('active', this.sourceMode);

      // Background color detection
      if (this.bgColorIndicator) {
        const node = this._sel()?.anchorNode;
        const elem = node?.nodeType === 3 ? node.parentElement : node;
        if (elem && this.pane.contains(elem)) {
          const bg = window.getComputedStyle(elem).backgroundColor;
          // Only show if not transparent/default
          const isTransparent = !bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)';
          this.bgColorIndicator.style.background = isTransparent ? '' : bg;
          this._currentBgColor = isTransparent ? 'transparent' : bg;
        }
      }

      // Font size detection — show current size in select
      if (this.fontSizeSelect) {
        const node = this._sel()?.anchorNode;
        const elem = node?.nodeType === 3 ? node.parentElement : node;
        if (elem && this.pane.contains(elem)) {
          const fs = window.getComputedStyle(elem).fontSize; // e.g. "14px"
          // Try to match one of our options exactly
          const opt = Array.from(this.fontSizeSelect.options).find(o => o.value === fs);
          this.fontSizeSelect.value = opt ? fs : '';
          this.fontSizeSelect.title = fs ? ('Velikost písma: ' + fs) : 'Velikost písma';
        }
      }

      // Show unlink button only when cursor is inside an <a>
      const sel = this._sel();
      const onLink = !!(sel?.anchorNode && closestEl(sel.anchorNode, 'a'));
      if (this.unlinkBtn) {
        this.unlinkBtn.style.display = onLink ? '' : 'none';
        this.unlinkBtn.classList.toggle('active', onLink);
      }
      // Highlight link button when on a link
      const linkBtn = this.toolbar.querySelector('[data-btn-id="link"]');
      if (linkBtn) linkBtn.classList.toggle('active', onLink);
    }

    // ── Sync ─────────────────────────────────────────────────────────────────

    _sync() {
      if (!this.sourceMode) {
        // Zabalit holé textové uzly přímo v pane do <p>
        // Selekci musíme uložit a obnovit — replaceWith() ji ztratí
        const bareNodes = Array.from(this.pane.childNodes).filter(
          n => n.nodeType === 3 && n.textContent.trim()
        );
        if (bareNodes.length) {
          const sel   = window.getSelection();
          const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
          // Save caret offset inside the text node
          const anchorNode   = range?.startContainer;
          const anchorOffset = range?.startOffset ?? 0;
          bareNodes.forEach(node => {
            const p = document.createElement('p');
            node.replaceWith(p);
            p.appendChild(node);
          });
          // Restore caret inside the now-wrapped text node
          if (range && anchorNode) {
            try {
              const newRange = document.createRange();
              newRange.setStart(anchorNode, anchorOffset);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
            } catch (_) {}
          }
        }
        this.input.value = this.pane.innerHTML;
      }
    }

    // ── Block styles ─────────────────────────────────────────────────────────

    _applyBlockStyle(tag) {
      if (!tag) return;
      this.pane.focus();
      this._restoreRange(this.savedRange);
      if (tag === 'pre') {
        this._exec('formatBlock', 'pre');
      } else {
        this._exec('formatBlock', tag);
      }
      this._sync();
    }

    _insertBlockquote() {
      this.pane.focus();
      this._exec('formatBlock', 'blockquote');
      this._sync();
    }

    _insertCodeBlock() {
      this.pane.focus();
      this._exec('formatBlock', 'pre');
      this._sync();
    }

    _insertInlineCode() {
      this.pane.focus();
      const sel = this._sel();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const code = this._el('code');

      if (!sel.isCollapsed) {
        try {
          range.surroundContents(code);
        } catch {
          const frag = range.extractContents();
          code.appendChild(frag);
          range.insertNode(code);
        }
      } else {
        code.textContent = '\u200B';
        range.insertNode(code);
        const r = this._range();
        r.selectNodeContents(code);
        sel.removeAllRanges();
        sel.addRange(r);
      }
      this._sync();
    }

    // ── Source toggle ────────────────────────────────────────────────────────


    // ── Color picker ─────────────────────────────────────────────────────────

    _showColorPicker() {
      this.savedRange = this._saveRange();

      const PRESETS = [
        '#000000','#333333','#555555','#777777','#999999','#bbbbbb','#dddddd','#ffffff',
        '#e53935','#d81b60','#8e24aa','#5e35b1','#3949ab','#1e88e5','#039be5','#00acc1',
        '#00897b','#43a047','#7cb342','#c0ca33','#fdd835','#ffb300','#fb8c00','#f4511e',
        '#6d4c41','#546e7a','#ff8a80','#ff80ab','#ea80fc','#8c9eff','#80d8ff','#a7ffeb',
        '#ccff90','#ffff8d','#ffd180','#ff9e80',
      ];

      this._popup({
        title: 'Barva písma',
        extra: (body) => {
          // Preset swatches
          const grid = el('div', { cls:'phx-editor-color-grid' });
          PRESETS.forEach(hex => {
            const swatch = el('button', { type:'button', cls:'phx-editor-color-swatch', title: hex });
            swatch.style.background = hex;
            if (hex === this._currentColor) swatch.classList.add('selected');
            swatch.addEventListener('mousedown', e => e.preventDefault());
            swatch.addEventListener('click', () => {
              grid.querySelectorAll('.phx-editor-color-swatch').forEach(s => s.classList.remove('selected'));
              swatch.classList.add('selected');
              customInput.value = hex;
              preview.style.color = hex;
            });
            grid.appendChild(swatch);
          });
          body.appendChild(el('p', { cls: this.cls.popupHint, text:'Přednastavené barvy:' }));
          body.appendChild(grid);

          // Custom hex input
          body.appendChild(el('p', { cls: this.cls.popupHint, text:'— nebo vlastní hex / název:' }));
          const row = el('div', { style:{ display:'flex', gap:'8px', alignItems:'center' } });
          const customInput = el('input', { type:'text', cls:'phx-editor-color-custom', placeholder:'#ff0000 nebo red' });
          customInput.style.cssText = 'flex:1;height:34px;border:1.5px solid #d0d5e0;border-radius:6px;padding:0 10px;font-size:13px;font-family:var(--phx-editor-mono)';
          customInput.value = this._currentColor;
          const preview = el('span', { cls:'phx-editor-color-preview', html:'Aa' });
          preview.style.color = this._currentColor;
          customInput.addEventListener('input', () => {
            try { preview.style.color = customInput.value; } catch {}
          });
          row.append(customInput, preview);
          body.appendChild(row);

          // Reset button
          const resetRow = el('div', { style:{ marginTop:'10px' } });
          const resetBtn = el('button', { type:'button', cls: this.cls.popupCancel, text:'Odebrat barvu' });
          resetBtn.addEventListener('mousedown', e => e.preventDefault());
          resetBtn.addEventListener('click', () => {
            this.pane.focus();
            this._restoreRange(this.savedRange);
            this._exec('foreColor', 'inherit');
            this._exec('removeFormat');
            this._currentColor = '#000000';
            if (this.colorIndicator) this.colorIndicator.style.background = this._currentColor;
            this._sync();
            this._closePopup();
          });
          resetRow.appendChild(resetBtn);
          body.appendChild(resetRow);

          // Store ref for confirm
          body._customInput = customInput;
        },
        confirm: 'Použít barvu',
        onConfirm: (vals, popupEl) => {
          const input = popupEl.querySelector('.phx-editor-color-custom') || popupEl.querySelector('input[type=text]');
          const color = input ? input.value.trim() : this._currentColor;
          if (!color) return false;
          this._currentColor = color;
          if (this.colorIndicator) this.colorIndicator.style.background = color;
          this.pane.focus();
          this._restoreRange(this.savedRange);
          this._exec('foreColor', color);
          this._sync();
        }
      });
    }


    // ── Background color picker ───────────────────────────────────────────────

    _showBgColorPicker() {
      this.savedRange = this._saveRange();

      const PRESETS = [
        'transparent',
        '#ffffff','#f8f9fa','#f0f2f8','#e8ebff','#e3f2fd','#e8f5e9','#fff8e1','#fce4ec',
        '#fdd835','#ffb300','#fb8c00','#f4511e','#e53935','#d81b60','#8e24aa','#5e35b1',
        '#3949ab','#1e88e5','#039be5','#00acc1','#00897b','#43a047','#7cb342','#c0ca33',
        '#ff8a80','#ff80ab','#ea80fc','#8c9eff','#80d8ff','#a7ffeb','#ccff90','#ffff8d',
        '#ffd180','#ff9e80','#6d4c41','#546e7a','#333333','#000000',
      ];

      this._popup({
        title: 'Barva pozadí',
        extra: (body) => {
          const grid = el('div', { cls:'phx-editor-color-grid' });
          PRESETS.forEach(hex => {
            const swatch = el('button', { type:'button', cls:'phx-editor-color-swatch', title: hex === 'transparent' ? 'Průhledná' : hex });
            swatch.style.background = hex === 'transparent' ? '' : hex;
            if (hex === 'transparent') {
              swatch.classList.add('phx-editor-swatch-transparent');
            }
            if (hex === this._currentBgColor) swatch.classList.add('selected');
            swatch.addEventListener('mousedown', e => e.preventDefault());
            swatch.addEventListener('click', () => {
              grid.querySelectorAll('.phx-editor-color-swatch').forEach(s => s.classList.remove('selected'));
              swatch.classList.add('selected');
              customInput.value = hex === 'transparent' ? '' : hex;
              preview.style.background = hex;
            });
            grid.appendChild(swatch);
          });
          body.appendChild(el('p', { cls: this.cls.popupHint, text:'Přednastavené barvy:' }));
          body.appendChild(grid);

          body.appendChild(el('p', { cls: this.cls.popupHint, text:'— nebo vlastní hex / název:' }));
          const row = el('div', { style:{ display:'flex', gap:'8px', alignItems:'center' } });
          const customInput = el('input', { type:'text', cls:'phx-editor-color-custom', placeholder:'#ffff00 nebo yellow' });
          customInput.style.cssText = 'flex:1;height:34px;border:1.5px solid #d0d5e0;border-radius:6px;padding:0 10px;font-size:13px;font-family:var(--phx-editor-mono)';
          customInput.value = this._currentBgColor === 'transparent' ? '' : this._currentBgColor;
          const preview = el('span', { cls:'phx-editor-color-preview', html:'Aa' });
          preview.style.background = this._currentBgColor;
          customInput.addEventListener('input', () => {
            try { preview.style.background = customInput.value || 'transparent'; } catch {}
          });
          row.append(customInput, preview);
          body.appendChild(row);

          const resetRow = el('div', { style:{ marginTop:'10px' } });
          const resetBtn = el('button', { type:'button', cls: this.cls.popupCancel, text:'Odebrat pozadí' });
          resetBtn.addEventListener('mousedown', e => e.preventDefault());
          resetBtn.addEventListener('click', () => {
            this._applyBgColor('transparent');
            this._currentBgColor = 'transparent';
            if (this.bgColorIndicator) this.bgColorIndicator.style.background = 'transparent';
            this._sync();
            this._closePopup();
          });
          resetRow.appendChild(resetBtn);
          body.appendChild(resetRow);
        },
        confirm: 'Použít barvu',
        onConfirm: (vals, popupEl) => {
          const input = popupEl.querySelector('.phx-editor-color-custom');
          const color = input?.value.trim() || 'transparent';
          this._currentBgColor = color;
          if (this.bgColorIndicator) this.bgColorIndicator.style.background = color === 'transparent' ? '' : color;
          this._applyBgColor(color);
          this._sync();
        }
      });
    }

    _applyBgColor(color) {
      this.pane.focus();
      this._restoreRange(this.savedRange);
      const sel = this._sel();
      if (!sel || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      // Wrap in span with background-color
      if (color === 'transparent') {
        // Remove existing background spans in selection
        this._exec('removeFormat');
        const frag = range.cloneContents();
        const tmp = this._el('div');
        tmp.appendChild(frag);
        tmp.querySelectorAll('[style]').forEach(n => { n.style.backgroundColor = ''; });
      } else {
        const span = this._el('span');
        span.style.backgroundColor = color;
        try {
          range.surroundContents(span);
        } catch(e) {
          this._exec('hiliteColor', color);
        }
      }
    }

    // ── Emoji picker ─────────────────────────────────────────────────────────

    _showEmojiPicker() {
      this.savedRange = this._saveRange();

      const EMOJI_CATS = [
        { label: '😀 Smajlíci', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👹','👺','👻','👽','👾','🤖'] },
        { label: '👋 Gesta & lidé', emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦶','👂','🦻','👃','👀','👁','👅','👄','💋','💘','💝','💖','💗','💓','💞','💕','💟','❣️','💔','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎'] },
        { label: '🐶 Zvířata', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','��','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐈','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿','🦔'] },
        { label: '🌱 Příroda', emojis: ['🌵','🎋','🌲','🌳','🌴','🌿','☘️','🍀','🎍','🎑','🍃','🍂','🍁','🍄','🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌟','⭐','🌠','☁️','⛅','🌤','⛈','🌩','🌨','❄️','☃️','⛄','🌬','💨','💧','💦','🌊','🌈','🌫','🌀','🌪','🌤'] },
        { label: '🍕 Jídlo', emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶','🫑','🥕','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🍵','🧉','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧊'] },
        { label: '⚽ Sport & aktivity', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🥍','🏑','🥊','🥋','🎽','🛹','🛼','🛷','⛸','🥌','🎿','⛷','🏂','🏋','🤼','🤸','⛹️','🤺','🏇','🧘','🏄','🏊','🤽','🚴','🏆','🥇','🥈','🥉','🏅','🎖','🏵','🎗','🎫','🎟','🎪','🤹','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🎸','🪕','🎻','🎲','♟','🎯','🎳','🎮','🕹','🎰'] },
        { label: '🚗 Doprava', emojis: ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍','🛵','🚲','🛴','🛺','🚁','🛸','✈️','🛩','🚀','🛶','⛵','🚤','🛥','🛳','⛴','🚢','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🏰','🗼','🗽','⛪','🌉','🌃','🌆','🌇','🌉'] },
        { label: '💡 Objekty', emojis: ['💌','🧧','🎀','🎁','🎊','🎉','🎈','🎏','🎐','🎑','🎃','🪔','🎆','🎇','✨','🎋','🎍','🎎','🎄','🎠','🎡','🎢','💈','🎪','🤿','🏹','🎣','🤸','🚴','🏋','🤼','🧸','🪆','🎭','🖼','🎨','🧵','🧶','🪡','🧷','🪢','👑','👒','🎩','🪖','⛑','💄','👛','👜','👝','🎒','🧳','🌂','☂️','🧵','🪡','💎','💍','💎','🔮','🪬','🧿','💈','🔭','🔬','🩺','💊','🩹','🩼','🩻','🪤','🧲','🪜','🧰','🔑','🗝','🔐','🔒','🔓','🚪','🪞','🪟','🛋','🪑','🚽','🪠','🚿','🛁','🪤','🧴','🧷','🧹','🧺','🧻','🪣','🧼','🫧','🧽','🪥','🧯','🛒'] },
        { label: '🔣 Symboly', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☯️','🕉','✡️','🔯','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛','🉑','☢','☣','📴','📳','🈶','🈚','🈸','🈺','🈷','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰','🅱','🆎','🆑','🅾','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯','💹','❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🛗','🈳','🈂','🛂','🛃','🛄','🛅','🚹','🚺','🚼','⚧','🚻','🚮','🎦','📶','🈁','🔣','ℹ️','🔤','🔡','🔠','🆖','🆗','🆙','🆒','🆕','🆓','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔢','#️⃣','*️⃣','⏏️','▶️','⏸','⏹','⏺','⏭','⏮','⏩','⏪','⏫','⏬','◀️','🔼','🔽','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','↪️','↩️','⤴️','⤵️','🔀','🔁','🔂','🔄','🔃','🎵','🎶','➕','➖','➗','✖️','♾','💲','💱','™️','©️','®️','〰️','➰','➿','🔚','🔙','🔛','🔝','🔜','✔️','☑️','🔘','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔷','🔶','🔹','🔸','🔲','🔳','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫','🔈','🔇','🔉','🔊','📢','📣','📯','🔔','🔕','🎵','🎶','💬','💭','🗯'] },
      ];

      this._popup({
        title: 'Vložit emoji',
        extra: (body) => {
          // Category tabs
          const tabBar  = el('div', { cls:'phx-editor-emoji-tabs' });
          const content = el('div', { cls:'phx-editor-emoji-content' });
          let activeCat = 0;

          const renderCat = (idx) => {
            content.innerHTML = '';
            const grid = el('div', { cls:'phx-editor-emoji-grid' });
            EMOJI_CATS[idx].emojis.forEach(emoji => {
              const btn = el('button', { type:'button', cls:'phx-editor-emoji-btn', text: emoji, title: emoji });
              btn.addEventListener('mousedown', e => e.preventDefault());
              btn.addEventListener('click', () => {
                this.pane.focus();
                this._restoreRange(this.savedRange);
                this._exec('insertText', emoji);
                this._sync();
                this._closePopup();
              });
              grid.appendChild(btn);
            });
            content.appendChild(grid);
          };

          EMOJI_CATS.forEach((cat, idx) => {
            const tab = el('button', { type:'button', cls:'phx-editor-emoji-tab', text: cat.label.split(' ')[0] + ' ' });
            tab.title = cat.label;
            if (idx === 0) tab.classList.add('active');
            tab.addEventListener('mousedown', e => e.preventDefault());
            tab.addEventListener('click', () => {
              tabBar.querySelectorAll('.phx-editor-emoji-tab').forEach(t => t.classList.remove('active'));
              tab.classList.add('active');
              activeCat = idx;
              renderCat(idx);
            });
            tabBar.appendChild(tab);
          });

          renderCat(0);
          body.appendChild(tabBar);
          body.appendChild(content);
        },
        confirm: null,   // no confirm button — emoji inserts immediately on click
        onConfirm: () => {}
      });
    }


    // ── Special character picker ──────────────────────────────────────────────

    _showSpecialCharPicker() {
      this.savedRange = this._saveRange();

      const CHAR_CATS = [
        { label: 'Typografie',  chars: [
          ['©','© Copyright'],['®','® Registrovaná ochranná známka'],['™','™ Trademark'],
          ['°','° Stupeň'],['‰','‰ Promile'],['§','§ Paragraf'],['¶','¶ Odstavec'],
          ['†','† Křížek'],['‡','‡ Dvojkřížek'],['•','• Odrážka'],['·','· Střední tečka'],
          ['…','… Výpustka (ellipsis)'],['–','– En pomlčka'],['—','— Em pomlčka'],
          ['‐','‐ Spojovník'],['«','« Guillemet levý'],['»','» Guillemet pravý'],
          ['‹','‹ Jednoduchý guillemet levý'],['›','› Jednoduchý guillemet pravý'],
          ['„','" Uvozovky dolní'],  ['“','" Uvozovky horní levé'],
          ['”','" Uvozovky horní pravé'], ['‘',"' Apostrof levý"],
          ['’',"' Apostrof pravý"], ['´','´ Accent aigu'],
          ['`','` Přízvuk těžký'],['¦','¦ Přerušená svislá čára'],
          ['|','| Svislá čára'],['¡','¡ Vykřičník obrácený'],['¿','¿ Otazník obrácený'],
        ]},
        { label: 'Matematika', chars: [
          ['±','± Plus minus'],['×','× Násobení'],['÷','÷ Dělení'],['=','= Rovná se'],
          ['≠','≠ Nerovná se'],['≈','≈ Přibližně'],['≡','≡ Totožné'],['≤','≤ Menší nebo rovno'],
          ['≥','≥ Větší nebo rovno'],['<','< Menší než'],['>', '> Větší než'],
          ['∞','∞ Nekonečno'],['∑','∑ Suma'],['∏','∏ Součin'],['√','√ Odmocnina'],
          ['∂','∂ Parciální derivace'],['∫','∫ Integrál'],['∆','∆ Delta'],['∇','∇ Nabla'],
          ['π','π Pí'],['μ','μ Mü'],['Ω','Ω Omega'],['α','α Alfa'],['β','β Beta'],
          ['γ','γ Gamma'],['θ','θ Théta'],['λ','λ Lambda'],['σ','σ Sigma'],
          ['φ','φ Fí'],['ψ','ψ Psí'],['ω','ω Omega malé'],
          ['⁰','⁰'],['¹','¹'],['²','²'],['³','³'],['⁴','⁴'],['⁵','⁵'],
          ['½','½'],['⅓','⅓'],['¼','¼'],['¾','¾'],['⅛','⅛'],['⅜','⅜'],['⅝','⅝'],['⅞','⅞'],
          ['‰','‰'],['%','%'],['‱','‱ Na deset tisíc'],
        ]},
        { label: 'Měny', chars: [
          ['€','€ Euro'],['£','£ Libra'],['$','$ Dolar'],['¥','¥ Jen / Juan'],
          ['₹','₹ Rupie'],['₽','₽ Rubl'],['₩','₩ Won'],['₪','₪ Šekel'],
          ['₫','₫ Dong'],['฿','฿ Baht'],['₦','₦ Naira'],['₴','₴ Hřivna'],
          ['₸','₸ Tenge'],['₡','₡ Colón'],['₢','₢ Cruzeiro'],['₣','₣ Franc'],
          ['₤','₤ Lira'],['₥','₥ Mill'],['₧','₧ Peseta'],['₨','₨ Rupie (starý)'],
          ['¢','¢ Cent'],['₿','₿ Bitcoin'],
        ]},
        { label: 'Šipky', chars: [
          ['←','← Šipka vlevo'],['→','→ Šipka vpravo'],['↑','↑ Šipka nahoru'],['↓','↓ Šipka dolů'],
          ['↔','↔ Šipka oboustranná'],['↕','↕ Šipka nahoru/dolů'],
          ['⇐','⇐ Dvojitá vlevo'],['⇒','⇒ Dvojitá vpravo'],['⇑','⇑ Dvojitá nahoru'],['⇓','⇓ Dvojitá dolů'],
          ['⇔','⇔ Dvojitá oboustranná'],['↖','↖ Vlevo nahoru'],['↗','↗ Vpravo nahoru'],
          ['↘','↘ Vpravo dolů'],['↙','↙ Vlevo dolů'],
          ['➔','➔ Tlustá vpravo'],['➜','➜ Kulatá vpravo'],['➡','➡ Tučná vpravo'],
          ['⟵','⟵ Dlouhá vlevo'],['⟶','⟶ Dlouhá vpravo'],['⟷','⟷ Dlouhá oboustranná'],
          ['↺','↺ Dokola vlevo'],['↻','↻ Dokola vpravo'],
          ['▲','▲ Trojúhelník nahoru'],['▼','▼ Trojúhelník dolů'],
          ['◀','◀ Trojúhelník vlevo'],['▶','▶ Trojúhelník vpravo'],
        ]},
        { label: 'Geometrie & tvar', chars: [
          ['■','■ Plný čtverec'],['□','□ Prázdný čtverec'],['▪','▪ Malý plný čtverec'],['▫','▫ Malý prázdný čtverec'],
          ['●','● Plný kruh'],['○','○ Prázdný kruh'],['◉','◉ Přerušený kruh'],['◎','◎ Dvojitý kruh'],
          ['◆','◆ Plný kosočtverec'],['◇','◇ Prázdný kosočtverec'],
          ['★','★ Plná hvězda'],['☆','☆ Prázdná hvězda'],
          ['▶','▶ Trojúhelník vpravo'],['◀','◀ Trojúhelník vlevo'],
          ['▴','▴ Malý trojúhelník nahoru'],['▾','▾ Malý trojúhelník dolů'],
          ['╔','╔'],['╗','╗'],['╚','╚'],['╝','╝'],['║','║'],['═','═'],
          ['┌','┌'],['┐','┐'],['└','└'],['┘','┘'],['│','│'],['─','─'],
          ['├','├'],['┤','┤'],['┬','┬'],['┴','┴'],['┼','┼'],
          ['⬛','⬛'],['⬜','⬜'],['🔲','🔲'],['🔳','🔳'],
        ]},
        { label: 'Diakritika', chars: [
          ['À','À'],['Á','Á'],['Â','Â'],['Ã','Ã'],['Ä','Ä'],['Å','Å'],['Æ','Æ'],['Ç','Ç'],
          ['È','È'],['É','É'],['Ê','Ê'],['Ë','Ë'],['Ì','Ì'],['Í','Í'],['Î','Î'],['Ï','Ï'],
          ['Ð','Ð'],['Ñ','Ñ'],['Ò','Ò'],['Ó','Ó'],['Ô','Ô'],['Õ','Õ'],['Ö','Ö'],['Ø','Ø'],
          ['Ù','Ù'],['Ú','Ú'],['Û','Û'],['Ü','Ü'],['Ý','Ý'],['Þ','Þ'],['ß','ß'],
          ['à','à'],['á','á'],['â','â'],['ã','ã'],['ä','ä'],['å','å'],['æ','æ'],['ç','ç'],
          ['è','è'],['é','é'],['ê','ê'],['ë','ë'],['ì','ì'],['í','í'],['î','î'],['ï','ï'],
          ['ð','ð'],['ñ','ñ'],['ò','ò'],['ó','ó'],['ô','ô'],['õ','õ'],['ö','ö'],['ø','ø'],
          ['ù','ù'],['ú','ú'],['û','û'],['ü','ü'],['ý','ý'],['þ','þ'],['ÿ','ÿ'],
          ['Š','Š'],['š','š'],['Ž','Ž'],['ž','ž'],['Č','Č'],['č','č'],['Ř','Ř'],['ř','ř'],
          ['Ď','Ď'],['ď','ď'],['Ě','Ě'],['ě','ě'],['Ť','Ť'],['ť','ť'],['Ň','Ň'],['ň','ň'],
          ['Ů','Ů'],['ů','ů'],['Ĺ','Ĺ'],['ĺ','ĺ'],['Ľ','Ľ'],['ľ','ľ'],
        ]},
        { label: 'Různé', chars: [
          ['☑','☑ Zaškrtnuto'],['☐','☐ Nezaškrtnuto'],['☒','☒ Křížek'],
          ['✓','✓ Fajfka'],['✔','✔ Tučná fajfka'],['✗','✗ Křížek tenký'],['✘','✘ Křížek tučný'],
          ['♠','♠ Pík'],['♣','♣ Kříž'],['♥','♥ Srdce'],['♦','♦ Káro'],
          ['♩','♩ Nota'],['♪','♪ Osminová nota'],['♫','♫ Dvě noty'],['♬','♬ Čtyři noty'],
          ['☀','☀ Slunce'],['☁','☁ Mrak'],['☂','☂ Déšť'],['☃','☃ Sněhulák'],
          ['☎','☎ Telefon'],['✉','✉ Dopis'],['✂','✂ Nůžky'],['✏','✏ Tužka'],
          ['⏎','⏎ Enter'],['⌘','⌘ Command'],['⌥','⌥ Option'],['⇧','⇧ Shift'],
          ['⌫','⌫ Backspace'],['⎋','⎋ Escape'],['⇥','⇥ Tab'],
          ['&amp;','& Ampersand'],['&lt;','< Menší než (HTML)'],['&gt;','> Větší než (HTML)'],
          ['&nbsp;','  Nezlomitelná mezera'],['&shy;','­ Podmíněný konec řádku'],
        ]},
      ];

      this._popup({
        title: 'Vložit speciální znak',
        extra: (body) => {
          const tabBar  = el('div', { cls:'phx-editor-emoji-tabs phx-editor-sc-tabs' });
          const content = el('div', { cls:'phx-editor-emoji-content phx-editor-sc-content' });
          const hint    = el('div', { cls:'phx-editor-sc-hint', text: 'Najeďte na znak pro popis' });

          const renderCat = (idx) => {
            content.innerHTML = '';
            const grid = el('div', { cls:'phx-editor-sc-grid' });
            CHAR_CATS[idx].chars.forEach(([ch, desc]) => {
              const btn = el('button', { type:'button', cls:'phx-editor-sc-btn', title: desc });
              btn.textContent = ch;
              btn.addEventListener('mouseenter', () => { hint.textContent = desc || ch; });
              btn.addEventListener('mouseleave', () => { hint.textContent = 'Najeďte na znak pro popis'; });
              btn.addEventListener('mousedown', e => e.preventDefault());
              btn.addEventListener('click', () => {
                this.pane.focus();
                this._restoreRange(this.savedRange);
                // For HTML entities use insertHTML, for plain chars use insertText
                if (ch.startsWith('&')) {
                  this._exec('insertHTML', ch);
                } else {
                  this._exec('insertText', ch);
                }
                this._sync();
                this._closePopup();
              });
              grid.appendChild(btn);
            });
            content.appendChild(grid);
          };

          CHAR_CATS.forEach((cat, idx) => {
            const tab = el('button', { type:'button', cls:'phx-editor-sc-tab', text: cat.label });
            if (idx === 0) tab.classList.add('active');
            tab.addEventListener('mousedown', e => e.preventDefault());
            tab.addEventListener('click', () => {
              tabBar.querySelectorAll('.phx-editor-sc-tab').forEach(t => t.classList.remove('active'));
              tab.classList.add('active');
              renderCat(idx);
            });
            tabBar.appendChild(tab);
          });

          renderCat(0);
          body.appendChild(tabBar);
          body.appendChild(content);
          body.appendChild(hint);
        },
        confirm: null,
        onConfirm: () => {}
      });
    }


    // ── Case conversion ──────────────────────────────────────────────────────

    _convertCase(mode) {
      this.pane.focus();
      const sel = this._sel();
      if (!sel || !sel.rangeCount) return;

      // If nothing selected, select the whole current block
      let range = sel.getRangeAt(0);
      if (sel.isCollapsed) {
        const block = closestEl(sel.anchorNode, 'p,h1,h2,h3,h4,h5,h6,li,blockquote,td,th,div');
        if (block && this.pane.contains(block)) {
          range = this._range();
          range.selectNodeContents(block);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }

      // Walk text nodes inside selection and convert
      const frag   = range.cloneContents();
      const walker = this._walker(frag, NodeFilter.SHOW_TEXT);
      const nodes  = [];
      let node;
      while ((node = walker.nextNode())) nodes.push(node);

      nodes.forEach(n => {
        if (mode === 'lower') {
          n.textContent = n.textContent.toLowerCase();
        } else if (mode === 'upper') {
          n.textContent = n.textContent.toUpperCase();
        } else {
          // Title case — capitalize first letter of each word
          n.textContent = n.textContent.replace(/((?:^|[\s\-]))(\p{L})/gu, (m, sp, ch) => sp + ch.toUpperCase());
        }
      });

      range.deleteContents();
      range.insertNode(frag);
      this._sync();
    }

    // ── Fullscreen ───────────────────────────────────────────────────────────

    _toggleFullscreen() {
      this.isFullscreen = !this.isFullscreen;
      this.w.classList.toggle('phx-editor-fullscreen', this.isFullscreen);
      document.body.classList.toggle('phx-editor-fullscreen-open', this.isFullscreen);

      if (this.fullscreenBtn) {
        this.fullscreenBtn.innerHTML = ICONS[this.isFullscreen ? 'exitfullscr' : 'fullscreen'];
        this.fullscreenBtn.title     = this.isFullscreen ? 'Ukončit celou obrazovku (Esc)' : 'Celá obrazovka (F11)';
        this.fullscreenBtn.classList.toggle('active', this.isFullscreen);
      }

      // Remove height constraints in fullscreen, restore after
      if (this.isFullscreen) {
        this.pane.style.minHeight = '';
        this.pane.style.maxHeight = '';
      } else {
        this.pane.style.minHeight = this.minHeight + 'px';
        this.pane.style.maxHeight = this.maxHeight + 'px';
      }
      this.pane.focus();
    }

    _toggleSource() {
      this.sourceMode = !this.sourceMode;
      if (this.sourceMode) {
        this.srcPane.value = this.pane.innerHTML;
        this.pane.style.display    = 'none';
        this.srcPane.style.display = 'block';
        this._hideGridFloat();
        this._hideTableFloat();
      } else {
        this.pane.innerHTML        = this.srcPane.value;
        this.input.value           = this.srcPane.value;
        this.pane.style.display    = 'block';
        this.srcPane.style.display = 'none';
      }
      this._updateState();
    }

    // ── Link popup ───────────────────────────────────────────────────────────

    _showLinkPopup() {
      this.savedRange = this._saveRange();
      const sel   = this._sel();
      const aEl   = sel?.anchorNode ? closestEl(sel.anchorNode, 'a') : null;
      const href  = aEl?.href  || '';
      const tgt   = aEl?.target || '';
      const selTxt = sel?.toString() || '';

      this._popup({
        title: 'Vložit odkaz',
        fields: [
          { id:'lnk-url',  type:'url',    label:'URL',         placeholder:'https://…', value: href },
          { id:'lnk-text', type:'text',   label:'Text odkazu (prázdné = ponechat výběr)', placeholder: selTxt || 'Klikněte sem' },
          { id:'lnk-tgt',  type:'select', label:'Otevřít v',
            options:[['','Stejném okně'],['_blank','Novém okně']], value: tgt },
        ],
        confirm: 'Vložit odkaz',
        onConfirm: (vals) => {
          const url  = vals['lnk-url'].trim();
          const text = vals['lnk-text'].trim();
          const target = vals['lnk-tgt'];
          if (!url) { alert('Zadejte URL.'); return false; }

          this.pane.focus();
          this._restoreRange(this.savedRange);

          if (aEl) {
            // Edit existing
            aEl.href = url;
            aEl.target = target;
          } else if (text) {
            const a = this._el('a');
            a.href = url; if (target) a.target = target;
            a.textContent = text;
            const r = this._sel()?.getRangeAt(0);
            if (r) { r.deleteContents(); r.insertNode(a); }
          } else {
            this._exec('createLink', url);
            if (target) {
              const newA = closestEl(this._sel()?.anchorNode, 'a');
              if (newA) newA.target = target;
            }
          }
          this._sync();
        }
      });
    }

    // ── Image popup ──────────────────────────────────────────────────────────


    // ── Paste handler — auto-upload base64 images ────────────────────────────

    _handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;

      // Check for image items
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          if (this.uploadUrl) {
            // Upload to server — insert placeholder first
            const ph = el('span', { cls:'phx-editor-img-loading', html:'⏳ Nahrávám…' });
            const sel = this._sel();
            if (sel?.rangeCount) sel.getRangeAt(0).insertNode(ph);
            this._sync();

            const fd = new FormData();
            fd.append('file', file);
            fetch(this.uploadUrl, { method:'POST', body:fd })
              .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
              .then(data => {
                if (data.error) throw new Error(data.error);
                const img = this._makeImg(data.url, '', 'img-fluid');
                ph.replaceWith(img);
                this._sync();
              })
              .catch(err => {
                ph.remove();
                // Fallback: insert as base64 with a warning class
                const img = this._makeImg(URL.createObjectURL(file), '', 'img-fluid phx-editor-img-blob');
                const sel2 = this._sel();
                if (sel2?.rangeCount) sel2.getRangeAt(0).insertNode(img);
                this._sync();
                console.warn('[nwv] Upload failed, inserted blob URL:', err.message);
              });
          } else {
            // No upload URL — insert as base64 (user's choice)
            const reader = new FileReader();
            reader.onload = ev => {
              const img = this._makeImg(ev.target.result, '', 'img-fluid');
              const sel = this._sel();
              if (sel?.rangeCount) sel.getRangeAt(0).insertNode(img);
              this._sync();
            };
            reader.readAsDataURL(file);
          }
          return; // handled
        }
      }
    }

    // ── Image floating toolbar ───────────────────────────────────────────────

    _showImgFloat(imgEl) {
      this.activeImg = imgEl;
      this.imgFloat.innerHTML = '';

      // Natural dimensions for aspect ratio
      const natW = imgEl.naturalWidth  || imgEl.width  || 0;
      const natH = imgEl.naturalHeight || imgEl.height || 0;
      const ratio = natH > 0 ? natW / natH : 0;

      // Current displayed dimensions (from style or attributes)
      const curW = parseInt(imgEl.style.width)  || imgEl.width  || '';
      const curH = parseInt(imgEl.style.height) || imgEl.height || '';

      // ── Width field ──────────────────────────────────────────────────────
      const wLabel = el('span', { cls: this.cls.floatLabel, text:'š:' });
      const wInput = el('input', { type:'number', cls: this.cls.floatInput, placeholder:'auto', value: curW || '', title:'Šířka (px)' });
      wInput.min = 1; wInput.max = 9999;

      // ── Height field ─────────────────────────────────────────────────────
      const hLabel = el('span', { cls: this.cls.floatLabel, text:'v:' });
      const hInput = el('input', { type:'number', cls: this.cls.floatInput, placeholder:'auto', value: curH || '', title:'Výška (px)' });
      hInput.min = 1; hInput.max = 9999;

      // ── Lock button ──────────────────────────────────────────────────────
      let locked = true;
      const lockBtn = el('button', { type:'button', cls: this.cls.floatLock, title:'Zachovat poměr stran' });
      lockBtn.innerHTML = '🔒';
      lockBtn.addEventListener('mousedown', e => e.preventDefault());
      lockBtn.addEventListener('click', () => {
        locked = !locked;
        lockBtn.classList.toggle('active', locked);
        lockBtn.innerHTML = locked ? '🔒' : '🔓';
        lockBtn.title = locked ? 'Zachovat poměr stran' : 'Volné rozměry';
      });

      // Propagate dimension changes with aspect ratio locking
      wInput.addEventListener('mousedown', e => e.stopPropagation());
      hInput.addEventListener('mousedown', e => e.stopPropagation());

      wInput.addEventListener('input', () => {
        const w = parseInt(wInput.value);
        if (!isNaN(w) && w > 0) {
          if (locked && ratio > 0) {
            const h = Math.round(w / ratio);
            hInput.value = h;
            imgEl.style.height = h + 'px';
          }
          imgEl.style.width = w + 'px';
          imgEl.removeAttribute('width');
          imgEl.removeAttribute('height');
          this._sync();
        }
      });

      hInput.addEventListener('input', () => {
        const h = parseInt(hInput.value);
        if (!isNaN(h) && h > 0) {
          if (locked && ratio > 0) {
            const w = Math.round(h * ratio);
            wInput.value = w;
            imgEl.style.width = w + 'px';
          }
          imgEl.style.height = h + 'px';
          imgEl.removeAttribute('width');
          imgEl.removeAttribute('height');
          this._sync();
        }
      });

      this._sep(this.imgFloat);

      // ── Alt text ─────────────────────────────────────────────────────────
      const altLabel = el('span', { cls: this.cls.floatLabel, text:'alt:' });
      const altInput = el('input', { type:'text', cls:'phx-editor-img-text-input', placeholder:'Alt text…', value: imgEl.alt || '', title:'Alt text' });
      altInput.addEventListener('mousedown', e => e.stopPropagation());
      altInput.addEventListener('input', () => { imgEl.alt = altInput.value; this._sync(); });

      // ── Title ────────────────────────────────────────────────────────────
      const titleLabel = el('span', { cls: this.cls.floatLabel, text:'title:' });
      const titleInput = el('input', { type:'text', cls: this.cls.floatText, placeholder:'Tooltip…', value: imgEl.title || '', title:'Title (tooltip)' });
      titleInput.addEventListener('mousedown', e => e.stopPropagation());
      titleInput.addEventListener('input', () => { imgEl.title = titleInput.value; this._sync(); });

      this._sep(this.imgFloat);

      // ── Reset size button ─────────────────────────────────────────────────
      const resetBtn = el('button', { type:'button', cls: this.cls.floatBtn, title:'Obnovit původní rozměry' });
      resetBtn.innerHTML = '⟳';
      resetBtn.addEventListener('mousedown', e => e.preventDefault());
      resetBtn.addEventListener('click', () => {
        imgEl.style.width = ''; imgEl.style.height = '';
        imgEl.removeAttribute('width'); imgEl.removeAttribute('height');
        wInput.value = ''; hInput.value = '';
        this._sync();
      });

      // ── Delete button ─────────────────────────────────────────────────────
      const delBtn = el('button', { type:'button', cls: this.bs ? 'btn btn-sm btn-outline-danger' : 'phx-editor-btn danger', title:'Smazat obrázek' });
      delBtn.innerHTML = '✕';
      delBtn.addEventListener('mousedown', e => e.preventDefault());
      delBtn.addEventListener('click', () => { imgEl.remove(); this._hideImgFloat(); this._sync(); });

      // Append all to float bar
      [wLabel, wInput, hLabel, hInput, lockBtn,
       el('div', { cls:'phx-editor-float-sep' }),
       altLabel, altInput, titleLabel, titleInput,
       el('div', { cls:'phx-editor-float-sep' }),
       resetBtn, delBtn
      ].forEach(n => this.imgFloat.appendChild(n));

      // Position below the image
      this._posFloat(this.imgFloat, imgEl);
      this.imgFloat.style.display = 'flex';
      if (this.cls.bsModal) this.imgFloat.classList.remove('d-none');
    }

    _hideImgFloat() {
      this.imgFloat.style.display = 'none';
      if (this.cls.bsModal) this.imgFloat.classList.add('d-none');
      this.activeImg = null;
    }

    _showImagePopup() {
      this.savedRange = this._saveRange();

      this._popup({
        title: 'Vložit obrázek',
        fields: [
          { id:'img-file',  type:'file',   label:'Nahrát soubor', accept:'image/*' },
          { id:'img-url',   type:'url',    label:'— nebo URL obrázku —', placeholder:'https://…' },
          { id:'img-alt',   type:'text',   label:'Alt text (popis)', placeholder:'Popis obrázku…' },
          { id:'img-cls',   type:'text',   label:'CSS třída', placeholder:'img-fluid rounded…', value:'img-fluid' },
        ],
        confirm: 'Vložit obrázek',
        onConfirm: (vals, popupEl) => {
          const fileInput = popupEl.querySelector('#img-file');
          const file = fileInput?.files?.[0];
          const url  = vals['img-url'].trim();
          const alt  = vals['img-alt'].trim();
          const cls  = vals['img-cls'].trim();

          if (!file && !url) { alert('Vyberte soubor nebo zadejte URL.'); return false; }

          this.pane.focus();
          this._restoreRange(this.savedRange);

          if (file) {
            this._uploadAndInsertImage(file, alt, cls);
          } else {
            this._insertImageNode(url, alt, cls);
          }
        }
      });
    }

    _uploadAndInsertImage(file, alt, cls) {
      if (!this.uploadUrl) {
        alert('Upload URL není nastavena. Zavolejte setUploadRoute() na EditorInput.');
        return;
      }
      // Placeholder
      const ph = el('span', { cls:'phx-editor-img-loading', html:'⏳ Nahrávám…' });
      const sel = this._sel();
      if (sel?.rangeCount) sel.getRangeAt(0).insertNode(ph);
      this._sync();

      const fd = new FormData();
      fd.append('file', file);

      fetch(this.uploadUrl, { method:'POST', body:fd })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(data => {
          if (data.error) throw new Error(data.error);
          const img = this._makeImg(data.url, alt, cls);
          ph.replaceWith(img);
          this._sync();
        })
        .catch(err => { ph.remove(); alert('Chyba uploadu: ' + err.message); this._sync(); });
    }

    _insertImageNode(url, alt, cls) {
      const img = this._makeImg(url, alt, cls);
      const sel = this._sel();
      if (sel?.rangeCount) {
        const r = sel.getRangeAt(0);
        r.insertNode(img);
        r.setStartAfter(img); r.collapse(true);
        sel.removeAllRanges(); sel.addRange(r);
      } else {
        this.pane.appendChild(img);
      }
      this._sync();
    }

    _makeImg(url, alt, cls) {
      const img = this._el('img');
      img.src = url;
      img.alt = alt || '';
      img.className = cls || 'img-fluid';
      return img;
    }

    // ── Table popup ──────────────────────────────────────────────────────────

    _showTablePopup() {
      this.savedRange = this._saveRange();
      let selR = 3, selC = 3;

      // Build 8×8 hover picker
      const grid = el('div', { cls:'phx-editor-table-grid' });
      const lbl  = el('div', { cls:'phx-editor-table-size-label', text:'3 × 3' });

      for (let r = 1; r <= 8; r++) {
        for (let c = 1; c <= 8; c++) {
          const cell = el('div', { cls:'phx-editor-table-cell', data:{ r, c } });
          cell.addEventListener('mouseover', () => {
            selR = r; selC = c;
            lbl.textContent = r + ' × ' + c;
            grid.querySelectorAll('.phx-editor-table-cell').forEach(tc =>
              tc.classList.toggle('highlighted',
                +tc.dataset.r <= r && +tc.dataset.c <= c)
            );
          });
          cell.addEventListener('click', () => {
            this._insertTable(selR, selC);
            this._closePopup();
          });
          grid.appendChild(cell);
        }
      }
      // init highlight 3×3
      grid.querySelectorAll('.phx-editor-table-cell').forEach(tc =>
        tc.classList.toggle('highlighted', +tc.dataset.r <= 3 && +tc.dataset.c <= 3)
      );

      this._popup({
        title: 'Vložit tabulku',
        extra: (body) => {
          body.appendChild(el('p', { cls: this.cls.popupHint, text:'Přejeďte nebo klikněte pro výběr velikosti:' }));
          body.appendChild(grid);
          body.appendChild(lbl);
        },
        confirm: 'Vložit',
        onConfirm: () => { this._insertTable(selR, selC); }
      });
    }

    _insertTable(rows, cols) {
      this.pane.focus();
      this._restoreRange(this.savedRange);
      let html = '<table><thead><tr>';
      for (let c = 1; c <= cols; c++) html += '<th>Záhlaví ' + c + '</th>';
      html += '</tr></thead><tbody>';
      for (let r = 1; r < rows; r++) {
        html += '<tr>';
        for (let c = 1; c <= cols; c++) html += '<td>&nbsp;</td>';
        html += '</tr>';
      }
      html += '</tbody></table><p><br></p>';
      this._exec('insertHTML', html);
      this._sync();
    }

    // ── Grid popup ───────────────────────────────────────────────────────────

    _showGridPopup() {
      this.savedRange = this._saveRange();

      // Reactive state
      const state = { cols: [{ size:'auto' }, { size:'auto' }] };

      const preview  = el('div', { cls:'phx-editor-grid-preview' });
      const colsList = el('div', { cls:'phx-editor-grid-cols-list' });

      const sizeOptions = [['auto','auto (col)'], ...Array.from({length:12},(_,i) => [String(i+1), String(i+1)])];

      const renderGrid = () => {
        // Preview bar
        preview.innerHTML = '';
        state.cols.forEach(col => {
          const label = col.size === 'auto' ? 'col' : 'col-' + col.size;
          const pCol = el('div', { cls:'phx-editor-grid-preview-col', text: label });
          if (col.size !== 'auto') {
            pCol.style.flex = col.size;
          }
          preview.appendChild(pCol);
        });

        // Column rows
        colsList.innerHTML = '';
        state.cols.forEach((col, idx) => {
          const row = el('div', { cls:'phx-editor-grid-col-row' });
          const colLabel = el('span', { cls:'col-label', text: 'col ' + (idx+1) });

          const sizeSelect = el('select');
          sizeOptions.forEach(([v, t]) => {
            const o = el('option', { value:v, text:t });
            if (v === col.size) o.selected = true;
            sizeSelect.appendChild(o);
          });
          sizeSelect.addEventListener('change', () => {
            state.cols[idx].size = sizeSelect.value;
            renderGrid();
          });

          const rmBtn = el('button', { type:'button', cls:'phx-editor-grid-col-remove', title:'Odebrat sloupec', html:'&times;' });
          rmBtn.addEventListener('mousedown', e => e.preventDefault());
          rmBtn.addEventListener('click', () => {
            if (state.cols.length > 1) { state.cols.splice(idx, 1); renderGrid(); }
          });

          row.append(colLabel, sizeSelect, rmBtn);
          colsList.appendChild(row);
        });

        // Add button
        const addBtn = el('button', { type:'button', cls:'phx-editor-add-col-btn', html:'+ Přidat sloupec' });
        addBtn.addEventListener('mousedown', e => e.preventDefault());
        addBtn.addEventListener('click', () => {
          if (state.cols.length < 12) { state.cols.push({ size:'auto' }); renderGrid(); }
        });
        colsList.appendChild(addBtn);
      };

      renderGrid();

      this._popup({
        title: 'Bootstrap 5 Grid — nový řádek',
        extra: (body) => {
          body.appendChild(el('p', { cls: this.cls.popupHint, text:'Nakonfigurujte sloupce. Výsledek:' }));
          body.appendChild(preview);
          body.appendChild(colsList);
        },
        confirm: 'Vložit řádek',
        onConfirm: () => {
          this._insertGridRow(state.cols.map(c => c.size));
        }
      });
    }

    _insertGridRow(sizes) {
      this.pane.focus();
      this._restoreRange(this.savedRange);
      let html = '<div class="row">';
      sizes.forEach(size => {
        const cls = size === 'auto' ? 'col' : 'col-' + size;
        html += '<div class="' + cls + '"><p>Obsah sloupce</p></div>';
      });
      html += '</div><p><br></p>';
      this._exec('insertHTML', html);
      this._sync();
    }

    // ── Grid floating toolbar ────────────────────────────────────────────────

    _showGridFloat(rowEl) {
      this.activeRow = rowEl;
      this._buildGridFloat(rowEl);
      this._posFloat(this.gridFloat, rowEl);
      this.gridFloat.style.display = 'flex';
      if (this.cls.bsModal) this.gridFloat.classList.remove('d-none');
    }

    _buildGridFloat(rowEl) {
      this.gridFloat.innerHTML = '';
      const cols = Array.from(rowEl.querySelectorAll(':scope > [class*="col"]'));

      // Label
      this.gridFloat.appendChild(el('span', { cls: this.cls.floatLabel, text:'row:' }));

      const sizeOpts = [
        ['none', '—'],
        ['auto', 'auto'],
        ...Array.from({length:12}, (_, i) => [String(i+1), String(i+1)])
      ];

      cols.forEach((colEl, idx) => {
        // ── Column card ───────────────────────────────────────────────────
        const card = el('div', { cls:'phx-editor-grid-float-col' });

        // Header: "col 1" + ✕
        const header = el('div', { cls:'phx-editor-grid-float-col-header' });
        header.appendChild(el('span', { cls:'phx-editor-grid-float-col-title', text:'col ' + (idx + 1) }));

        const rmBtn = el('button', { type:'button', cls:'rm-col', title:'Odebrat sloupec', html:'&times;' });
        rmBtn.addEventListener('mousedown', e => e.preventDefault());
        rmBtn.addEventListener('click', () => {
          if (cols.length > 1) { colEl.remove(); this._sync(); this._buildGridFloat(rowEl); }
        });
        header.appendChild(rmBtn);
        card.appendChild(header);

        // Breakpoint rows (vertical list)
        const bpList  = el('div', { cls:'phx-editor-grid-float-bps' });
        const bpValues = getBreakpointClasses(colEl);

        BREAKPOINTS.forEach(bp => {
          const row  = el('div', { cls:'phx-editor-grid-float-bp' });
          const lbl  = el('span', { cls:'phx-editor-grid-float-bp-label', text: bp });
          const opts = bp === 'xs'
            ? [['auto','auto'], ...Array.from({length:12}, (_, i) => [String(i+1), String(i+1)])]
            : sizeOpts;

          const sel = el('select');
          opts.forEach(([v, t]) => {
            const o = el('option', { value:v, text:t });
            if (v === bpValues[bp]) o.selected = true;
            sel.appendChild(o);
          });
          if (bpValues[bp] !== 'none') sel.classList.add('active-bp');

          sel.addEventListener('mousedown', e => e.stopPropagation());
          sel.addEventListener('change', () => {
            applyBreakpointClass(colEl, bp, sel.value);
            sel.classList.toggle('active-bp', sel.value !== 'none');
            this._sync();
          });

          row.append(lbl, sel);
          bpList.appendChild(row);
        });

        card.appendChild(bpList);
        this.gridFloat.appendChild(card);
      });

      // ── Separator ──────────────────────────────────────────────────────
      this.gridFloat.appendChild(el('div', { cls:'phx-editor-float-sep' }));

      // ── Actions column ─────────────────────────────────────────────────
      const actions = el('div', { cls:'phx-editor-grid-float-actions' });

      const addColBtn = el('button', { type:'button', cls:'phx-editor-btn', html:'+ sloupec' });
      addColBtn.addEventListener('mousedown', e => e.preventDefault());
      addColBtn.addEventListener('click', () => {
        const newCol = this._el('div');
        newCol.className = 'col';
        newCol.innerHTML = '<p>Obsah</p>';
        rowEl.appendChild(newCol);
        this._sync(); this._buildGridFloat(rowEl);
      });

      const rmRowBtn = el('button', { type:'button', cls:'phx-editor-btn danger', html:'✕ řádek' });
      rmRowBtn.addEventListener('mousedown', e => e.preventDefault());
      rmRowBtn.addEventListener('click', () => {
        rowEl.remove(); this._hideGridFloat(); this._sync();
      });

      actions.append(addColBtn, rmRowBtn);
      this.gridFloat.appendChild(actions);
    }

    _hideGridFloat() {
      this.gridFloat.style.display = 'none';
      if (this.cls.bsModal) this.gridFloat.classList.add('d-none');
      this.activeRow = null;
    }

    // ── Table floating toolbar ────────────────────────────────────────────────

    _showTableFloat(cellEl) {
      const table = closestEl(cellEl, 'table');
      if (!table || !this.pane.contains(table)) return;
      this.activeTable = table;
      this._buildTableFloat(table, cellEl);
      const rect = table.getBoundingClientRect();
      this._posFloat(this.tableFloat, table);
      this.tableFloat.style.display = 'flex';
      if (this.cls.bsModal) this.tableFloat.classList.remove('d-none');
    }

    _buildTableFloat(table, cellEl) {
      this.tableFloat.innerHTML = '';
      const row     = closestEl(cellEl, 'tr');
      const colIdx  = getCellIndex(cellEl);

      const lbl = el('span', { cls: this.cls.floatLabel, text:'tabulka:' });
      this.tableFloat.appendChild(lbl);

      // Row group
      const rowGrp = el('div', { cls:'phx-editor-table-float-group' });
      rowGrp.appendChild(el('span', { cls: this.cls.floatLabel, text:'řádek' }));

      const addRowAbove = el('button', { type:'button', cls:'phx-editor-btn', html:'↑ nad', title:'Vložit řádek nad' });
      addRowAbove.addEventListener('mousedown', e => e.preventDefault());
      addRowAbove.addEventListener('click', () => {
        insertTableRow(table, row, 'above');
        this._sync(); this._buildTableFloat(table, cellEl);
      });

      const addRowBelow = el('button', { type:'button', cls:'phx-editor-btn', html:'↓ pod', title:'Vložit řádek pod' });
      addRowBelow.addEventListener('mousedown', e => e.preventDefault());
      addRowBelow.addEventListener('click', () => {
        insertTableRow(table, row, 'below');
        this._sync(); this._buildTableFloat(table, cellEl);
      });

      const delRow = el('button', { type:'button', cls:'phx-editor-btn danger', html:'✕ řádek', title:'Smazat aktuální řádek' });
      delRow.addEventListener('mousedown', e => e.preventDefault());
      delRow.addEventListener('click', () => {
        const nextCell = table.querySelector('td, th');
        deleteTableRow(row);
        this._sync();
        if (table.querySelectorAll('tr').length === 0) {
          table.remove(); this._hideTableFloat(); return;
        }
        const newCell = table.querySelector('td, th');
        if (newCell) this._buildTableFloat(table, newCell);
      });

      rowGrp.append(addRowAbove, addRowBelow, delRow);
      this.tableFloat.appendChild(rowGrp);
      this.tableFloat.appendChild(el('div', { cls:'phx-editor-float-sep' }));

      // Column group
      const colGrp = el('div', { cls:'phx-editor-table-float-group' });
      colGrp.appendChild(el('span', { cls: this.cls.floatLabel, text:'sloupec' }));

      const addColLeft = el('button', { type:'button', cls:'phx-editor-btn', html:'← vlevo', title:'Vložit sloupec vlevo' });
      addColLeft.addEventListener('mousedown', e => e.preventDefault());
      addColLeft.addEventListener('click', () => {
        insertTableCol(table, colIdx, 'left');
        this._sync(); this._buildTableFloat(table, cellEl);
      });

      const addColRight = el('button', { type:'button', cls:'phx-editor-btn', html:'→ vpravo', title:'Vložit sloupec vpravo' });
      addColRight.addEventListener('mousedown', e => e.preventDefault());
      addColRight.addEventListener('click', () => {
        insertTableCol(table, colIdx, 'right');
        this._sync(); this._buildTableFloat(table, cellEl);
      });

      const delCol = el('button', { type:'button', cls:'phx-editor-btn danger', html:'✕ sloupec', title:'Smazat aktuální sloupec' });
      delCol.addEventListener('mousedown', e => e.preventDefault());
      delCol.addEventListener('click', () => {
        const colCount = getColCount(table);
        if (colCount <= 1) { table.remove(); this._hideTableFloat(); this._sync(); return; }
        deleteTableCol(table, colIdx);
        this._sync();
        const newCell = table.querySelector('td, th');
        if (newCell) this._buildTableFloat(table, newCell);
      });

      colGrp.append(addColLeft, addColRight, delCol);
      this.tableFloat.appendChild(colGrp);
      this.tableFloat.appendChild(el('div', { cls:'phx-editor-float-sep' }));

      // Delete table
      const delTable = el('button', { type:'button', cls:'phx-editor-btn danger', html:'✕ tabulka', title:'Smazat celou tabulku' });
      delTable.addEventListener('mousedown', e => e.preventDefault());
      delTable.addEventListener('click', () => {
        table.remove(); this._hideTableFloat(); this._sync();
      });
      this.tableFloat.appendChild(delTable);
    }

    _hideTableFloat() {
      this.tableFloat.style.display = 'none';
      if (this.cls.bsModal) this.tableFloat.classList.add('d-none');
      this.activeTable = null;
    }

    // ── Popup factory ────────────────────────────────────────────────────────

    _popup({ title, fields, extra, confirm, onConfirm }) {
      this._closePopup();

      // ── Shared field builder ───────────────────────────────────────────────
      const buildField = (f, body, popup) => {
        if (this.bs) {
          const wrap = el('div', { cls: 'mb-3' });
          const lbl  = el('label', { cls: 'form-label fw-semibold small', text: f.label });
          lbl.setAttribute('for', 'phx-editor-' + f.id);
          wrap.appendChild(lbl);
          if (f.type === 'select') {
            const sel = el('select', { id:'phx-editor-'+f.id, cls:'form-select form-select-sm' });
            (f.options||[]).forEach(([v,t]) => { const o=el('option',{value:v,text:t}); if(v===(f.value||''))o.selected=true; sel.appendChild(o); });
            wrap.appendChild(sel);
          } else {
            const inp = el('input', { type:f.type, id:'phx-editor-'+f.id, cls: f.type==='file' ? 'form-control form-control-sm' : 'form-control form-control-sm' });
            if (f.placeholder) inp.placeholder = f.placeholder;
            if (f.value)       inp.value       = f.value;
            if (f.accept)      inp.accept      = f.accept;
            wrap.appendChild(inp);
          }
          body.appendChild(wrap);
        } else {
          const field = el('div', { cls: this.cls.popupField || '' });
          const lbl   = el('label', { text: f.label });
          if (this.cls.popupLabel) lbl.className = this.cls.popupLabel;
          lbl.setAttribute('for', 'phx-editor-' + f.id);
          field.appendChild(lbl);
          if (f.type === 'select') {
            const sel = el('select', { id:'phx-editor-' + f.id });
            if (this.cls.popupSelect) sel.className = this.cls.popupSelect;
            (f.options||[]).forEach(([v,t]) => { const o=el('option',{value:v,text:t}); if(v===(f.value||''))o.selected=true; sel.appendChild(o); });
            field.appendChild(sel);
          } else {
            const inp = el('input', { type:f.type, id:'phx-editor-'+f.id });
            if (this.cls.popupInput && f.type !== 'file') inp.className = this.cls.popupInput;
            if (f.type === 'file' && this.cls.popupInput)  inp.className = this.cls.popupInput;
            if (f.placeholder) inp.placeholder = f.placeholder;
            if (f.value)       inp.value       = f.value;
            if (f.accept)      inp.accept      = f.accept;
            field.appendChild(inp);
          }
          body.appendChild(field);
        }
      };

      const doConfirm = () => {
        const vals = {};
        if (fields) fields.forEach(f => {
          const node = popup.querySelector('#phx-editor-' + f.id);
          vals[f.id] = node ? node.value : '';
        });
        const result = onConfirm(vals, popup);
        if (result !== false) this._closePopup();
      };

      let overlay, popup;

      if (this.bs) {
        // ── Bootstrap modal ────────────────────────────────────────────────
        overlay = el('div', { cls:'modal fade show d-block phx-editor-bs-modal' });
        overlay.style.cssText = 'background:rgba(0,0,0,.5);z-index:1055';
        const dialog  = el('div', { cls:'modal-dialog modal-dialog-centered modal-dialog-scrollable' });
        const content = el('div', { cls:'modal-content' });
        const header  = el('div', { cls:'modal-header py-2' });
        const titleEl = el('h6',  { cls:'modal-title mb-0', html: title });
        const closeX  = el('button', { type:'button', cls:'btn-close', 'aria-label':'Zavřít' });
        closeX.addEventListener('click', () => this._closePopup());
        header.append(titleEl, closeX);

        const body = el('div', { cls:'modal-body' });
        if (fields) fields.forEach(f => buildField(f, body));
        if (extra)  extra(body);

        const footer    = el('div', { cls:'modal-footer py-2' });
        const cancelBtn = el('button', { type:'button', cls:'btn btn-sm btn-secondary', text: confirm===null ? 'Zavřít' : 'Zrušit' });
        cancelBtn.addEventListener('click', () => this._closePopup());
        footer.appendChild(cancelBtn);
        if (confirm !== null) {
          const confirmBtn = el('button', { type:'button', cls:'btn btn-sm btn-primary', text: confirm || 'OK' });
          confirmBtn.addEventListener('click', doConfirm);
          footer.appendChild(confirmBtn);
        }

        content.append(header, body, footer);
        dialog.appendChild(content);
        overlay.appendChild(dialog);
        popup = content;   // querySelector target for field lookup

        overlay.addEventListener('click', e => { if (e.target === overlay) this._closePopup(); });
        content.addEventListener('keydown', e => {
          if (e.key === 'Escape') this._closePopup();
          if (e.key === 'Enter' && confirm !== null && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); doConfirm(); }
        });

      } else {
        // ── Custom NWV popup ───────────────────────────────────────────────
        overlay = el('div', { cls: this.cls.popupOverlay || 'phx-editor-popup-overlay' });
        popup   = el('div', { cls: this.cls.popup || 'phx-editor-popup' });
        const titleEl = el('div', { cls: this.cls.popupTitle || 'phx-editor-popup-title', html: title });
        popup.appendChild(titleEl);

        const body = el('div');
        if (fields) fields.forEach(f => buildField(f, body));
        if (extra)  extra(body);
        popup.appendChild(body);

        const actions   = el('div', { cls: this.cls.popupActions || 'phx-editor-popup-actions' });
        const cancelBtn = el('button', { type:'button', cls: this.cls.popupCancel, text: confirm===null ? 'Zavřít' : 'Zrušit' });
        cancelBtn.addEventListener('click', () => this._closePopup());
        overlay.addEventListener('click', e => { if (e.target === overlay) this._closePopup(); });
        popup.addEventListener('keydown', e => {
          if (e.key === 'Escape') this._closePopup();
          if (e.key === 'Enter' && confirm !== null && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); doConfirm(); }
        });
        actions.append(cancelBtn);
        if (confirm !== null) {
          const confirmBtn = el('button', { type:'button', cls: this.cls.popupConfirm, text: confirm||'OK' });
          confirmBtn.addEventListener('click', doConfirm);
          actions.appendChild(confirmBtn);
        }
        popup.appendChild(actions);
        overlay.appendChild(popup);

        // Copy CSS vars to popup since overlay is on body (outside wrapper)
        const wStyles = getComputedStyle(this.w);
        ['--phx-editor-popup-bg','--phx-editor-popup-shad','--phx-editor-accent','--phx-editor-font','--phx-editor-mono',
         '--phx-editor-tb-bg','--phx-editor-tb-text','--phx-editor-ed-border','--phx-editor-radius','--phx-editor-danger',
         '--phx-editor-tb-btn','--phx-editor-tb-hover','--phx-editor-tb-active','--phx-editor-tb-sep',
         '--phx-editor-ed-bg','--phx-editor-ed-text'].forEach(v => {
          const val = wStyles.getPropertyValue(v).trim();
          if (val) popup.style.setProperty(v, val);
        });
      }

      document.body.appendChild(overlay);
      this.overlay = overlay;

      // Focus first input
      setTimeout(() => { const fi = overlay.querySelector('input:not([type=file]),select'); if (fi) fi.focus(); }, 80);
    }

    _closePopup() {
      if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    }

    // ── Widgets ──────────────────────────────────────────────────────────────

    /**
     * Insert an atomic, non-editable widget placeholder at the caret.
     * Server-side, parse `[data-widget][data-id]` in the saved HTML and
     * replace each match with the real rendered widget.
     *
     * @param {string}        type   Widget identifier, e.g. "poll" — becomes data-widget.
     * @param {string|number} id     Widget id, e.g. 5 — becomes data-id.
     * @param {string}        [label]  Text shown inside the placeholder (defaults to "type #id").
     */
    insertWidget(type, id, label) {
      this.pane.focus();
      this._restoreRange(this.savedRange);

      const node = el('div', {
        cls: this.cls.widget || 'phx-editor-widget',
        contenteditable: 'false',
        data: { widget: type, id: id },
        text: label || `${type} #${id}`,
      });

      const sel   = this._sel();
      const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;

      if (range && this.pane.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(node);
      } else {
        this.pane.appendChild(node);
      }

      // A contenteditable="false" node can't hold the caret — land it in an
      // editable text spot right after the widget so typing can continue.
      let after = node.nextSibling;
      if (!after || after.nodeType !== 3) {
        after = document.createTextNode(' ');
        node.after(after);
      }
      const newRange = document.createRange();
      newRange.setStart(after, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      this._sync();
      this._updateState();
    }
  }

  // =========================================================================
  // Init
  // =========================================================================

  function initAll(root) {
    root.querySelectorAll('.phx-editor-wrapper:not([data-phx-editor-init])').forEach(w => {
      w.dataset.phxEditorInit = '1';
      new PhloxEditor(w);
    });
  }

  // Standard page load
  document.addEventListener('DOMContentLoaded', () => initAll(document));

  // Naja 3.x
  if (window.naja) {
    window.naja.addEventListener('complete', () => initAll(document));
  }

  // MutationObserver — catches snippets injected after load (Naja, htmx, custom AJAX)
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) initAll(/** @type {Element} */ (node));
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Expose for manual use
  global.PhloxEditor = {
    init: initAll,
    PhloxEditor,
    instances,

    /**
     * Insert a custom widget placeholder into an editor from outside code
     * (e.g. a CMS "browse widgets" panel with an Insert button).
     *
     * @param {string}        type       Widget identifier, e.g. "poll".
     * @param {string|number} id         Widget id, e.g. 5.
     * @param {string}        [label]    Text shown inside the placeholder.
     * @param {string}        [fieldName]  Target a specific editor by its form field
     *                                     name (data-name). Defaults to the last
     *                                     focused editor on the page.
     * @returns {boolean} Whether a target editor instance was found.
     */
    insertWidget(type, id, label, fieldName) {
      const instance = fieldName ? instances.get(fieldName) : activeInstance;
      if (!instance) {
        console.warn('PhloxEditor.insertWidget(): no target editor instance found.');
        return false;
      }
      instance.insertWidget(type, id, label);
      return true;
    },
  };

}(window));
