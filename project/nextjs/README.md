# Auvryn – Krypto-Börse & Wallet

Unabhängiges Projekt mit echten Konten (Neon) und Live-Kursen, aber ohne echtes Geld: keine Wallet-Verbindung, keine Zahlungsabwicklung, keine Anbindung an eine echte Börse. Guthaben wird manuell aufgeladen.

## Start

Voraussetzung: Node.js 18.17 oder neuer.

```bash
cd nextjs
npm install
npm run dev
```

Dann http://localhost:3000 öffnen. Produktions-Build: `npm run build && npm start`.

## Seiten

- `/` Startseite: Hero, Krypto-Übersicht, Sektion „Aktien, ETFs und Rohstoffe“
- `/login` Anmelden mit E-Mail und Passwort
- `/register` Konto anlegen (Name, E-Mail, Passwort)
- `/forgot-password` Passwort zurücksetzen per 6-stelligem E-Mail-Code
- `/wallet` Gesamtguthaben, Assets, Transaktionsverlauf, „Guthaben hinzufügen“, Übertragen, Zurücksetzen
- `/markets` Alle Märkte mit Kategorien (Krypto, Aktien, ETFs, Rohstoffe), Filter und Suche; per `?cat=stock|etf|commodity|crypto` direkt ansteuerbar
- `/trade?pair=BTC` Chart + Kaufen/Verkaufen (Simulation)

Die Oberfläche tritt wie ein normales Produkt auf, ohne Demo-Banner. Hinweise, dass kein echtes Geld im Spiel ist, stehen im Dialog „Guthaben hinzufügen“ („Ohne realen Gegenwert“) und bei jeder Einzahlung im Transaktionsverlauf („Manuell aufgeladen“). Kaufen, Verkaufen und Zurücksetzen zeigen vorher eine Übersicht zur Bestätigung.

## Anlageklassen und Kurse

8 Kryptowährungen, 6 Aktien, 4 ETFs, 3 Rohstoffe (`lib/data.ts`). Aktien, ETFs und Rohstoffe notieren in USD und werden mit USDT gekauft (1 USDT = 1 USD). Aufladen geht nur mit USDT und Krypto (`FUNDABLE`).

Echte Kurse (`lib/quotes.tsx`, ohne API-Schlüssel):

- **Krypto:** Binance-Marktdaten direkt im Browser. REST (`data-api.binance.vision`) für Startwerte und 24h-Verlauf (15-Min-Kerzen), WebSocket (`data-stream.binance.vision`) für sekündliche Updates, bei Ausfall REST-Abfrage alle 15 s.
- **Aktien, ETFs, Rohstoffe:** Route `app/api/quotes/route.ts` holt den Chart-Endpunkt von Yahoo Finance serverseitig (Yahoo erlaubt keine Browser-Abfragen); 60 s CDN-Cache. Gold/Silber/Brent als Futures (`GC=F`, `SI=F`, `BZ=F`). Kurse können bis zu 15 Min. verzögert sein.
- **Ausfall:** Fehlt eine Quelle, bleiben die Beispielwerte aus `lib/data.ts` stehen, der Hinweis zeigt „Beispielkurse“.
- Käufe/Verkäufe laufen zum Kurs, der in der Bestätigung angezeigt wurde.

## Designsystem

- **Schrift:** Geist (Text) und Geist Mono (alle Zahlen, tabellarisch) über das Paket `geist`.
- **Farben:** immer Dunkelmodus (kein Umschalter). Navy-getönte Flächen aus dem Logo-Navy, Türkis aus dem Logo als einziger Akzent. Grün/Rot nur für Kursrichtung und Kauf/Verkauf (Grün bewusst gelblicher als das Türkis), immer mit Vorzeichen und Pfeil; mit dem Palette-Validator geprüft. Tokens in `app/globals.css`.
- **Logo:** `public/brand/auvryn-logo.png` (Schriftzug für dunklen Grund aufgehellt) und `public/brand/auvryn-mark.png` (Zeichen, mobil im Header); Favicon `app/icon.png`.
- **Radien:** Buttons, Umschalter und Paar-Chips als Pill; Eingabefelder und Auswahlraster 6 px; Panels 10 px; Coin-Marken 4 px.
- **Buttons:** `LiquidButton` aus `components/ui/liquid-glass-button.tsx`, alle Varianten als durchscheinendes Glas (`primary` = türkises Glas mit Schein, `glass`, `buy`, `sell`, `danger`, `ghost`, `destructive`). Der SVG-Filter `<GlassFilter />` wird einmal in `app/layout.tsx` gerendert; die Verzerrung wirkt nur in Chromium, andere Browser zeigen die Glaskante ohne Verzerrung.
- **Signatur-CTA:** `ShinyButton` aus `components/ui/shiny-button.tsx` (Styles in `shiny-button.css`), bewusst nur für den Einstieg: „Loslegen“/„Zur Wallet“ auf der Startseite. Unterstützt `href` (Link) und `type` (Formular).
- **shadcn-Struktur:** `components.json`, `lib/utils.ts` (`cn`), Komponenten in `components/ui/`. Die shadcn-Farbnamen (`primary`, `secondary`, `destructive`, `ring` …) sind in `tailwind.config.ts` auf die Auvryn-Tokens abgebildet.
- **Icons:** Phosphor (`@phosphor-icons/react`).
- **Bausteine:** `components/ui/primitives.tsx` (CoinIcon, Change, Sparkline, PriceChart, Note, EmptyState, Segmented), `components/Modal.tsx`, `components/MarketTable.tsx`.
- **Mobil:** Navigation als Tab-Leiste unten, Dialoge als Bottom-Sheet.
- **Bewegung:** kurze CSS-Übergänge, respektiert `prefers-reduced-motion`.

## Konto und Datenbank (Neon)

Konten, Guthaben und Verlauf liegen in **Neon Postgres** (Projekt `auvryn`, ID `lively-bird-26926118`, Region Frankfurt `aws-eu-central-1`, Branch `main`, Datenbank `neondb`).

- **Anmeldung:** Neon Auth (Better Auth). E-Mail + Passwort, keine E-Mail-Bestätigung nötig. Passwort-Reset per 6-stelligem Code (E-Mails kommen vom Neon-Absender). Vertrauenswürdige Domain: `https://trading-nine-lemon.vercel.app`; für eine neue Domain in der Neon-Konsole unter Auth → Domains ergänzen.
- **Zugriff aus dem Browser:** Neon Data API (PostgREST) über `@neondatabase/neon-js`. Die Projekt-URL steht in `lib/neon.ts` (öffentlich, wie ein Supabase-Anon-Key); überschreibbar mit `NEXT_PUBLIC_NEON_URL`. In Vercel muss nichts eingestellt werden.
- **Tabellen:** `balances (user_id, asset, amount)` und `transactions (id, user_id, created_at, type, asset, amount, price, total, counterparty)`. Row-Level Security: angemeldete Nutzer dürfen nur ihre eigenen Zeilen **lesen**; Schreiben direkt ist gesperrt.
- **Schreiben nur über geprüfte Funktionen** (SECURITY DEFINER, prüfen Beträge und Guthaben serverseitig, Fehlermeldungen auf Deutsch): `add_funds(p_asset, p_amount)`, `execute_trade(p_side, p_asset, p_qty, p_price)`, `transfer_out(p_asset, p_amount, p_to)`, `reset_account()`. Hilfsfunktionen liegen im nicht erreichbaren Schema `app_private`.

Im Code:

- `lib/neon.ts` – Client und Übersetzung der Auth-Fehler
- `lib/AccountContext.tsx` – React-Context: Sitzung, Guthaben, Verlauf, `signIn`, `signUp`, `signOut`, `requestPasswordCode`, `resetPassword`, `addFunds`, `trade`, `transfer`, `resetAll`
- `components/AuthShell.tsx` – gemeinsames Layout und Felder der Anmeldeseiten

Zurücksetzen: „Zurücksetzen“ in der Wallet löscht Guthaben und Verlauf des Kontos (das Konto bleibt).
