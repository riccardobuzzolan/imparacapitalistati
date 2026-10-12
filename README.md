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

Il comando esegue Prettier, ESLint, Vitest, controllo dei sorgenti e di alcuni formati di credenziali (valori oscurati), TypeScript, build e gate degli asset/SEO/PWA. La CI esegue anche l'audit completo, comprese le dipendenze di sviluppo, e costruisce entrambe le basi di pubblicazione. Le Actions sono fissate a commit; Dependabot propone aggiornamenti settimanali.

## Struttura

- `src/data`: dati e mappe separati per area geografica;
- `src/game`: punteggio, sessione e persistenza;
- `src/components`: funzioni DOM riutilizzabili;
- `src/styles`: stile dell'applicazione;
- `public`: file SEO copiati nella build.

## Deploy

GitHub Pages è pubblicato da GitHub Actions su `main`. Vercel costruisce lo stesso repository e usa `base: "/"`; GitHub Pages usa `/imparacapitalistati/`.

Prima della pubblicazione usare un branch e verificare `quality`, `analyze` e `CodeQL`. Nelle impostazioni Pages selezionare **GitHub Actions** come source, per pubblicare `dist` tramite il workflow; una pubblicazione dalla radice può caricare i sorgenti TypeScript e competere con la build compilata. Dopo aver selezionato la sorgente, eseguire **Actions → Quality and deploy → Run workflow** su `main`. Il job di deploy riporta la sorgente Pages quando leggibile e segnala la configurazione legacy; non cambia le impostazioni amministrative. Il workflow non configura le protezioni di `main`: queste richiedono permessi amministrativi e, per alcuni repository privati, un piano compatibile.

La PWA registra un service worker da uno script esterno, compatibile con la CSP Vercel. `start_url`, `scope` e `id` seguono la base; le icone PNG sono derivate dall'SVG originale. La cache contiene app e mappe locali; dopo una prima visita completa si può giocare offline. Non esiste una rewrite di tutte le navigazioni alla homepage: le pagine sconosciute devono conservare HTTP 404/noindex. I progressi sono in localStorage, separati per origine; le due copie non condividono automaticamente i dati. GitHub Pages non applica gli header personalizzati di `vercel.json`.

## Progressi e recupero

La chiave esistente `memory-atlas-v22` resta invariata. Lo schema versione 1 accetta i dati legacy e migra al primo salvataggio, conservando i byte precedenti. Dati corrotti o di versione futura non vengono sovrascritti durante il gioco: un avviso invita a esportarli, mentre i nuovi tentativi restano nella sessione. Accesso negato o quota esaurita non interrompono il quiz. Importazione e azzeramento richiedono conferma, archiviano il contenuto precedente e conservano lo stato corrente se la scrittura fallisce.

Il backup comprende progressi e originali recuperabili, con limite di 5 MB misurato in UTF-8. L'esportazione offre download e testo JSON selezionabile; un backup invalido non modifica i dati. La normalizzazione conserva originali distinti senza accumulare wrapper ricorsivi a ogni importazione. Nessun progresso o risposta viene inviato a un backend o ad Analytics. Contatori/stati/prototype non validi vengono rifiutati preservando l'originale.

## Rollback

Conservare SHA e deployment precedente. Su Vercel ripristinare la produzione precedente dal dashboard; su Pages preparare un revert in branch, verificare la CI e ripubblicare il build. Esportare prima i progressi: il codice precedente non comprende lo schema versione 1, quindi un rollback del codice non autorizza a cancellare o reinterpretare i dati. Verificare entrambi gli hosting e il service worker dopo il rollback. Non usare reset forzati di `main`.

## Variabili ambiente

Nessuna variabile ambiente applicativa è richiesta.

## Statistiche facoltative

GA4 usa il flusso G-30SFB80YPY solo sui due domini di produzione indicati sopra. Il banner permette di accettare o rifiutare le statistiche con la stessa facilità. La scelta dura 180 giorni; il pulsante Statistiche consente di cambiarla. Il tag Google non viene caricato prima dell'accettazione e resta bloccato sulle preview, sul sito portfolio e su localhost. La revoca disabilita Analytics, cancella i cookie GA accessibili e ricarica la pagina per scaricare il tag.

Raccolta prevista: una page_view per caricamento, quiz_start all'avvio del quiz rapido e region_select alla scelta della mappa. URL senza query o frammenti, referrer limitato all'origine. Nessuna risposta, testo digitato o progresso personale viene inviato. Pubblicità e Google Signals disattivati nel tag. La misurazione avanzata del nuovo flusso deve essere disattivata per evitare eventi automatici e URL non controllati. Questa configurazione tecnica non sostituisce la revisione completa dell'informativa privacy del titolare.
