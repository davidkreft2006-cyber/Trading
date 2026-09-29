# Kryo Demo – Krypto-Börse & Wallet (Design-Demo)

Fiktive, rein lokale Design-Demo. Kein echtes Konto, kein echtes Geld, keine Wallet-Verbindung, keine Zahlungsabwicklung, keine Anbindung an eine echte Börse. Alle Kurse sind statische Beispieldaten (`lib/data.ts`).

## Start

Voraussetzung: Node.js 18.17 oder neuer.

```bash
cd nextjs
npm install
npm run dev
```

Dann http://localhost:3000 öffnen. Produktions-Build: `npm run build && npm start`.

## Seiten

- `/` Startseite: Hero, Kurs-Ticker, Marktübersicht
- `/login` Demo-Login: nur ein frei wählbarer Demo-Name
- `/wallet` Gesamtguthaben, Assets, Transaktionsverlauf, „Demo-Guthaben hinzufügen“, Übertragen, Zurücksetzen
- `/markets` Alle Paare mit Suche
- `/trade?pair=BTC` Chart + Kaufen/Verkaufen (Simulation)

Jede Seite zeigt oben das Banner „DEMO – kein echtes Konto“. Kaufen, Verkaufen, Übertragen, Aufladen und Zurücksetzen zeigen vorher einen Hinweis, dass kein echtes Geld bewegt wird.

## Wo wird das Demo-Guthaben gespeichert?

Ausschließlich im Browser, in `window.localStorage`:

- Schlüssel `kryo-demo:v1` – aktive Sitzung und alle Demo-Profile mit Guthaben und Transaktionen
- Schlüssel `kryo-demo:theme` – Hell/Dunkel

Struktur:

```json
{
  "session": "Satoshi Demo",
  "profiles": {
    "Satoshi Demo": {
      "balances": { "USDT": 1000, "BTC": 0.01, "ETH": 0 },
      "txs": [{ "id": "…", "time": 1727600000000, "type": "Demo-Einzahlung", "asset": "USDT", "amount": 1000, "detail": "…" }]
    }
  }
}
```

Im Code:

- `lib/storage.ts` – Typen sowie `loadData`, `saveData`, `clearData` (Lesen/Schreiben/Löschen von `localStorage`)
- `lib/DemoContext.tsx` – React-Context mit dem Zustand. Lädt beim Start aus `localStorage` und schreibt jede Änderung zurück (`useEffect` auf `data`). Hier liegen `addFunds`, `trade`, `transfer`, `resetAll`.

Zurücksetzen: Button „Alle Demo-Daten zurücksetzen“ in der Wallet, oder in den Browser-DevTools `localStorage.removeItem('kryo-demo:v1')`.
