<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

use Phlox\Forms\Editor\EditorExtension;
use Phlox\Forms\Editor\EditorInput;
use Nette\DI\Compiler;
use Nette\DI\Container;
use Nette\DI\ContainerLoader;
use Tester\Assert;

// ── Test: extension compiles without error ────────────────────────────────
$loader = new ContainerLoader(sys_get_temp_dir() . '/phlox-editor-test-' . getmypid(), autoRebuild: true);

$class = $loader->load(function (Compiler $compiler): void {
    $compiler->addExtension('editor', new EditorExtension);
});

/** @var Container $container */
$container = new $class;
$container->initialize();
Assert::type(Container::class, $container);

// Extension method should now be registered — call it and check the returned control
$form = new \Nette\Forms\Form;
$control = $form->addEditor('content', 'Obsah');
Assert::type(EditorInput::class, $control);

echo "DI extension test passed.\n";
