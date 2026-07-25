<?php

declare(strict_types=1);

namespace Phlox\Forms\Editor;

use Nette\Http\FileUpload;
use Nette\Utils\FileSystem;
use Nette\Utils\Random;

/**
 * ImageUploadTrait — mixin for any Presenter that handles WYSIWYG image uploads.
 *
 * Usage — add to your presenter:
 *
 *   class EditorPresenter extends BasePresenter
 *   {
 *       use \Phlox\Forms\Editor\ImageUploadTrait;
 *
 *       // Optional overrides:
 *       protected string $wysiwygUploadDir = __DIR__ . '/../../www/uploads/editor/';
 *       protected string $wysiwygUploadUrl = '/uploads/editor/';
 *   }
 *
 * Then register the route:
 *
 *   $router->addRoute('editor/upload', 'Editor:wysiwygUpload');
 *
 * And pass the URL to the form control:
 *
 *   $form->addEditor('body', 'Obsah')
 *        ->setUploadRoute($this->link('Editor:wysiwygUpload'));
 */
trait ImageUploadTrait
{
    /** Absolute path where uploaded images will be stored. */
    protected string $wysiwygUploadDir = __DIR__ . '/../../../www/uploads/editor/';

    /** Public URL prefix for stored images. */
    protected string $wysiwygUploadUrl = '/uploads/editor/';

    /** Maximum file size in bytes (default 8 MB). */
    protected int $wysiwygMaxSize = 8 * 1024 * 1024;

    /** Allowed MIME types. */
    protected array $wysiwygAllowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
    ];

    /**
     * Action handler for AJAX image uploads from the WYSIWYG editor.
     * Responds with JSON: { "url": "..." } or { "error": "..." }
     */
    public function actionWysiwygUpload(): void
    {
        // Only POST
        if (!$this->getHttpRequest()->isMethod('POST')) {
            $this->sendJson(['error' => 'Method not allowed.']);
        }

        /** @var FileUpload|null $file */
        $file = $this->getHttpRequest()->getFile('file');

        // Validate presence
        if (!$file instanceof FileUpload || !$file->isOk()) {
            $this->sendJson(['error' => 'Soubor se nepodařilo nahrát nebo nebyl odeslán.']);
        }

        // Validate MIME type
        $mime = $file->getContentType() ?? '';
        if (!in_array($mime, $this->wysiwygAllowedMimes, true)) {
            $this->sendJson(['error' => sprintf(
                'Nepodporovaný formát souboru (%s). Povolené: %s.',
                $mime,
                implode(', ', $this->wysiwygAllowedMimes)
            )]);
        }

        // Validate size
        if ($file->getSize() > $this->wysiwygMaxSize) {
            $this->sendJson(['error' => sprintf(
                'Soubor je příliš velký (%s MB). Maximální povolená velikost: %s MB.',
                round($file->getSize() / 1024 / 1024, 1),
                round($this->wysiwygMaxSize / 1024 / 1024, 1)
            )]);
        }

        // Ensure upload directory exists
        FileSystem::createDir($this->wysiwygUploadDir);

        // Build unique filename
        $ext      = strtolower(pathinfo($file->getSanitizedName(), PATHINFO_EXTENSION)) ?: 'jpg';
        $filename = Random::generate(20) . '.' . $ext;
        $path     = rtrim($this->wysiwygUploadDir, '/\\') . DIRECTORY_SEPARATOR . $filename;

        // Move file
        try {
            $file->move($path);
        } catch (\Throwable $e) {
            $this->sendJson(['error' => 'Uložení souboru selhalo: ' . $e->getMessage()]);
        }

        // Return public URL
        $url = rtrim($this->wysiwygUploadUrl, '/') . '/' . $filename;
        $this->sendJson(['url' => $url]);
    }
}
