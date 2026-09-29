# Auvryn – Krypto-Börse & Wallet (Design-Demo)

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
- `/wallet` Gesamtguthaben, Assets, Transaktionsverlauf, „Guthaben hinzufügen“, Übertragen, Zurücksetzen
- `/markets` Alle Paare mit Suche
- `/trade?pair=BTC` Chart + Kaufen/Verkaufen (Simulation)

Die Oberfläche tritt wie ein normales Produkt auf, ohne Demo-Banner. Erhalten bleiben bewusst zwei dezente Hinweise: die Footer-Zeile („Unabhängiges Konzeptprojekt. Keine echten Konten, kein echtes Geld …“) und die Zeile „Testguthaben ohne realen Gegenwert“ im Dialog „Guthaben hinzufügen“. Kaufen, Verkaufen und Zurücksetzen zeigen vorher eine Übersicht zur Bestätigung.

## Designsystem

- **Schrift:** Geist (Text) und Geist Mono (alle Zahlen, tabellarisch) über das Paket `geist`.
- **Farben:** immer Dunkelmodus (kein Umschalter). Navy-getönte Flächen aus dem Logo-Navy, Türkis aus dem Logo als einziger Akzent. Grün/Rot nur für Kursrichtung und Kauf/Verkauf (Grün bewusst gelblicher als das Türkis), immer mit Vorzeichen und Pfeil; mit dem Palette-Validator geprüft. Tokens in `app/globals.css`.
- **Logo:** `public/brand/auvryn-logo.png` (Schriftzug für dunklen Grund aufgehellt) und `public/brand/auvryn-mark.png` (Zeichen, mobil im Header); Favicon `app/icon.png`.
- **Radien:** Buttons, Umschalter und Paar-Chips als Pill; Eingabefelder und Auswahlraster 6 px; Panels 10 px; Coin-Marken 4 px.
- **Buttons:** `LiquidButton` aus `components/ui/liquid-glass-button.tsx` (Varianten `primary`, `glass`, `buy`, `sell`, `danger`, `ghost`, `destructive`). Der SVG-Filter `<GlassFilter />` wird einmal in `app/layout.tsx` gerendert; die Verzerrung wirkt nur in Chromium, andere Browser zeigen die Glaskante ohne Verzerrung.
- **Signatur-CTA:** `ShinyButton` aus `components/ui/shiny-button.tsx` (Styles in `shiny-button.css`), bewusst nur für den Einstieg: „Loslegen“/„Zur Wallet“ auf der Startseite und „Weiter“ bei der Anmeldung. Unterstützt `href` (Link) und `type` (Formular).
- **shadcn-Struktur:** `components.json`, `lib/utils.ts` (`cn`), Komponenten in `components/ui/`. Die shadcn-Farbnamen (`primary`, `secondary`, `destructive`, `ring` …) sind in `tailwind.config.ts` auf die Auvryn-Tokens abgebildet.
- **Icons:** Phosphor (`@phosphor-icons/react`).
- **Bausteine:** `components/ui/primitives.tsx` (CoinIcon, Change, Sparkline, PriceChart, Note, EmptyState, Segmented), `components/Modal.tsx`, `components/MarketTable.tsx`.
- **Mobil:** Navigation als Tab-Leiste unten, Dialoge als Bottom-Sheet.
- **Bewegung:** kurze CSS-Übergänge, respektiert `prefers-reduced-motion`.

## Wo wird das Demo-Guthaben gespeichert?

Ausschließlich im Browser, in `window.localStorage`:

- Schlüssel `kryo-demo:v1` – aktive Sitzung und alle Demo-Profile mit Guthaben und Transaktionen

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

Zurücksetzen: Button „Alle Daten zurücksetzen“ in der Wallet, oder in den Browser-DevTools `localStorage.removeItem('kryo-demo:v1')`.
