# Gry Logiczne

Webowa aplikacja z grami logicznymi dla Młodzieżowego Ośrodka Wychowawczego.

## Aktualny moduł

- `T-Puzzle` - planszowa gra SVG z czterema wektorowymi elementami, przeciąganiem,
  obrotem, odbiciem, snapowaniem, grupowaniem i walidacją układu.
- Poziomy - aplikacja zaczyna od najprostszej klasycznej figury T, a kolejne
  etapy ćwiczą ułożenie tego samego zestawu elementów w innych orientacjach.
- PWA - manifest, service worker, ikony instalacyjne i responsywny układ dla
  telefonów, tabletów oraz komputerów.

## Uruchomienie

```bash
npm install
npm run dev
```

## Sprawdzenie

```bash
npm run test
npm run build
```

## Publikacja

GitHub Pages jest wdrażany automatycznie z `main` przez workflow
`.github/workflows/deploy-pages.yml`. Build Vite używa ścieżki bazowej
`/GryLogiczne/`, zgodnej z adresem projektu na GitHub Pages.
