/** Types of the editor for TypeScript, see index.mjs. */

export type ThemeClasses = Record<string, string | boolean>;

export interface EditorVariable { ref: string; label: string; group?: string }
export interface EditorWidget {
  type: string; label: string; group?: string; icon?: string; block?: boolean; description?: string; settings?: object;
}

export interface EditorOptions {
  /** The name of the hidden form field. */
  name?: string;
  /** The HTML the editor starts with. */
  value?: string;
  /** Groups of buttons: 'format,lists|link,image' (rows by |) or [['format', 'lists'], ['link', 'image']]. */
  toolbar?: string | string[] | string[][];
  minHeight?: number;
  maxHeight?: number;
  /** Classes of the editable area, e.g. 'prose'. */
  contentClass?: string;
  /** A preset or a partial map of classes over the default one. */
  theme?: 'default' | 'bootstrap' | ThemeClasses;
  colorScheme?: 'light' | 'dark' | 'auto';
  /** An image file is sent there as `file` in a POST, the answer is { url } or { error }. */
  uploadUrl?: string;
  /** Uploads an image file and returns its URL; instead of uploadUrl. */
  upload?: (file: File) => Promise<string>;
  /** false: an image that cannot be uploaded is not inserted as base64. Default true. */
  inlineImages?: boolean;
  /** Text shown in the empty editor. */
  placeholder?: string;
  variables?: EditorVariable[] | null;
  variableFormat?: string;
  widgets?: EditorWidget[] | null;
  widgetPreviewUrl?: string;
  /** The toolbar only while the editor has the focus, floating over the page above it; for narrow places. */
  floatingToolbar?: boolean;
}

export class PhloxEditor {
  constructor(wrapper: HTMLElement, options?: EditorOptions);
  /** The stored HTML. */
  getValue(): string;
  /** New content; no phx-editor:change event. */
  setValue(html: string): void;
  /** Text at the caret, or where it was when the editor lost focus. */
  insertText(text: string): void;
  insertWidget(type: string, data: object | string | number, label?: string): void;
  isDirty(): boolean;
  markClean(): void;
  destroy(): void;
}

/** Fired on the wrapper when the user changes the content. */
export type EditorChangeEvent = CustomEvent<{ value: string }>;

export function init(root?: ParentNode): void;
export function destroy(root?: ParentNode): void;
export function isDirty(root?: ParentNode): boolean;
export function hookNaja(naja: unknown): void;
/** false: editors are made only by new PhloxEditor() and the page is not watched. */
export function autoInit(enabled: boolean): void;
export function insertWidget(type: string, data: object | string | number, label?: string, fieldName?: string): boolean;
export const instances: Map<string, PhloxEditor>;
export const themes: Record<'default' | 'bootstrap', ThemeClasses>;
/** The same HTML in every browser: <strong>, <em>, <s>, colours as styles…; changes root in place. */
export function normalizeHtml<T extends Element>(root: T): T;
/** Pasted HTML without scripts, comments, Mso classes, fonts and event handlers. */
export function cleanPastedHtml(html: string): string;

declare const api: {
  PhloxEditor: typeof PhloxEditor; init: typeof init; destroy: typeof destroy; isDirty: typeof isDirty;
  hookNaja: typeof hookNaja; autoInit: typeof autoInit; insertWidget: typeof insertWidget; instances: typeof instances;
  themes: typeof themes; normalizeHtml: typeof normalizeHtml; cleanPastedHtml: typeof cleanPastedHtml;
};
export default api;
