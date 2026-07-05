# Gry Logiczne

Lokalna aplikacja z modułami gier logicznych do pracy z młodzieżą.

## Aktualny moduł

- `T-Puzzle` - pierwszy grywalny prototyp z czterema wektorowymi klockami,
  przeciąganiem, obrotem, odwracaniem, snapem, grupowaniem i walidacją figury
  nr 1.
- PWA - aplikacja ma manifest, service worker, ikony instalacyjne i responsywny
  układ dla telefonów oraz tabletów.

## Uruchomienie

```bash
npm install
npm run dev
```

## Publikacja

GitHub Pages jest wdrażany automatycznie z `main` przez workflow
`.github/workflows/deploy-pages.yml`. Build Vite używa ścieżki bazowej
`/GryLogiczne/`, zgodnej z adresem projektu na GitHub Pages.

## Sprawdzenie

```bash
npm run test
npm run build
```

Pierwszy sprawdzony zakres obejmuje TypeScript, testy geometrii i build Vite.
