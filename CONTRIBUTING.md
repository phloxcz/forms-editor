# Přispívání do Phlox Forms Editor

Děkujeme za zájem o příspěvek! Níže jsou základní pravidla.

## Jak přispět

### Nahlášení chyby

1. Zkontrolujte, zda chyba není již [nahlášena](https://github.com/phloxcz/forms-editor/issues)
2. Použijte šablonu **Bug report** a vyplňte všechna pole
3. Přiložte minimální reprodukovatelný příklad

### Navrhování funkce

1. Otevřete issue s popisem funkce a důvodem, proč by měla být součástí balíčku
2. Počkejte na diskuzi před zahájením implementace

### Pull Requesty

1. Forkněte repozitář a vytvořte branch z `main`
2. Napište testy pro nové funkce (Nette Tester)
3. Ujistěte se, že `composer check` prochází
4. Aktualizujte `CHANGELOG.md` v sekci `[Unreleased]`
5. Otevřete PR s použitím přiložené šablony

## Coding standards

- PSR-12 + deklarace `strict_types=1`
- PHPStan level 8
- Testy v Nette Tester (soubory `.phpt`)

## Commit messages

Projekt používá [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: přidání nové funkce
fix: oprava chyby
docs: aktualizace dokumentace
test: přidání / úprava testů
refactor: refaktoring bez změny funkcionality
chore: build, závislosti, CI
```
