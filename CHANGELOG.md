# Changelog

All notable changes to this project will be documented in this file.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] – 2026-11-14

### Fixed
- **Order of toolbar groups:** the groups follow the order of the `toolbar` option (`'lists,format'` shows lists first), also in more rows (`'format,lists|align'`); before, they were in a fixed built-in order and a row break came with the first group of the next row

## [0.2.0] – 2026-11-14

### Added
- **Use from JS and bundlers:** `new PhloxEditor(wrapper, options)` takes the settings as options (name, value, toolbar, theme, minHeight, maxHeight, contentClass, colorScheme, uploadUrl, variables, widgets…) instead of the `data-*` attributes; the built-in themes `default` and `bootstrap` are in JS too, so no PHP is needed. `assets/index.mjs` is an ES module over the plain script, with types in `assets/index.d.ts` and a `package.json` (`@phloxcz/forms-editor`)
- `autoInit(false)`: editors only made by `new PhloxEditor()`, the page is not watched by the `MutationObserver` (for applications that render the page themselves)
- `phx-editor:change` event on the wrapper (`detail.value`), `getValue()`, `setValue(html)`, `insertText(text)`
- `upload` option: a function that uploads an image file and returns its URL, instead of `uploadUrl`; `inlineImages: false` inserts no base64 image when the upload fails
- `placeholder` option
- **Normalized value:** the stored HTML is the same in every browser (`<strong>`, `<em>`, `<s>`, colours as styles, no empty spans, neighbours merged, an empty editor is `''`); `normalizeHtml()` exported
- **Cleaned paste:** HTML pasted from Word, Google Docs and web pages loses scripts, comments, Mso classes, fonts, margins, event handlers and `javascript:` links; `cleanPastedHtml()` exported

### Fixed
- **File from the "Insert image" dialog was never inserted:** the dialog looked for the file input as `#img-file`, the field is `#phx-editor-img-file`
- **Toolbar without the styles group** threw on every caret move (`styleSelect` was null)
- **Toolbar without its first groups** (e.g. only `format, lists`) started with a separator
- **Without `execCommand`** (jsdom in tests) the editor could not be created; the commands are now optional calls
- An image still being uploaded ("⏳ Nahrávám…") was part of the stored value

## [0.1.10] – 2026-10-15

### Added
- Widgets: `description` (shown under the label in the picker) and `settings` (the application's own per-type data, passed untouched in the `phx-editor:widget` event as `detail.widget.settings`)

## [0.1.9] – 2026-10-14

### Fixed
- **Popups inside a Bootstrap modal:** the modal's focus trap kept stealing focus from popups appended to `<body>`; a popup is now appended inside the closest `.modal`

## [0.1.8] – 2026-10-13

### Fixed
- The caret position saved before a long detour (the widget settings panel) is no longer overwritten when the pane loses focus with the selection elsewhere, so `insertWidget()` inserts at the caret, not at the end
- Bootstrap and Tailwind themes no longer follow the OS colour scheme (`data-color-scheme` is `light` for them); the Bootstrap toolbar follows an explicit `data-bs-theme="dark"` on an ancestor

## [0.1.7] – 2026-10-13

### Added
- **`btnGroup` theme key:** each toolbar button-group (the buttons between two separators) is now wrapped in its own `<span data-phx-toolbar-group>`, styled via the new `btnGroup` class map key. Purely structural by default (no visual change out of the box) — lets a host page style button clusters (e.g. as pills/segmented controls) independently of individual buttons or separators, without touching `wysiwyg.js`

### Changed
- The Bootstrap theme keeps the toolbar's own look (`phx-editor-btn`) instead of `btn-outline-secondary`; only the card around it, the editor pane and the popups are Bootstrap-flavoured

## [0.1.6] – 2026-10-12

### Added
- **Custom widgets:** `EditorInput::setWidgets()` adds a picker to the toolbar; `window.PhloxEditor.insertWidget(type, data, label, fieldName?)` inserts an atomic, non-editable `<div data-widget data-*>` placeholder at the caret, for CMS widgets (polls, galleries, embeds) resolved server-side after sanitization. Clicking a placeholder asks the application to edit it (`phx-editor:widget` event), previews can be rendered by the server
- `widget` theme key for styling the placeholder in `default` / `bootstrap` / `tailwind` presets

## [0.1.5] – 2026-10-11

### Added
- **Editors in AJAX snippets:** editors in a replaced snippet are destroyed and made again in the new content (Naja hooked automatically, `hookNaja()`, a `MutationObserver` for other libraries); `destroy()` on an instance and `PhloxEditor.destroy(root)`
- Unsaved changes: `PhloxEditor.isDirty(root?)`, `instance.isDirty()`, `instance.markClean()`

## [0.1.4] – 2026-10-10

### Fixed
- PHPStan errors in `EditorInput::setVariables()`; the variable format is checked for `%s` before the variables are read

## [0.1.3] – 2026-10-10

### Added
- **Variables:** `EditorInput::setVariables()` — `{{ set.variable }}` placeholders shown as chips, inserted from the toolbar, the application fills in the values

## [0.1.2] – 2026-09-18

### Fixed
- **Inconsistent image-insert fallback:** unified image insertion (paste and the "Insert image" dialog's file picker) around one rule: upload when `uploadUrl` is configured, otherwise inline as base64. Previously the dialog's file picker refused to insert anything without `uploadUrl` (alert only) and showed a bare error alert with no image on upload failure, instead of falling back to base64 like the paste handler.

## [0.1.1] – 2026-09-18

### Fixed
- **Pasted image lost on save when upload fails:** when an image is pasted and `uploadUrl` is configured but the upload request fails, the fallback inserted a `blob:` object URL instead of a persistable `data:` URL. `blob:` URLs only live in the browser tab's memory, so the image silently disappeared after saving/reloading. The fallback now reads the file via `FileReader.readAsDataURL()` and inlines it as base64, matching the existing no-`uploadUrl` behavior.

## [0.1.0] – 2026-07-25

### Added
- `EditorInput` — Nette Form control (`BaseControl`) with `addEditor()` extension method
- `EditorExtension` — Nette DI extension for zero-config registration
- `ImageUploadTrait` — Presenter trait for image upload handler
- **Text formatting:** bold, italic, underline, strikethrough, superscript, subscript
- **Block styles:** paragraph, H1–H6, blockquote, code block
- **Inline code** wrapping
- **Lists:** unordered and ordered
- **Table builder:** visual 8×8 cell picker
- **Link dialog:** URL, display text, target window
- **Image dialog:** file upload (via Nette handler) or direct URL, alt text, CSS class, floating resize toolbar
- **Bootstrap 5.3 Grid builder:** visual row/column configurator with live preview and floating column toolbar
- **Font size, text color and background color** pickers
- **Emoji picker** and **special character picker**
- **Source code view:** toggle between WYSIWYG and raw HTML textarea
- **Fullscreen mode**
- **Themes:** built-in `default`, `bootstrap` and `tailwind` presets, plus per-class CSS overrides
- **Configurable toolbar:** pick which groups to show, optionally split across multiple rows
- **Keyboard shortcuts:** Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Shift+S, Tab inside `<pre>`
- Zero npm/bundler dependencies — pure vanilla JS + CSS
- Full demo page (`demo/index.html`)
- PHP **8.4+**

[0.2.1]: https://github.com/phloxcz/forms-editor/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/phloxcz/forms-editor/compare/v0.1.10...v0.2.0
[0.1.10]: https://github.com/phloxcz/forms-editor/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/phloxcz/forms-editor/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/phloxcz/forms-editor/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/phloxcz/forms-editor/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/phloxcz/forms-editor/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/phloxcz/forms-editor/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/phloxcz/forms-editor/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/phloxcz/forms-editor/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/phloxcz/forms-editor/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/phloxcz/forms-editor/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/phloxcz/forms-editor/releases/tag/v0.1.0
