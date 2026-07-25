# Phlox Forms Editor — dokumentace

Podrobná referenční dokumentace k `phloxcz/forms-editor`. Rychlý start najdete v [hlavním README](../README.md).

## Obsah

- [Požadavky a instalace](#požadavky-a-instalace)
- [Registrace v Nette](#registrace-v-nette)
- [Použití ve formuláři](#použití-ve-formuláři)
- [API — `EditorInput`](#api--editorinput)
- [Toolbar skupiny](#toolbar-skupiny)
- [Témata](#témata)
- [Barevné schéma](#barevné-schéma)
- [Upload obrázků — `ImageUploadTrait`](#upload-obrázků--imageuploadtrait)
- [Klientská část (JS)](#klientská-část-js)
- [Vkládání vlastních widgetů](#vkládání-vlastních-widgetů)
- [Klávesové zkratky](#klávesové-zkratky)
- [Bootstrap Grid builder](#bootstrap-grid-builder)
- [Bezpečnost](#bezpečnost)
- [Testování a statická analýza](#testování-a-statická-analýza)
- [Podporované prohlížeče](#podporované-prohlížeče)

---

## Požadavky a instalace

- PHP **8.4+**
- `nette/forms` ^3.1, `nette/di` ^3.1, `nette/http` ^3.2, `nette/utils` ^4.0

```bash
composer require phloxcz/forms-editor
cp vendor/phloxcz/forms-editor/assets/wysiwyg.js  www/assets/
cp vendor/phloxcz/forms-editor/assets/wysiwyg.css www/assets/
```

Assety jsou záměrně mimo `public/`, aby si je bylo možné zahrnout do vlastního build pipeline (esbuild, Webpack…) nebo servovat přímo — knihovna sama nepoužívá npm ani žádný bundler.

---

## Registrace v Nette

### Přes DI extension (doporučeno)

`config/common.neon`:

```neon
extensions:
    editor: Phlox\Forms\Editor\EditorExtension
```

`EditorExtension` v `afterCompile()` zavolá `EditorInput::register('addEditor')`, takže metoda `addEditor()` je od té chvíle dostupná na každém `Nette\Forms\Container` (formulář i libovolný kontejner uvnitř něj).

### Manuální registrace

Pokud DI extension nepoužíváte (např. mimo plný Nette bootstrap), zaregistrujte metodu ručně, typicky v `Bootstrap.php`:

```php
\Phlox\Forms\Editor\EditorInput::register('addEditor');
```

Parametr `register()` umožňuje zvolit i jiný název metody, pokud `addEditor` koliduje s něčím jiným ve vašem projektu:

```php
\Phlox\Forms\Editor\EditorInput::register('addRichText');
// …
$form->addRichText('content', 'Obsah');
```

---

## Použití ve formuláři

```php
$form->addEditor('content', 'Obsah článku')
     ->setUploadRoute($this->link('Article:wysiwygUpload'))
     ->setRequired('Zadejte obsah.');
```

Control je běžný `Nette\Forms\Controls\BaseControl` — funguje s `setRequired()`, `addRule()`, `addCondition()`, `setDefaultValue()` atd. jako kterýkoli jiný prvek formuláře. Hodnota je vždy raw HTML řetězec (`string`).

---

## API — `EditorInput`

Všechny settery jsou fluentní (vrací `static`).

| Metoda | Popis |
|---|---|
| `setUploadRoute(string $url): static` | URL endpointu, na který editor odešle AJAX upload obrázku (`multipart/form-data`, pole `file`). |
| `setTheme(string\|array $theme): static` | Vestavěné téma (`EditorInput::THEME_*`) nebo pole s vlastní/částečnou mapou CSS tříd — viz [Témata](#témata). |
| `setColorScheme(string $scheme): static` | `'light'`, `'dark'` nebo `'auto'` (výchozí). Platí jen pro `THEME_DEFAULT` — Bootstrap a Tailwind řeší dark mode vlastními mechanismy. |
| `setContentClass(string $class): static` | CSS třída aplikovaná na editační plochu, aby zdědila styly obsahu vašeho webu (typografie článků apod.). |
| `setMinHeight(int $px): static` | Minimální výška editační plochy v px (výchozí `300`). |
| `setMaxHeight(int $px): static` | Maximální výška editační plochy v px (výchozí `700`). |
| `setToolbar(array ...$rows): static` | Které skupiny toolbaru zobrazit; jedno pole = jeden řádek, více polí = toolbar rozdělený do více řádků. Neplatné skupiny se tiše ignorují. |

### Příklad — vlastní toolbar ve dvou řádcích

```php
$form->addEditor('perex', 'Perex')
     ->setToolbar(
         [EditorInput::TB_STYLES, EditorInput::TB_FORMAT, EditorInput::TB_FONTSIZE, EditorInput::TB_COLOR],
         [EditorInput::TB_ALIGN, EditorInput::TB_LISTS, EditorInput::TB_LINK, EditorInput::TB_IMAGE, EditorInput::TB_TABLE],
     )
     ->setMinHeight(120);
```

### Přednastavené sady toolbaru

| Konstanta | Obsah |
|---|---|
| `TB_ALL` (výchozí) | Všechny skupiny níže, v uvedeném pořadí. |
| `TB_STANDARD` | Bez grid builderu, zdrojového kódu a emoji — vhodné pro běžný obsahový editor. |
| `TB_MINIMAL` | Jen `TB_FORMAT`, `TB_LISTS`, `TB_LINK` — pro krátká pole (perex, komentář). |

```php
->setToolbar(EditorInput::TB_STANDARD)
```

---

## Toolbar skupiny

| Konstanta | Funkce |
|---|---|
| `TB_STYLES` | Výběr blokového stylu — odstavec, H1–H6, citace, blok kódu. |
| `TB_FORMAT` | Tučné, kurzíva, podtržení, přeškrtnutí. |
| `TB_SCRIPT` | Horní index (superscript), dolní index (subscript). |
| `TB_FONTSIZE` | Velikost písma. |
| `TB_COLOR` | Barva textu. |
| `TB_BGCOLOR` | Barva zvýraznění / pozadí textu. |
| `TB_ALIGN` | Zarovnání textu. |
| `TB_CASE` | Převod velikosti písmen (UPPER/lower/Title Case). |
| `TB_BLOCKS` | Citace, inline kód, blok kódu. |
| `TB_LISTS` | Odrážkový a číslovaný seznam. |
| `TB_LINK` | Vložení / úprava / odstranění odkazu. |
| `TB_IMAGE` | Upload nebo vložení obrázku přes URL. |
| `TB_TABLE` | Vizuální tabulkový builder (výběr mřížky až 8×8). |
| `TB_EMOJI` | Emoji picker. |
| `TB_SPECIALCHAR` | Picker speciálních znaků. |
| `TB_HR` | Vodorovná linka. |
| `TB_CLEARFMT` | Vyčištění formátování vybraného textu. |
| `TB_GRID` | Bootstrap 5.3 Grid builder. |
| `TB_SOURCE` | Přepínač WYSIWYG ↔ raw HTML zdroj. |
| `TB_FULLSCREEN` | Fullscreen režim editoru. |

---

## Témata

`setTheme()` přijímá buď konstantu, nebo pole s vlastní/částečnou mapou CSS tříd, která se sloučí přes výchozí hodnoty.

| Konstanta | Popis |
|---|---|
| `THEME_DEFAULT` | Vestavěné `phx-editor-*` třídy z `wysiwyg.css`. Respektuje `setColorScheme()`. |
| `THEME_BOOTSTRAP` | Tlačítka jako `.btn`, popupy jako Bootstrap modaly, vstupy `.form-control`. Dark mode řeší automaticky přes `data-bs-theme="dark"` na rodičovském elementu — `setColorScheme()` zde není potřeba. |
| `THEME_TAILWIND` | Kompletní mapa utility tříd včetně `dark:` variant. Dark mode řeší Tailwindí `dark:` třídy — `setColorScheme()` zde není potřeba. |

### Vlastní/částečné přepsání

```php
$form->addEditor('content', 'Obsah')
     ->setTheme([
         'btn'          => 'my-btn px-2',
         'popupConfirm' => 'bg-blue-600 text-white rounded px-3 py-1',
     ]);
```

Klíče, které nepřepíšete, zůstanou na hodnotě z `THEME_DEFAULT`. Nejdůležitější klíče mapy:

`wrapper`, `toolbar`, `btn`, `btnActive`, `btnDanger`, `select`, `sep`, `colorBtn`, `editor`, `source`, `floatBar`, `floatBarImg`, `floatBtn`, `floatInput`, `floatText`, `floatLabel`, `floatLock`, `popupOverlay`, `popup`, `popupTitle`, `popupBody`, `popupField`, `popupLabel`, `popupInput`, `popupSelect`, `popupHint`, `popupActions`, `popupCancel`, `popupConfirm`, `widget` (placeholder vlastního widgetu, viz [Vkládání vlastních widgetů](#vkládání-vlastních-widgetů)), `bsModal` (bool — vykreslí popup jako strukturu Bootstrap modalu).

Kompletní výchozí mapu najdete v [`src/EditorInput.php`](../src/EditorInput.php) v metodě `resolveThemeClasses()`.

---

## Barevné schéma

```php
->setColorScheme('dark')   // 'light' | 'dark' | 'auto' (výchozí)
```

Platí pouze pro `THEME_DEFAULT`:
- `'auto'` — sleduje `prefers-color-scheme` prohlížeče/OS
- `'light'` / `'dark'` — vynucený režim bez ohledu na systém

---

## Upload obrázků — `ImageUploadTrait`

Trait pro presenter, který bude obsluhovat AJAX upload obrázků z editoru.

```php
class ArticlePresenter extends BasePresenter
{
    use \Phlox\Forms\Editor\ImageUploadTrait;

    protected string $wysiwygUploadDir   = __DIR__ . '/../../www/uploads/editor/'; // výchozí: relativně k umístění traitu
    protected string $wysiwygUploadUrl   = '/uploads/editor/';
    protected int    $wysiwygMaxSize     = 10 * 1024 * 1024; // v bajtech, výchozí 8 MB
    protected array  $wysiwygAllowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
}
```

Zaregistrujte route na akci `wysiwygUpload`:

```php
$router->addRoute('article/upload', 'Article:wysiwygUpload');
```

a předejte URL editoru:

```php
$form->addEditor('content', 'Obsah')
     ->setUploadRoute($this->link('Article:wysiwygUpload'));
```

### Chování handleru

- Přijímá pouze `POST` s polem `file` (`multipart/form-data`)
- Validuje MIME typ proti `$wysiwygAllowedMimes` a velikost proti `$wysiwygMaxSize`
- Cílový adresář se vytvoří automaticky (`Nette\Utils\FileSystem::createDir()`), pokud neexistuje
- Soubor se uloží pod náhodně vygenerovaným 20znakovým názvem (`Nette\Utils\Random::generate()`) s původní příponou
- Odpověď je vždy JSON: `{"url": "..."}` při úspěchu, `{"error": "..."}` (české chybové hlášky) při chybě — chybové stavy vrací `sendJson()` a ukončují požadavek

> **Poznámka k bezpečnosti:** handler validuje MIME a velikost, ale nijak nekontroluje obsah SVG souborů (může obsahovat `<script>`). Pokud povolujete `image/svg+xml`, zvažte sanitizaci (např. přes HTMLPurifier nebo `enshrined/svg-sanitize`) nebo `image/svg+xml` z `$wysiwygAllowedMimes` odeberte.

---

## Klientská část (JS)

`wysiwyg.js` je čistý vanilla JS bez závislostí, exportuje třídu `PhloxEditor` a inicializační helper na `window.PhloxEditor`.

### Auto-inicializace

Editor se automaticky inicializuje na každém `.phx-editor-wrapper` (přesně to, co vykreslí `EditorInput::getControl()`):

- při `DOMContentLoaded`
- po dokončení Naja (`window.naja`) AJAX requestu, pokud je Naja na stránce přítomna
- přes `MutationObserver` na `document.body` — zachytí i markup vložený jinými AJAX/knihovnami (htmx, vlastní kód)

Element, který byl již inicializován, má `data-phx-editor-init="1"` a znovu se needituje.

### Manuální (re-)inicializace

```js
// inicializuje všechny dosud neinicializované .phx-editor-wrapper uvnitř zadaného kořene
window.PhloxEditor.init(document);
window.PhloxEditor.init(someContainerElement);

// přístup ke třídě samotné, pokud potřebujete instanci přímo
const instance = new window.PhloxEditor.PhloxEditor(wrapperElement);
```

---

## Vkládání vlastních widgetů

Editor umí na pozici kurzoru vložit atomický, needitovatelný placeholder pro vlastní widget (anketa, embed, dynamický blok apod.) — typicky z UI mimo samotný editor, například z panelu "Procházet widgety" jinde v CMS.

### Formát placeholderu

```html
<div contenteditable="false" data-widget="poll" data-id="5" class="phx-editor-widget">Anketa #5</div>
```

Element je běžný `<div>` s `data-*` atributy (viz [úvaha o výběru elementu](#bezpečnost) níže) — žádný vlastní HTML tag, aby se nekomplikovala sanitizace a zpracování na serveru. `contenteditable="false"` z něj dělá pro prohlížeč atomickou jednotku: nejde do něj psát, šipky a Backspace/Delete ho smažou/přeskočí jako celek.

### Vložení z JS

```js
// vloží do naposledy fokusovaného editoru na stránce
window.PhloxEditor.insertWidget('poll', 5, 'Anketa #5');

// vloží do konkrétního pole podle jeho jména ve formuláři (data-name / EditorInput field name)
window.PhloxEditor.insertWidget('poll', 5, 'Anketa #5', 'content');
```

`fieldName` je volitelný čtvrtý parametr — pokud ho vynecháte, cílí se na editor, který byl naposledy fokusován (funguje i po kliknutí mimo editor, protože si při ztrátě fokusu ukládá pozici kurzoru). Pokud na stránce může být více editorů a chcete mít jistotu, cílujte explicitně přes jméno pole. Metoda vrací `false` a vypíše konzolové varování, pokud se nenajde žádná cílová instance.

Vlastní vzhled placeholderu lze upravit přes klíč `widget` v [mapě témat](#témata) (`.phx-editor-widget` je výchozí CSS třída).

### Zpracování na serveru

Uložená hodnota pole je opět jen raw HTML string obsahující tyto `<div>` elementy. Po sanitizaci (viz [Bezpečnost](#bezpečnost)) je nahraďte skutečným vykresleným widgetem, např. přes `DOMDocument`:

```php
$dom = new \DOMDocument();
$dom->loadHTML('<?xml encoding="utf-8"?>' . $safeHtml, LIBXML_NOERROR);
$xpath = new \DOMXPath($dom);

foreach ($xpath->query('//div[@data-widget]') as $node) {
    $type = $node->getAttribute('data-widget');
    $id   = $node->getAttribute('data-id');

    $rendered = $this->widgetRenderer->render($type, (int) $id); // vaše logika
    $fragment = $dom->createDocumentFragment();
    $fragment->appendXML($rendered);
    $node->parentNode->replaceChild($fragment, $node);
}

$finalHtml = $dom->saveHTML();
```

> **Důležité:** `HTML.AllowedAttributes` v HTMLPurifier musí obsahovat `div.data-widget` a `div.data-id`, jinak sanitizace atributy (a tím i informaci, který widget vložit) odstraní ještě předtím, než se dostanete k parsování. Viz [Bezpečnost](#bezpečnost).

---

## Klávesové zkratky

| Zkratka | Akce |
|---|---|
| `Ctrl+B` | Tučné |
| `Ctrl+I` | Kurzíva |
| `Ctrl+U` | Podtržení |
| `Ctrl+Shift+S` | Přepnutí zdrojového kódu |
| `Tab` v `<pre>` | Vloží 4 mezery (místo přesunu fokusu) |
| `Tab` / `Shift+Tab` v seznamu (`<li>`) | Odsazení / zrušení odsazení položky |
| `Esc` | Ukončí fullscreen režim |
| `F11` (při fokusu v editoru) | Přepne fullscreen režim |

---

## Bootstrap Grid builder

Ikona **Grid** v toolbaru (`TB_GRID`) otevře dialog pro vizuální sestavení Bootstrap 5.3 řádku:

- Přidávejte/odebírejte sloupce tlačítky, živý náhled se aktualizuje okamžitě
- Šířka každého sloupce: **auto** (`col`) nebo **1–12** (`col-1`…`col-12`), volitelně per-breakpoint (`xs`, `sm`, `md`, `lg`, `xl`, `xxl`)
- Po vložení klikněte do libovolného sloupce → zobrazí se plovoucí toolbar pro změnu šířek, přidání sloupce (`+ sloupec`) nebo smazání celého řádku (`✕ řádek`)

Výstup je čistý Bootstrap markup bez dalších závislostí:

```html
<div class="row">
    <div class="col-8"><p>Hlavní obsah</p></div>
    <div class="col-4"><p>Boční panel</p></div>
</div>
```

---

## Bezpečnost

Editor vrací **raw HTML** — control ho nijak nesanitizuje. Než hodnotu uložíte do databáze, vždy ji sanitizujte, typicky přes [HTMLPurifier](http://htmlpurifier.org/):

```bash
composer require ezyang/htmlpurifier
```

```php
$config = \HTMLPurifier_Config::createDefault();
$config->set('HTML.AllowedElements',
    'p,h1,h2,h3,h4,h5,h6,strong,em,u,s,code,pre,blockquote,ul,ol,li,a,img,table,thead,tbody,tr,th,td,div'
);
$config->set('HTML.AllowedAttributes',
    'a.href,a.target,img.src,img.alt,img.class,*.class,div.data-widget,div.data-id'
);
$purifier = new \HTMLPurifier($config);
$safeHtml = $purifier->purify($rawHtml);
```

Pokud přidáváte grid/Bootstrap sloupce do seznamu povolených prvků, nezapomeňte allow-listovat i třídy `row`, `col`, `col-1`…`col-12` (přes `HTML.AllowedAttributes` s `*.class`, případně `CSSTidy`/`HTML.SafeIframe` dle vašich potřeb). Pokud používáte [vkládání vlastních widgetů](#vkládání-vlastních-widgetů), allow-listujte i `div.data-widget` a `div.data-id`, jinak HTMLPurifier tyto atributy odstraní a na serveru pak nebude co parsovat.

Viz také [Upload obrázků — poznámka k SVG](#upload-obrázků--imageuploadtrait) a [SECURITY.md](../SECURITY.md) pro postup nahlášení zranitelnosti.

---

## Testování a statická analýza

```bash
composer install

composer test     # Nette Tester, tests/*.phpt
composer phpstan   # PHPStan level 8
composer check     # obojí
```

CI (`.github/workflows/ci.yml`) spouští PHPStan a testy na PHP 8.4 a 8.5 při každém push/PR do `main`/`master` a po úspěchu na tagu notifikuje Packagist.

---

## Podporované prohlížeče

Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ — knihovna používá `contenteditable`, moderní CSS (custom properties, `:has()` v některých doplňkových stylech) a `MutationObserver`; starší prohlížeče nejsou podporovány.
