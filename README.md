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

## Statistiche facoltative

GA4 usa il flusso G-30SFB80YPY solo sui due domini di produzione indicati sopra. Il banner permette di accettare o rifiutare le statistiche con la stessa facilità. La scelta dura 180 giorni; il pulsante Statistiche consente di cambiarla. Il tag Google non viene caricato prima dell'accettazione e resta bloccato sulle preview, sul sito portfolio e su localhost. La revoca disabilita Analytics, cancella i cookie GA accessibili e ricarica la pagina per scaricare il tag.

Raccolta prevista: una page_view per caricamento, quiz_start all'avvio del quiz rapido e region_select alla scelta della mappa. URL senza query o frammenti, referrer limitato all'origine. Nessuna risposta, testo digitato o progresso personale viene inviato. Pubblicità e Google Signals disattivati nel tag. La misurazione avanzata del nuovo flusso deve essere disattivata per evitare eventi automatici e URL non controllati. Questa configurazione tecnica non sostituisce la revisione completa dell'informativa privacy del titolare.
