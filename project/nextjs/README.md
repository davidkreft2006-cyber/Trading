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
- `/wallet` Gesamtguthaben, Assets (antippen für Details), Transaktionsverlauf, „Guthaben hinzufügen“, Übertragen
- `/settings` Einstellungen (über Profilbild/Name im Header): Name, Passwort ändern, Abmelden, Guthaben zurücksetzen
- `/markets` Alle Märkte mit Kategorien (Krypto, Aktien, ETFs, Rohstoffe), Filter und Suche; per `?cat=stock|etf|commodity|crypto` direkt ansteuerbar
- `/trade?pair=BTC` Chart + Kaufen/Verkaufen, Paarwahl mit Suche

Die Oberfläche tritt wie ein normales Produkt auf, ohne Demo-Banner. Hinweise, dass kein echtes Geld im Spiel ist, stehen im Dialog „Guthaben hinzufügen“ („Ohne realen Gegenwert“) und bei jeder Einzahlung im Transaktionsverlauf („Manuell aufgeladen“). Kaufen, Verkaufen und Zurücksetzen zeigen vorher eine Übersicht zur Bestätigung.

## Anlageklassen und Kurse

99 Kryptowährungen (plus USDT als Abrechnungswährung), 100 Aktien (USA, Europa, Asien), 4 ETFs, 3 Rohstoffe, definiert in `lib/data.ts`. Alles wird mit USDT gekauft (1 USDT = 1 USD). Aufladen geht nur mit USDT und 8 großen Coins (`FUNDABLE`). Auf der Startseite stehen zuerst BTC, ETH, SOL, XRP sowie NVIDIA, Apple, Microsoft, Tesla; alles andere unter „Märkte“ (Suche, Kategorien, Gewinner/Verlierer, Region bei Aktien, 50 Zeilen je Seite).

**Eindeutige Kennungen:** Das Anzeige-Kürzel (`sym`) ist zugleich der Schlüssel in der Datenbank. Für die Kursabfrage hat jedes Instrument zusätzlich die Kennung des Anbieters (`ids`), weil Kürzel je Börse bzw. Coin nicht eindeutig sind:

- Krypto: CoinGecko-ID (z. B. `avalanche-2`, `fetch-ai`) und, wo vorhanden, das Binance-Paar (`AVAXUSDT`)
- Aktien, ETFs, Rohstoffe: Yahoo-Symbol mit Börsensuffix (`SAP.DE`, `NOVO-B.CO`, `7203.T`, `BRK-B`, `GC=F`)

Die Suche findet auch diese Kennungen. Auf der Handelsseite und in der Asset-Ansicht steht die verwendete Kursquelle.

Echte Kurse (`lib/quotes.tsx`, ohne API-Schlüssel):

- **Krypto:** `app/api/crypto/route.ts` holt alle Coins in einer Abfrage von CoinGecko (`/coins/markets` inkl. 24h-Verlauf), 60 s CDN-Cache; optional `COINGECKO_API_KEY` (Demo-Key) für ein höheres Limit. Coins mit Binance-Paar zusätzlich direkt im Browser: REST (`data-api.binance.vision`, paketweise, damit ein nicht gelistetes Paar nicht alles blockiert) und WebSocket (`data-stream.binance.vision`) für sekündliche Updates. Detailverlauf (15-Min-Kerzen) wird nur für das gerade angesehene Instrument geladen.
- **Aktien, ETFs, Rohstoffe:** `app/api/quotes/route.ts` holt den Chart-Endpunkt von Yahoo Finance serverseitig (max. 16 Anfragen gleichzeitig), 60 s CDN-Cache. Nicht-USD-Börsen werden mit aktuellen Devisenkursen (`EURUSD=X` usw., London in Pence) in USD umgerechnet; der Börsenkurs in Originalwährung wird zusätzlich angezeigt. Kurse können bis zu 15 Min. verzögert sein.
- **Ausfall:** Die ursprünglichen 20 Instrumente haben Beispielwerte als Ausweichkurs. Alle anderen zeigen „–“ und sind erst handelbar, wenn ein Live-Kurs da ist.
- Käufe/Verkäufe laufen zum Kurs, der in der Bestätigung angezeigt wurde.
- Neue Instrumente: in `lib/data.ts` eintragen **und** in der Datenbank-Funktion `app_private.assets()` ergänzen (Liste erlaubter Assets).

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
- **Auth-Proxy:** Alle Auth-Anfragen laufen über `/api/auth/*` auf der eigenen Domain (`app/api/auth/[...path]/route.ts`) und werden an Neon Auth weitergeleitet. So ist das Sitzungs-Cookie ein First-Party-Cookie; Safari/iOS verwirft Cookies von `*.neon.tech` sonst und man wäre sofort wieder abgemeldet. Ziel überschreibbar mit `NEON_AUTH_BASE_URL`.
- **Zugriff aus dem Browser:** Neon Data API (PostgREST) über `@neondatabase/neon-js`. Die Projekt-URL steht in `lib/neon.ts` (öffentlich, wie ein Supabase-Anon-Key); überschreibbar mit `NEXT_PUBLIC_NEON_URL`. In Vercel muss nichts eingestellt werden.
- **Tabellen:** `balances (user_id, asset, amount)` und `transactions (id, user_id, created_at, type, asset, amount, price, total, counterparty)`. Row-Level Security: angemeldete Nutzer dürfen nur ihre eigenen Zeilen **lesen**; Schreiben direkt ist gesperrt.
- **Schreiben nur über geprüfte Funktionen** (SECURITY DEFINER, prüfen Beträge und Guthaben serverseitig, Fehlermeldungen auf Deutsch): `add_funds(p_asset, p_amount)`, `execute_trade(p_side, p_asset, p_qty, p_price)`, `transfer_out(p_asset, p_amount, p_to)`, `reset_account()`. Hilfsfunktionen liegen im nicht erreichbaren Schema `app_private`.

Im Code:

- `lib/neon.ts` – Client und Übersetzung der Auth-Fehler
- `lib/AccountContext.tsx` – React-Context: Sitzung, Guthaben, Verlauf, `signIn`, `signUp`, `signOut`, `requestPasswordCode`, `resetPassword`, `addFunds`, `trade`, `transfer`, `resetAll`
- `components/AuthShell.tsx` – gemeinsames Layout und Felder der Anmeldeseiten

Zurücksetzen: „Zurücksetzen“ in der Wallet löscht Guthaben und Verlauf des Kontos (das Konto bleibt).
