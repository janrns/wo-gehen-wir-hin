# Wo gehen wir hin?

Eine App, mit der Freunde nach dem Swipe-and-Match-Prinzip Restaurants und Bars für ihr nächstes Treffen finden.

## Idee

1. Eine Person startet eine Runde und lädt Freunde per Link ein.
2. Alle swipen unabhängig voneinander durch Vorschläge für Restaurants und Bars (rechts = gefällt mir, links = eher nicht).
3. Eine Live-Rangliste zeigt, was der Gruppe am besten gefällt. Mögen alle denselben Ort, gibt es ein **Perfect Match**.

Details: [KONZEPT.md](KONZEPT.md) · Risikoanalyse: [REDTEAMING.md](REDTEAMING.md) · Einrichtung: [DEPLOY.md](DEPLOY.md), [PLACES-SETUP.md](PLACES-SETUP.md)

## Stand

Woche 1 ✅: Grundgerüst mit **ausgedachten Beispiel-Lokalen**, live unter <https://wo-gehen-wir-hin.web.app>.
Woche 2: Anbindung an Google Places (Ortssuche, Fotos, Öffnungszeiten, Adresssuche, Karte).

## Aufbau

| Ordner/Datei | Inhalt |
|---|---|
| `src/` | Web-App (React + TypeScript + Vite, PWA) |
| `functions/` | Cloud Functions: Runde erstellen/beitreten/beenden, Rangliste berechnen, Aufräumen |
| `firestore.rules` | Zugriffsregeln der Datenbank |
| `tests/` | Tests der Zugriffsregeln |

## Lokal entwickeln

Voraussetzungen: Node.js 22 und Java 21 (für die Firebase-Emulatoren).

```bash
npm install
npm --prefix functions install
npm --prefix functions run build

# Beispiel-Lokale statt Google verwenden (Datei wird nicht eingecheckt)
echo "PLACES_API_KEY=sample" > functions/.secret.local

# Terminal 1: Firebase-Emulatoren (Auth, Firestore, Functions)
npm run emulators

# Terminal 2: App gegen die Emulatoren starten → http://localhost:5173
npm run dev:emu
```

Tests: `npm test` (Rangliste + Zugriffsregeln).

## Veröffentlichen

Automatisch: Jeder Push auf `main` wird nach erfolgreichen Tests per GitHub Actions auf Firebase veröffentlicht
(Secret `FIREBASE_SERVICE_ACCOUNT`, Einrichtung siehe [DEPLOY.md](DEPLOY.md)).

Manuell (mit installiertem Node.js):

```bash
npx firebase login
npm run deploy
```

Die App ist unter <https://wo-gehen-wir-hin.web.app> erreichbar.
