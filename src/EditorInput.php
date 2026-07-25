<?php

declare(strict_types=1);

namespace Phlox\Forms\Editor;

use Nette\Forms\Controls\BaseControl;
use Nette\Forms\Container;
use Nette\Forms\Form;
use Nette\Utils\Html;

/**
 * WYSIWYG editor form control for Nette Framework.
 *
 * Basic usage:
 *   $form->addEditor('content', 'Obsah')
 *        ->setUploadRoute($this->link('Editor:upload'));
 *
 * Configurable toolbar:
 *   $form->addEditor('perex', 'Perex')
 *        ->setToolbar([
 *            EditorInput::TB_STYLES,
 *            EditorInput::TB_FORMAT,
 *            EditorInput::TB_ALIGN,
 *            EditorInput::TB_LINK,
 *        ])
 *        ->setMinHeight(120);
 *
 * Full toolbar (default):
 *   ->setToolbar(EditorInput::TB_ALL)
 *
 * Minimal toolbar:
 *   ->setToolbar(EditorInput::TB_MINIMAL)
 *
 * Bootstrap 5 theme:
 *   ->setTheme(EditorInput::THEME_BOOTSTRAP)
 *
 * Tailwind theme:
 *   ->setTheme(EditorInput::THEME_TAILWIND)
 *
 * Custom / partial override (merged over default):
 *   ->setTheme([
 *       'btn'          => 'my-btn px-2',
 *       'popupConfirm' => 'bg-blue-600 text-white rounded px-3 py-1',
 *   ])
 */
class EditorInput extends BaseControl
{
    // ── Theme constants ──────────────────────────────────────────────────────

    /** Built-in phx-editor-* CSS (default) */
    public const THEME_DEFAULT   = 'default';

    /** Bootstrap 5 — buttons use .btn, popups are BS modals, inputs .form-control */
    public const THEME_BOOTSTRAP = 'bootstrap';

    /** Tailwind CSS — full utility-class map with dark: variants */
    public const THEME_TAILWIND  = 'tailwind';

    // ── Toolbar group constants ──────────────────────────────────────────────

    /** Block style selector (paragraph, H1–H6, blockquote, pre) */
    public const TB_STYLES      = 'styles';
    /** Bold, italic, underline, strikethrough */
    public const TB_FORMAT      = 'format';
    /** Superscript, subscript */
    public const TB_SCRIPT      = 'script';
    /** Font size selector */
    public const TB_FONTSIZE    = 'fontsize';
    /** Font colour picker */
    public const TB_COLOR       = 'color';
    /** Background colour picker */
    public const TB_BGCOLOR     = 'bgcolor';
    /** Text alignment */
    public const TB_ALIGN       = 'align';
    /** Case conversion */
    public const TB_CASE        = 'case';
    /** Blockquote, inline code, code block */
    public const TB_BLOCKS      = 'blocks';
    /** Unordered and ordered lists */
    public const TB_LISTS       = 'lists';
    /** Link insert / remove */
    public const TB_LINK        = 'link';
    /** Image upload / insert */
    public const TB_IMAGE       = 'image';
    /** Table builder */
    public const TB_TABLE       = 'table';
    /** Emoji picker */
    public const TB_EMOJI       = 'emoji';
    /** Special character picker */
    public const TB_SPECIALCHAR = 'specialchar';
    /** Horizontal rule */
    public const TB_HR          = 'hr';
    /** Clear formatting */
    public const TB_CLEARFMT    = 'clearfmt';
    /** Bootstrap 5.3 Grid builder */
    public const TB_GRID        = 'grid';
    /** Source code view toggle */
    public const TB_SOURCE      = 'source';
    /** Fullscreen toggle */
    public const TB_FULLSCREEN  = 'fullscreen';

    /** All toolbar groups in default order */
    public const TB_ALL = [
        self::TB_STYLES,
        self::TB_FORMAT,
        self::TB_SCRIPT,
        self::TB_FONTSIZE,
        self::TB_COLOR,
        self::TB_BGCOLOR,
        self::TB_ALIGN,
        self::TB_CASE,
        self::TB_BLOCKS,
        self::TB_LISTS,
        self::TB_LINK,
        self::TB_IMAGE,
        self::TB_TABLE,
        self::TB_EMOJI,
        self::TB_SPECIALCHAR,
        self::TB_HR,
        self::TB_CLEARFMT,
        self::TB_GRID,
        self::TB_SOURCE,
        self::TB_FULLSCREEN,
    ];

    /** Minimal toolbar: basic formatting only */
    public const TB_MINIMAL = [
        self::TB_FORMAT,
        self::TB_LISTS,
        self::TB_LINK,
    ];

    /** Standard content toolbar: no grid, no source, no emoji */
    public const TB_STANDARD = [
        self::TB_STYLES,
        self::TB_FORMAT,
        self::TB_SCRIPT,
        self::TB_FONTSIZE,
        self::TB_COLOR,
        self::TB_BGCOLOR,
        self::TB_ALIGN,
        self::TB_CASE,
        self::TB_BLOCKS,
        self::TB_LISTS,
        self::TB_LINK,
        self::TB_IMAGE,
        self::TB_TABLE,
        self::TB_SPECIALCHAR,
        self::TB_HR,
        self::TB_CLEARFMT,
        self::TB_FULLSCREEN,
    ];

    // ── Private state ────────────────────────────────────────────────────────

    private string  $uploadRoute  = '';
    /** @var list<string> */
    private array   $toolbar      = self::TB_ALL;
    /** @var array<array<string>>|null */
    private ?array  $toolbarRows  = null;
    private string  $contentClass = '';
    private string  $theme        = self::THEME_DEFAULT;
    /** @var array<string,string> CSS class overrides merged over the resolved preset */
    private array   $cssClasses   = [];
    private int     $minHeight    = 300;
    private int     $maxHeight    = 700;
    private string  $colorScheme  = 'auto';    // 'light' | 'dark' | 'auto'

    public function __construct(string $label = '')
    {
        parent::__construct($label);
        $this->setOption('type', 'editor');
    }

    // ── Fluent API ───────────────────────────────────────────────────────────

    /** URL of the image-upload endpoint. */
    public function setUploadRoute(string $url): static
    {
        $this->uploadRoute = $url;
        return $this;
    }

    /**
     * Configure the UI theme.
     *
     * Pass a THEME_* constant for a built-in preset, or an associative array
     * to partially or fully override CSS classes. Any omitted key falls back to
     * the THEME_DEFAULT value — you only need to specify what you override.
     *
     * CSS map keys:
     *   toolbar      — toolbar outer <div>
     *   btn          — toolbar icon button
     *   btnActive    — toolbar button in active/pressed state
     *   btnDanger    — destructive toolbar button (delete image, etc.)
     *   select       — style-select and font-size dropdowns
     *   sep          — vertical separator between button groups
     *   colorBtn     — colour-picker button (has an extra colour indicator)
     *   editor       — content-editable pane
     *   source       — source-code <textarea>
     *   floatBar     — floating toolbar (grid / table)
     *   floatBarImg  — floating toolbar for image resize
     *   floatBtn     — button inside a float bar
     *   floatInput   — number input inside a float bar (dimensions)
     *   floatText    — text input inside a float bar (alt, title)
     *   floatLabel   — label span inside a float bar
     *   floatLock    — aspect-ratio lock button
     *   popupOverlay — full-screen overlay behind the popup
     *   popup        — popup card / modal-content
     *   popupTitle   — popup heading
     *   popupBody    — popup body wrapper
     *   popupField   — wrapper around a single field (label + input)
     *   popupLabel   — <label> inside popup
     *   popupInput   — <input> inside popup
     *   popupSelect  — <select> inside popup
     *   popupHint    — hint/description text inside popup
     *   popupActions — footer row with action buttons
     *   popupCancel  — cancel / close button
     *   popupConfirm — primary confirm button
     *   widget       — atomic custom-widget placeholder inserted via insertWidget()
     *   bsModal      — bool (pass '1'/'0') — render popup as Bootstrap modal structure
     *
     * @param string|array<string,string> $theme  THEME_* constant or partial class map
     */
    public function setTheme(string|array $theme): static
    {
        if (\is_array($theme)) {
            $this->theme      = self::THEME_DEFAULT;
            $this->cssClasses = $theme;
        } else {
            $this->theme      = $theme;
            $this->cssClasses = [];
        }
        return $this;
    }

    /**
     * Set the colour scheme for THEME_DEFAULT.
     *
     * Controls both the toolbar AND the editing area:
     *   'auto'  — follows the OS/browser prefers-color-scheme (default)
     *   'light' — always light toolbar + light editor
     *   'dark'  — always dark toolbar + dark editor
     *
     * For THEME_BOOTSTRAP: not needed — editor inherits Bootstrap's own CSS vars
     *   automatically when data-bs-theme="dark" is set on a parent element.
     * For THEME_TAILWIND: not needed — handled via dark: utility classes.
     */
    public function setColorScheme(string $scheme): static
    {
        $this->colorScheme = \in_array($scheme, ['light', 'dark', 'auto'], true) ? $scheme : 'light';
        return $this;
    }

    /**
     * Apply a CSS class to the editor pane so it inherits your site's content styles.
     */
    public function setContentClass(string $class): static
    {
        $this->contentClass = $class;
        return $this;
    }

    /** Set minimum editor height in pixels. */
    public function setMinHeight(int $px): static
    {
        $this->minHeight = $px;
        return $this;
    }

    /** Set maximum editor height in pixels. */
    public function setMaxHeight(int $px): static
    {
        $this->maxHeight = $px;
        return $this;
    }

    /**
     * Configure which toolbar groups to show, and optionally split into rows.
     *
     * Single row:
     *   ->setToolbar([TB_STYLES, TB_FORMAT, TB_LINK])
     *
     * Multiple rows (one array per row):
     *   ->setToolbar(
     *       [TB_STYLES, TB_FORMAT, TB_FONTSIZE, TB_COLOR],
     *       [TB_ALIGN, TB_LISTS, TB_LINK, TB_IMAGE, TB_TABLE],
     *   )
     *
     * @param list<string> ...$rows
     */
    public function setToolbar(array ...$rows): static
    {
        $valid  = array_flip(self::TB_ALL);
        $filter = static fn(string $g) => isset($valid[$g]);

        if (count($rows) === 1) {
            $this->toolbar     = array_values(array_filter($rows[0], $filter));
            $this->toolbarRows = null;
        } else {
            $filtered = array_map(
                static fn(array $row) => array_values(array_filter($row, $filter)),
                $rows
            );
            $this->toolbarRows = $filtered;
            $this->toolbar     = array_merge(...$filtered);
        }
        return $this;
    }

    // ── Rendering ────────────────────────────────────────────────────────────

    public function getControl(): Html
    {
        return Html::el('div')
            ->id($this->getHtmlId())
            ->class('phx-editor-wrapper')
            ->data('name',         $this->getHtmlName())
            ->data('upload-url',   $this->uploadRoute)
            ->data('value',        (string) ($this->getValue() ?? ''))
            ->data('toolbar',      $this->toolbarRows
                ? implode('|', array_map(static fn($r) => implode(',', $r), $this->toolbarRows))
                : implode(',', $this->toolbar)
            )
            ->data('content-class', $this->contentClass)
            ->data('theme',         json_encode($this->resolveThemeClasses()))
            ->data('min-height',    $this->minHeight)
            ->data('max-height',    $this->maxHeight)
            ->data('color-scheme',  $this->colorScheme);
    }

    public function getLabel(string|\Stringable|null $caption = null): Html|string|null
    {
        $label = parent::getLabel($caption);
        if ($label instanceof Html) {
            $label->for($this->getHtmlId());
        }
        return $label;
    }

    public function getValue(): mixed
    {
        return $this->value;
    }

    public function loadHttpData(): void
    {
        $this->setValue($this->getHttpData(Form::DataText));
    }

    // ── Theme resolution ─────────────────────────────────────────────────────

    /**
     * Resolve CSS classes for the current theme.
     *
     * Built-in presets define a full map; custom array themes are merged
     * on top of the defaults (same pattern as DropDownListInput).
     *
     * @return array<string,string|bool>
     */
    private function resolveThemeClasses(): array
    {
        $defaults = [
            'wrapper'      => '',
            'toolbar'      => 'phx-editor-toolbar',
            'btn'          => 'phx-editor-btn',
            'btnActive'    => 'phx-editor-btn active',
            'btnDanger'    => 'phx-editor-btn danger',
            'select'       => 'phx-editor-style-select',
            'sep'          => 'phx-editor-sep',
            'colorBtn'     => 'phx-editor-btn phx-editor-color-btn',
            'editor'       => 'phx-editor-editor',
            'source'       => 'phx-editor-source',
            'floatBar'     => 'phx-editor-float-bar',
            'floatBarImg'  => 'phx-editor-float-bar phx-editor-img-float',
            'floatBtn'     => 'phx-editor-btn phx-editor-float-btn',
            'floatInput'   => 'phx-editor-img-dim-input',
            'floatText'    => 'phx-editor-img-text-input',
            'floatLabel'   => 'phx-editor-float-bar-label',
            'floatLock'    => 'phx-editor-btn phx-editor-img-lock active',
            'popupOverlay' => 'phx-editor-popup-overlay',
            'popup'        => 'phx-editor-popup',
            'popupTitle'   => 'phx-editor-popup-title',
            'popupBody'    => '',
            'popupField'   => 'phx-editor-popup-field',
            'popupLabel'   => '',
            'popupInput'   => '',
            'popupSelect'  => '',
            'popupHint'    => 'phx-editor-popup-hint',
            'popupActions' => 'phx-editor-popup-actions',
            'popupCancel'  => 'phx-editor-popup-btn phx-editor-popup-btn-secondary',
            'popupConfirm' => 'phx-editor-popup-btn phx-editor-popup-btn-primary',
            'widget'       => 'phx-editor-widget',
            'bsModal'      => false,
        ];

        $map = match ($this->theme) {
            self::THEME_BOOTSTRAP => [
                'wrapper'      => 'phx-editor-bs-mode card overflow-hidden',
                'toolbar'      => 'phx-editor-toolbar d-flex flex-wrap align-items-center gap-1 p-2 bg-body-tertiary border-bottom',
                'btn'          => 'btn btn-outline-secondary border-0',
                'btnActive'    => 'btn btn-outline-secondary border-0 active',
                'btnDanger'    => 'btn btn-outline-danger border-0',
                'select'       => 'form-select w-auto',
                'sep'          => 'vr mx-1 opacity-25',
                'colorBtn'     => 'btn btn-outline-secondary border-0 phx-editor-color-btn',
                'editor'       => 'phx-editor-editor border-0',
                'source'       => 'phx-editor-source form-control rounded-0 border-0 border-top font-monospace',
                'floatBar'     => 'phx-editor-float-bar card shadow-sm border p-1',
                'floatBarImg'  => 'phx-editor-float-bar phx-editor-img-float card shadow-sm border p-1',
                'floatBtn'     => 'btn btn-sm btn-outline-secondary',
                'floatInput'   => 'form-control form-control-sm',
                'floatText'    => 'form-control form-control-sm',
                'floatLabel'   => 'input-group-text small px-2 py-0',
                'floatLock'    => 'btn btn-sm btn-outline-secondary active',
                'popupOverlay' => '',
                'popup'        => '',
                'popupTitle'   => '',
                'popupBody'    => 'modal-body',
                'popupField'   => 'mb-3',
                'popupLabel'   => 'form-label fw-semibold small',
                'popupInput'   => 'form-control form-control-sm',
                'popupSelect'  => 'form-select form-select-sm',
                'popupHint'    => 'form-text text-muted small mb-1 d-block',
                'popupActions' => 'modal-footer py-2',
                'popupCancel'  => 'btn btn-secondary',
                'popupConfirm' => 'btn btn-primary',
                'widget'       => 'phx-editor-widget d-inline-flex align-items-center gap-2 px-2 py-1 rounded border bg-body-tertiary text-body-secondary small',
                'bsModal'      => true,
            ],
            self::THEME_TAILWIND => [
                'wrapper'      => '',
                'toolbar'      => implode(' ', [
                    'phx-editor-toolbar flex flex-wrap items-center gap-0.5 p-1.5',
                    'bg-gray-900 dark:bg-gray-950 border-b border-gray-700',
                ]),
                'btn'          => implode(' ', [
                    'inline-flex items-center justify-center w-7 h-7 rounded',
                    'text-gray-300 hover:text-white hover:bg-gray-700',
                    'dark:text-gray-400 dark:hover:bg-gray-800',
                    'transition-colors duration-100 cursor-pointer border-0 bg-transparent',
                ]),
                'btnActive'    => implode(' ', [
                    'inline-flex items-center justify-center w-7 h-7 rounded',
                    'text-white bg-indigo-600 dark:bg-indigo-700',
                    'border-0 cursor-pointer',
                ]),
                'btnDanger'    => implode(' ', [
                    'inline-flex items-center justify-center w-7 h-7 rounded',
                    'text-red-400 hover:text-white hover:bg-red-600',
                    'dark:text-red-500 dark:hover:bg-red-700',
                    'transition-colors border-0 bg-transparent cursor-pointer',
                ]),
                'select'       => implode(' ', [
                    'rounded border border-gray-600 bg-gray-800 text-gray-200 text-xs',
                    'py-0.5 px-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500',
                    'dark:bg-gray-900 dark:border-gray-700',
                ]),
                'sep'          => 'inline-block w-px h-5 bg-gray-600 dark:bg-gray-700 mx-1 shrink-0',
                'colorBtn'     => implode(' ', [
                    'phx-editor-color-btn inline-flex items-center justify-center w-7 h-7 rounded',
                    'text-gray-300 hover:text-white hover:bg-gray-700 border-0 bg-transparent cursor-pointer',
                ]),
                'editor'       => implode(' ', [
                    'phx-editor-editor bg-white text-gray-900',
                    'dark:bg-gray-900 dark:text-gray-100',
                ]),
                'source'       => implode(' ', [
                    'phx-editor-source w-full font-mono text-sm p-3',
                    'bg-gray-950 text-green-400 border-t border-gray-700',
                    'focus:outline-none resize-none',
                ]),
                'floatBar'     => implode(' ', [
                    'phx-editor-float-bar flex items-center gap-1 p-1 rounded shadow-lg',
                    'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700',
                ]),
                'floatBarImg'  => implode(' ', [
                    'phx-editor-float-bar phx-editor-img-float flex items-center gap-1 p-1 rounded shadow-lg',
                    'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700',
                ]),
                'floatBtn'     => implode(' ', [
                    'inline-flex items-center justify-center w-6 h-6 rounded text-xs',
                    'text-gray-600 hover:text-white hover:bg-gray-500',
                    'dark:text-gray-400 dark:hover:bg-gray-600',
                    'border border-gray-300 dark:border-gray-600 cursor-pointer bg-white dark:bg-transparent',
                ]),
                'floatInput'   => implode(' ', [
                    'w-16 rounded border border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
                    'text-xs px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500',
                    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none',
                ]),
                'floatText'    => implode(' ', [
                    'w-24 rounded border border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
                    'text-xs px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500',
                ]),
                'floatLabel'   => 'text-xs text-gray-500 dark:text-gray-400 px-1 shrink-0',
                'floatLock'    => implode(' ', [
                    'inline-flex items-center justify-center w-6 h-6 rounded text-xs',
                    'text-indigo-600 bg-indigo-50 border border-indigo-300',
                    'dark:text-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-700',
                    'cursor-pointer',
                ]),
                'popupOverlay' => implode(' ', [
                    'phx-editor-popup-overlay fixed inset-0 z-50 flex items-center justify-center',
                    'bg-black/50 backdrop-blur-sm',
                ]),
                'popup'        => implode(' ', [
                    'phx-editor-popup w-full max-w-lg rounded-xl shadow-2xl',
                    'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                    'mx-4',
                ]),
                'popupTitle'   => implode(' ', [
                    'phx-editor-popup-title text-base font-semibold px-5 py-4',
                    'border-b border-gray-200 dark:border-gray-700',
                ]),
                'popupBody'    => 'px-5 py-4 space-y-3',
                'popupField'   => 'flex flex-col gap-1',
                'popupLabel'   => 'text-sm font-medium text-gray-700 dark:text-gray-300',
                'popupInput'   => implode(' ', [
                    'w-full rounded-md border border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
                    'px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
                ]),
                'popupSelect'  => implode(' ', [
                    'w-full rounded-md border border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
                    'px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
                ]),
                'popupHint'    => 'text-xs text-gray-400 dark:text-gray-500 mt-0.5',
                'popupActions' => implode(' ', [
                    'flex justify-end gap-2 px-5 py-3',
                    'border-t border-gray-200 dark:border-gray-700',
                ]),
                'popupCancel'  => implode(' ', [
                    'px-3 py-1.5 rounded-md text-sm font-medium',
                    'bg-gray-100 text-gray-700 hover:bg-gray-200',
                    'dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
                    'transition-colors cursor-pointer border-0',
                ]),
                'popupConfirm' => implode(' ', [
                    'px-3 py-1.5 rounded-md text-sm font-medium',
                    'bg-indigo-600 text-white hover:bg-indigo-700',
                    'dark:bg-indigo-500 dark:hover:bg-indigo-600',
                    'transition-colors cursor-pointer border-0',
                ]),
                'widget'       => implode(' ', [
                    'phx-editor-widget inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm',
                    'border border-dashed border-gray-400 dark:border-gray-600',
                    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                ]),
                'bsModal'      => false,
            ],
            default => array_merge($defaults, $this->cssClasses),
        };

        // For named presets, merge user overrides on top
        if ($this->theme !== self::THEME_DEFAULT && !empty($this->cssClasses)) {
            $map = array_merge($map, $this->cssClasses);
        }

        return array_merge($defaults, $map);
    }

    // ── Registration ─────────────────────────────────────────────────────────

    /**
     * Register addEditor() method on all Nette form containers.
     * Called automatically by EditorExtension; safe to call multiple times.
     */
    public static function register(string $method = 'addEditor'): void
    {
        Container::extensionMethod(
            $method,
            // @phpstan-ignore-next-line argument.type (Nette calls this closure with extra args via magic __call)
            static function (
                Container $container,
                string $name,
                string $label = '',
            ): EditorInput {
                $control = new EditorInput($label);
                $container->addComponent($control, $name);
                return $control;
            }
        );
    }
}
