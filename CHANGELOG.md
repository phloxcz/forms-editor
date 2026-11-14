# Changelog

All notable changes to this project will be documented in this file.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] – 2026-11-14

### Added
- **Use from JS and bundlers:** `new PhloxEditor(wrapper, options)` takes the settings as options (name, value, toolbar, theme, minHeight, maxHeight, contentClass, colorScheme, uploadUrl, variables, widgets…) instead of the `data-*` attributes; the built-in themes `default` and `bootstrap` are in JS too, so no PHP is needed. `assets/index.mjs` is an ES module over the plain script, with types in `assets/index.d.ts` and a `package.json` (`@phloxcz/forms-editor`)
- `autoInit(false)`: editors only made by `new PhloxEditor()`, the page is not watched by the `MutationObserver` (for applications that render the page themselves)
- `phx-editor:change` event on the wrapper (`detail.value`), `getValue()`, `setValue(html)`, `insertText(text)`
- `upload` option: a function that uploads an image file and returns its URL, instead of `uploadUrl`; `inlineImages: false` inserts no base64 image when the upload fails
- `placeholder` option
- **Normalized value:** the stored HTML is the same in every browser (`<strong>`, `<em>`, `<s>`, colours as styles, no empty spans, neighbours merged, an empty editor is `''`); `normalizeHtml()` exported
- **Cleaned paste:** HTML pasted from Word, Google Docs and web pages loses scripts, comments, Mso classes, fonts, margins, event handlers and `javascript:` links; `cleanPastedHtml()` exported
- **Custom widget insertion:** `window.PhloxEditor.insertWidget(type, id, label, fieldName?)` inserts an atomic, non-editable `<div data-widget data-id>` placeholder at the caret, for embedding CMS widgets (polls, embeds, dynamic blocks) that get resolved server-side after sanitization
- `widget` theme key for styling the placeholder in `default` / `bootstrap` / `tailwind` presets
- **`btnGroup` theme key:** each toolbar button-group (the buttons between two separators) is now wrapped in its own `<span data-phx-toolbar-group>`, styled via the new `btnGroup` class map key. Purely structural by default (no visual change out of the box) — lets a host page style button clusters (e.g. as pills/segmented controls) independently of individual buttons or separators, without touching `wysiwyg.js`

### Fixed
- **File from the "Insert image" dialog was never inserted:** the dialog looked for the file input as `#img-file`, the field is `#phx-editor-img-file`
- **Toolbar without the styles group** threw on every caret move (`styleSelect` was null)
- **Toolbar without its first groups** (e.g. only `format, lists`) started with a separator
- **Without `execCommand`** (jsdom in tests) the editor could not be created; the commands are now optional calls
- An image still being uploaded ("⏳ Nahrávám…") was part of the stored value
- **Pasted image lost on save when upload fails:** when an image is pasted and `uploadUrl` is configured but the upload request fails, the fallback inserted a `blob:` object URL instead of a persistable `data:` URL. `blob:` URLs only live in the browser tab's memory, so the image silently disappeared after saving/reloading. The fallback now reads the file via `FileReader.readAsDataURL()` and inlines it as base64, matching the existing no-`uploadUrl` behavior.
- **Inconsistent image-insert fallback:** unified image insertion (paste and the "Insert image" dialog's file picker) around one rule: upload when `uploadUrl` is configured, otherwise inline as base64. Previously the dialog's file picker refused to insert anything without `uploadUrl` (alert only) and showed a bare error alert with no image on upload failure, instead of falling back to base64 like the paste handler.

## [1.0.0] – 2026-07-25

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

[Unreleased]: https://github.com/phloxcz/forms-editor/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/phloxcz/forms-editor/releases/tag/v1.0.0
