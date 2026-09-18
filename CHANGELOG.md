# Changelog

All notable changes to this project will be documented in this file.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Custom widget insertion:** `window.PhloxEditor.insertWidget(type, id, label, fieldName?)` inserts an atomic, non-editable `<div data-widget data-id>` placeholder at the caret, for embedding CMS widgets (polls, embeds, dynamic blocks) that get resolved server-side after sanitization
- `widget` theme key for styling the placeholder in `default` / `bootstrap` / `tailwind` presets

### Fixed
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
