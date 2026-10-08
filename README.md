# Memory Atlas

Quiz sulle capitali di Stati Uniti, Europa e Sud America. Il progetto usa Vite, TypeScript e una PWA installabile. I progressi restano nel browser e possono essere esportati o importati come file JSON.

## Produzione e copie pubbliche

- URL canonical / GitHub Pages: https://riccardobuzzolan.github.io/imparacapitalistati/
- Copia Vercel: https://imparacapitalistati.vercel.app/
- Il canonical resta GitHub Pages anche quando la build gira su Vercel.
- Le due copie possono restare online, ma non devono divergere a livello di codice o metadata.

## Sviluppo

```bash
npm ci
npm run dev
```

## Controlli

```bash
npm run check
```

Il comando esegue Prettier, ESLint, Vitest, controllo TypeScript e build Vite. La CI esegue anche l'audit delle dipendenze di produzione.

## Struttura

- `src/data`: dati e mappe separati per area geografica;
- `src/game`: punteggio, sessione e persistenza;
- `src/components`: funzioni DOM riutilizzabili;
- `src/styles`: stile dell'applicazione;
- `public`: file SEO copiati nella build.

## Deploy

GitHub Pages è pubblicato da GitHub Actions su `main`. Vercel costruisce lo stesso repository e usa `base: "/"`; GitHub Pages usa `/imparacapitalistati/`.

## Variabili ambiente

Nessuna variabile ambiente applicativa è richiesta.
