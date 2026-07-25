# Phlox Forms Editor

[![Latest Version on Packagist](https://img.shields.io/packagist/v/phloxcz/forms-editor.svg?style=flat-square)](https://packagist.org/packages/phloxcz/forms-editor)
[![PHP Version](https://img.shields.io/packagist/php-v/phloxcz/forms-editor.svg?style=flat-square)](https://packagist.org/packages/phloxcz/forms-editor)
[![CI Status](https://img.shields.io/github/actions/workflow/status/phloxcz/forms-editor/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/phloxcz/forms-editor/actions)
[![License](https://img.shields.io/packagist/l/phloxcz/forms-editor.svg?style=flat-square)](LICENSE)

Plnohodnotný WYSIWYG editor pro **Nette Framework** s podporou **Bootstrap 5.3 Grid builderu**.
Žádné npm, žádný bundler — stačí přidat dva soubory (`wysiwyg.css` + `wysiwyg.js`).

> **Podrobná dokumentace** (kompletní API, toolbar skupiny, témata, bezpečnost) je v [`docs/README.md`](docs/README.md).

---

## Funkce

| | Funkce |
|---|---|
| **Bb** | Tučné, kurzíva, podtržení, přeškrtnutí, horní/dolní index |
| **H1** | Odstavec, H1–H6, citace, blok kódu (výběr ze stylu) |
| **`<>`** | Inline kód + blok kódu |
| **☰** | Odrážkový a číslovaný seznam |
| **⊞** | Vizuální tabulkový builder (1–8 × 1–8) |
| **🔗** | Vložení / editace odkazu, výběr okna |
| **🖼** | Upload obrázku přes Nette handler nebo URL; alt, CSS třída, plovoucí toolbar pro resize |
| **▦** | Bootstrap 5.3 Grid builder — vizuální konfigurace řádku + plovoucí toolbar pro editaci sloupců |
| **🎨** | Barva textu, barva pozadí, velikost písma |
| **😀** | Emoji picker, výběr speciálních znaků |
| **</>** | Přepínač WYSIWYG ↔ raw HTML zdrojový kód |
| **⛶** | Fullscreen režim |
| **🧩** | Vkládání vlastních widgetů (`window.PhloxEditor.insertWidget()`) — pro anketu, embed apod. vykreslené na serveru |
| **⌨** | Klávesové zkratky (Ctrl+B/I/U, Ctrl+Shift+S, Tab v `<pre>`) |

Tři vestavěná témata (`THEME_DEFAULT`, `THEME_BOOTSTRAP`, `THEME_TAILWIND`) a plně konfigurovatelný toolbar — podrobnosti v [dokumentaci](docs/README.md#témata).

---

## Požadavky

- PHP **8.4+**
- nette/forms **^3.1**
- nette/di **^3.1**
- nette/http **^3.2**
- nette/utils **^4.0**
- Moderní prohlížeč (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)

---

## Instalace

```bash
composer require phloxcz/forms-editor
```

Poté zkopírujte assety do svého `www/`:

```bash
cp vendor/phloxcz/forms-editor/assets/wysiwyg.js  www/assets/
cp vendor/phloxcz/forms-editor/assets/wysiwyg.css www/assets/
```

> **Tip:** Assety jsou záměrně mimo `public/` — můžete je zahrnout do svého build pipeline (esbuild, Webpack…) nebo servovat přímo.

---

## Konfigurace

### 1. Registrace DI Extension

`config/common.neon`:

```neon
extensions:
    editor: Phlox\Forms\Editor\EditorExtension
```

### 2. Assety v layoutu

`app/templates/@layout.latte`:

```latte
<link rel="stylesheet" href="{$basePath}/assets/wysiwyg.css">
<script src="{$basePath}/assets/wysiwyg.js" defer></script>
```

---

## Použití

### Formulář

```php
protected function createComponentArticleForm(): Form
{
    $form = new Form;

    $form->addText('title', 'Nadpis');

    $form->addEditor('content', 'Obsah článku')
         ->setUploadRoute($this->link('Article:wysiwygUpload'))
         ->setRequired('Zadejte obsah.');

    $form->addSubmit('save', 'Uložit');
    $form->onSuccess[] = [$this, 'formSucceeded'];

    return $form;
}

public function formSucceeded(Form $form, \stdClass $values): void
{
    // ⚠️  Vždy sanitizujte HTML před uložením!
    $safe = $this->htmlPurifier->purify($values->content);
    $this->articles->save(['title' => $values->title, 'content' => $safe]);
    $this->redirect('this');
}
```

### Upload obrázků

Přidejte `ImageUploadTrait` do presenteru, který bude zpracovávat nahrávání:

```php
class ArticlePresenter extends BasePresenter
{
    use \Phlox\Forms\Editor\ImageUploadTrait;

    // Volitelné přepsání výchozích hodnot:
    protected string $wysiwygUploadDir = __DIR__ . '/../../www/uploads/editor/';
    protected string $wysiwygUploadUrl = '/uploads/editor/';
    protected int    $wysiwygMaxSize   = 10 * 1024 * 1024; // 10 MB
}
```

Zaregistrujte akci v routeru:

```php
$router->addRoute('article/upload', 'Article:wysiwygUpload');
```

### Bez DI Extension (manuální registrace)

```php
// app/Bootstrap.php nebo Services.php
\Phlox\Forms\Editor\EditorInput::register('addEditor');
```

---

## Bootstrap 5.3 Grid editor

Kliknutím na ikonu **Grid** v toolbaru otevřete dialog:

- Přidávejte a odebírejte sloupce tlačítky
- Pro každý sloupec zvolte šířku: **auto** (`col`) nebo **1–12** (`col-1`…`col-12`)
- Živý náhled se aktualizuje okamžitě

Po vložení **klikněte do libovolného sloupce** — zobrazí se plovoucí toolbar:

- Měňte šířku každého sloupce přes selectboxy
- `+ sloupec` přidá nový sloupec
- `✕ řádek` smaže celý grid řádek

Výsledné HTML je čisté Bootstrap markup:

```html
<div class="row">
    <div class="col-8"><p>Hlavní obsah</p></div>
    <div class="col-4"><p>Boční panel</p></div>
</div>
```

---

## Bezpečnost

> ⚠️ **Důležité:** Editor vrací raw HTML. Před uložením do databáze **vždy sanitizujte** vstup.

Doporučená knihovna: [HTMLPurifier](http://htmlpurifier.org/)

```bash
composer require ezyang/htmlpurifier
```

```php
$config = \HTMLPurifier_Config::createDefault();
$config->set('HTML.AllowedElements',
    'p,h1,h2,h3,h4,h5,h6,strong,em,u,s,code,pre,blockquote,ul,ol,li,a,img,table,thead,tbody,tr,th,td,div'
);
$config->set('HTML.AllowedAttributes',
    'a.href,a.target,img.src,img.alt,img.class,*.class'
);
$purifier = new \HTMLPurifier($config);
$safeHtml = $purifier->purify($rawHtml);
```

---

## Vývoj

```bash
git clone https://github.com/phloxcz/forms-editor
cd forms-editor
composer install

# Testy
composer test

# Statická analýza
composer phpstan

# Obojí najednou
composer check
```

---

## Přispívání

1. Forkněte repozitář
2. Vytvořte feature branch: `git checkout -b feature/moje-funkce`
3. Commitněte změny: `git commit -m 'feat: popis změny'`
4. Pushněte branch: `git push origin feature/moje-funkce`
5. Otevřete Pull Request

Konvence pro commit messages: [Conventional Commits](https://www.conventionalcommits.org/). Podrobnosti v [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Licence

MIT — viz [LICENSE](LICENSE).
