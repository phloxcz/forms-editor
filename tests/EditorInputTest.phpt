<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

use Phlox\Forms\Editor\EditorInput;
use Nette\Forms\Form;
use Tester\Assert;

// ── Test: basic instantiation ─────────────────────────────────────────────
$control = new EditorInput('Test label');
Assert::type(EditorInput::class, $control);

// ── Test: setValue / getValue roundtrip ───────────────────────────────────
$html = '<p>Hello <strong>world</strong></p>';
$control->setValue($html);
Assert::same($html, $control->getValue());

// ── Test: setValue accepts null as-is (rendering coerces it, not the setter) ─
$control->setValue(null);
Assert::null($control->getValue());

// ── Test: setUploadRoute fluent return ────────────────────────────────────
$ret = $control->setUploadRoute('/upload');
Assert::same($control, $ret);

// ── Test: getControl returns Html div with correct data attributes ─────────
$control->setValue('<p>test</p>');
$control->setUploadRoute('/editor/upload');

// Attach to a form so getHtmlName() works
$form = new Form;
$form->addComponent($control, 'body');

$el = $control->getControl();
Assert::same('div', $el->getName());
Assert::contains('phx-editor-wrapper', $el->getAttribute('class'));
Assert::same('/editor/upload', $el->getAttribute('data-upload-url'));
Assert::same('<p>test</p>',    $el->getAttribute('data-value'));
Assert::same('body',           $el->getAttribute('data-name'));

// ── Test: register() adds a custom method name to Container ───────────────
EditorInput::register('addEditorTest');
$form2 = new Form;
$ctrl  = $form2->addEditorTest('content', 'Obsah');
Assert::type(EditorInput::class, $ctrl);

echo "All tests passed.\n";
