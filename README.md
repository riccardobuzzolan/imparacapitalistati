# Memory Atlas

Quiz sulle capitali di Stati Uniti, Europa e Sud America. Il progetto usa Vite,
TypeScript e una PWA installabile. I progressi restano nel browser e possono
essere esportati o importati come file JSON.

## Sviluppo

```bash
npm ci
npm run dev
```

## Controlli

```bash
npm run check
```

Il comando esegue Prettier, ESLint, Vitest, controllo TypeScript e build Vite.

## Struttura

- `src/data`: dati e mappe caricati separatamente per area geografica;
- `src/game`: punteggio, sessione e persistenza;
- `src/components`: funzioni DOM riutilizzabili;
- `src/styles`: stile dell'applicazione;
- `public`: file SEO copiati nella build.

La pubblicazione su GitHub Pages avviene tramite GitHub Actions.
