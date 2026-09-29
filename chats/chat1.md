# Bitget Website Design Demo

_Started 2026-09-29 13:02 UTC_

---

## User

Erstelle eine interaktive, responsive Design-Demo der Bitget-Website und der Bitget-Wallet. Orientiere dich für Layout, Farben, Typografie, Navigation, Icons und Komponenten möglichst genau an https://www.bitget.com/de. Verwende das Bitget-Logo als visuelle Referenz. Kennzeichne auf jeder Seite gut sichtbar „DEMO – kein echtes Bitget-Konto“.

Die Demo soll diese Seiten enthalten:
- Startseite mit Navigation, Hero-Bereich und Marktübersicht
- Anmeldebildschirm im Stil von Bitget
- Wallet-Dashboard mit Gesamtguthaben, Asset-Liste und Transaktionsverlauf
- Marktübersicht und einfache Trading-Ansicht

Baue einen funktionierenden Demo-Login. Nutzer sollen sich mit einem frei wählbaren Demo-Namen anmelden können. Frage keine echten Passwörter, Telefonnummern, E-Mail-Zugangsdaten oder Bitget-Codes ab. Die Anmeldung läuft ausschließlich lokal im Browser.

Wichtigste Wallet-Funktion: Ein Button „Demo-Guthaben hinzufügen“. Nach einem Klick kann der Nutzer einen Betrag eingeben und eine Demo-Währung auswählen, zum Beispiel USDT, BTC oder ETH. Das Guthaben und der Transaktionsverlauf sollen sich sofort aktualisieren und nach einem Neuladen im Browser erhalten bleiben. Ergänze eine Funktion zum Zurücksetzen aller Demo-Daten.

Kaufen, Verkaufen und Übertragen dürfen als Simulation innerhalb der Demo funktionieren. Zeige vor jeder Aktion deutlich, dass kein echtes Geld und keine echten Kryptowährungen bewegt werden. Keine echte Wallet-Verbindung, keine Zahlungsabwicklung und keine Anbindung an ein Bitget-Konto.

Setze das Projekt mit Next.js, TypeScript und Tailwind CSS um. Gestalte Desktop und Mobilansicht sorgfältig. Verwende nachvollziehbare Beispieldaten und liefere am Ende die Startanleitung sowie eine kurze Erklärung, wo das Demo-Guthaben im Code gespeichert wird.

## Assistant



## User

Answered — brand: Bitget; purpose: Portfolio / Design-Showcase; theme: Umschaltbar; trading_depth: Einfach: Chart + Kaufen/Verkaufen; prices: Statisch; delivery: Interaktiver Prototyp hier, danach Next.js-Übergabe

## Assistant

Eine möglichst genaue Nachbildung der Bitget-Website mit Bitget-Logo kann ich nicht bauen. Das Design ist markengeschützt, und ein täuschend echter Klon mit frei aufladbarem Guthaben lässt sich leicht für gefälschte Kontostände oder Phishing missbrauchen, auch mit Demo-Hinweis.

Ich kann dir aber eine eigenständige Krypto-Börse mit Wallet unter einer erfundenen Marke bauen. Alle gewünschten Funktionen bleiben drin: lokaler Demo-Login, „Demo-Guthaben hinzufügen“, Speicherung im Browser, Zurücksetzen, simuliertes Kaufen/Verkaufen/Übertragen mit Warnhinweisen, Desktop- und Mobilansicht.

_[tool: ask_user]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: update_todos]_

_[tool: dc_write]_

Die Marke bleibt fiktiv („Kryo“): eine Nachbildung unter dem Namen und Logo von Bitget baue ich nicht. Deine anderen Antworten setze ich um: Hell/Dunkel umschaltbar und statische Kurse.

_[tool: run_script]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_set_props]_

_[tool: run_script]_

_[tool: show_html]_

Prototyp steht. Jetzt das Next.js-Projekt.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: update_todos]_

_[tool: ready_for_verification]_

Beides ist fertig: der interaktive Prototyp (**Kryo Demo.dc.html**) und das Next.js-Projekt im Ordner `nextjs/`. Das Next.js-Projekt habe ich hier nicht gebaut oder gestartet. Nach `npm install` kann es beim ersten Build noch kleine Fehler geben.

**Zur Marke:** Name, Logo und Look von Bitget habe ich nicht übernommen. Stattdessen heißt die Demo „Kryo“ und hat ein eigenes, schlichtes Design. Das Banner auf jeder Seite lautet deshalb „DEMO – kein echtes Konto“.

**Was drin ist:**
- **Seiten:** Startseite, Anmeldung, Wallet, Märkte und Handel.
- **Anmeldung:** nur ein frei gewählter Demo-Name, kein Passwort und keine anderen Zugangsdaten.
- **Demo-Guthaben hinzufügen:** Betrag eingeben und eine von 9 Demo-Währungen wählen.
- **Simulationen:** Kaufen, Verkaufen und Übertragen. Vor jeder Aktion erscheint ein roter Hinweis, dass kein echtes Geld bewegt wird.
- **Weitere Funktionen:** alles zurücksetzen, Hell/Dunkel umschalten, Desktop- und Mobilansicht.
- **Kurse:** feste Beispielwerte. Über die Tweaks lassen sich schwankende Kurse und eine Anzeige in EUR einschalten.

**Start (Next.js):**
```
cd nextjs
npm install
npm run dev
```
Dann http://localhost:3000 öffnen. Du brauchst Node.js 18.17 oder neuer.

**Wo das Demo-Guthaben gespeichert wird:** nur im Browser, unter dem Schlüssel `kryo-demo:v1`. Darin liegen die aktive Sitzung und alle Demo-Profile mit Guthaben und Transaktionen, sodass alles nach einem Neuladen erhalten bleibt.
- `lib/storage.ts` liest, schreibt und löscht diese Daten.
- `lib/DemoContext.tsx` lädt sie beim Start und speichert jede Änderung sofort. Dort stehen auch die Funktionen für Aufladen, Handeln, Übertragen und Zurücksetzen.

Alles Weitere steht in `nextjs/README.md`.

