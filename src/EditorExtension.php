<?php

declare(strict_types=1);

namespace Phlox\Forms\Editor;

use Nette\DI\CompilerExtension;
use Nette\Forms\Container;
use Nette\PhpGenerator\ClassType;

/**
 * Nette DI Extension — registers EditorInput as a form method.
 *
 * Enable in config/common.neon:
 *
 *   extensions:
 *       editor: Phlox\Forms\Editor\EditorExtension
 */
class EditorExtension extends CompilerExtension
{
    public function afterCompile(ClassType $class): void
    {
        $class->getMethod('initialize')
            ->addBody('\Phlox\Forms\Editor\EditorExtension::register();');
    }

    /**
     * Register addEditor() on every form Container.
     * Safe to call multiple times (extensionMethod is idempotent).
     */
    public static function register(): void
    {
        Container::extensionMethod(
            'addEditor',
            // @phpstan-ignore-next-line argument.type (Nette calls this closure with extra args via magic __call)
            static function (
                Container $container,
                string $name,
                string $label = '',
                string $uploadRoute = '',
            ): EditorInput {
                $control = new EditorInput($label);
                if ($uploadRoute !== '') {
                    $control->setUploadRoute($uploadRoute);
                }
                $container->addComponent($control, $name);
                return $control;
            }
        );
    }
}
