/*!
 * The editor as an ES module, for bundlers (Vite, esbuild…):
 *
 *   import { PhloxEditor, autoInit } from '@phloxcz/forms-editor';
 *   import '@phloxcz/forms-editor/wysiwyg.css';
 *
 * wysiwyg.js stays a plain script for pages without a bundler; this file only takes what it puts on window.
 */
import './wysiwyg.js';

const api = window.PhloxEditor;

export const {
  PhloxEditor, init, destroy, isDirty, hookNaja, autoInit, insertWidget, instances, themes, normalizeHtml, cleanPastedHtml,
} = api;
export default api;
