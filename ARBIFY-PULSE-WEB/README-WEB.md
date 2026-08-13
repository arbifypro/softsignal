# ARBIFY PULSE — WEB

Questa cartella è una versione web separata del progetto ARBIFY PULSE.
Non modifica e non richiede i file della Telegram Mini App originale.

## Avvio

Carica l'intera cartella su GitHub/hosting e apri `index.html`.

## Chiave web predefinita

`ARBIFY`

La chiave è definita in `web-api.js`:

```js
const WEB_ACCESS_KEY = "ARBIFY";
```

Puoi cambiarla, ma questa verifica è client-side e serve solo come gate web/demo.
Per una chiave realmente sicura serve un endpoint server dedicato.

## Cosa è stato mantenuto

- design e asset del progetto corrente;
- Home;
- Segnali;
- Bonus;
- Profilo;
- navigazione e transizioni;
- stato locale nel browser;
- supporto Telegram dal pulsante di assistenza.

## Differenza dalla Telegram Mini App

La versione web usa `web-api.js` invece di `telegram.js` e non richiede Telegram `initData`.
Le funzioni che nel progetto originale dipendono dal server Telegram vengono lasciate in modalità browser/local dove il codice originale la prevede.
