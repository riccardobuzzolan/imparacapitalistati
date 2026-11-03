# Memory Atlas

Un quiz per esercitarsi con le capitali degli Stati Uniti, dell'Europa e del Sud America.

**Gioca online:** https://riccardobuzzolan.github.io/imparacapitalistati/

È disponibile anche una [versione su Vercel](https://imparacapitalistati.vercel.app/).

## Come funziona

Si può scegliere un'area geografica e mettere alla prova le proprie conoscenze. I progressi restano salvati nel browser e possono essere esportati o importati tramite file JSON.

L'app può essere installata come PWA. Dopo un primo caricamento completo, le risorse locali consentono di giocare anche offline.

## Tecnologie

Il progetto usa TypeScript, Vite e test automatizzati. Il codice è organizzato in cartelle per dati geografici, logica del gioco, componenti e stili.

Per avviarlo in locale:

```bash
npm ci
npm run dev
```

Per eseguire i controlli:

```bash
npm run check
```

Configurazioni di pubblicazione, gestione dei progressi e istruzioni di recupero sono in [docs/TECHNICAL.md](docs/TECHNICAL.md).
