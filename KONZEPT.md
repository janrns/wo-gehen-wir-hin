# Wo gehen wir hin? – Grobkonzept

Stand: Oktober 2026 · Version 0.1

## 1. Idee in einem Satz

Freunde starten per Link eine gemeinsame Runde, swipen unabhängig voneinander durch Restaurants und Bars in der Nähe – und sobald alle denselben Ort mögen, steht fest, wo es hingeht.

## 2. Rahmenbedingungen

| Punkt | Entscheidung |
|---|---|
| Plattform | Web-App als PWA (läuft im Browser, kann auf den Home-Bildschirm gelegt werden) |
| Ortsdaten | Google Places API (New) |
| Backend / Datenbank | Firebase (Firestore, Authentication, Hosting, Cloud Functions) |
| Zielgruppe | Zunächst nur der eigene Freundeskreis |
| Sprache | Deutsch |
| Zeitrahmen | Erste echte Nutzung in ca. 3 Wochen |
| Rollen | Claude programmiert, getestet wird gemeinsam |

## 3. Ablauf aus Nutzersicht

### 3.1 Runde erstellen
1. Person A öffnet die App und gibt ihren **Namen** ein (keine Registrierung nötig).
2. A legt die Suche fest:
   - **Ausgangspunkt:** aktueller Standort oder eingegebene Adresse/Stadt
   - **Umkreis:** z. B. 1 / 2 / 5 / 10 km
   - **Art:** Restaurant, Bar, Café (Mehrfachauswahl)
   - **Preisniveau:** € bis €€€€ (Mehrfachauswahl)
   - **Geöffnet um:** optional Datum + Uhrzeit des geplanten Treffens
3. Die App sucht passende Orte (ca. 20–30) und erstellt die Runde.
4. A bekommt einen **Einladungslink** und teilt ihn z. B. per WhatsApp.

### 3.2 Beitreten und swipen
1. Freunde öffnen den Link, geben ihren Namen ein und sind dabei.
2. Alle sehen **denselben Stapel** an Vorschlägen in derselben Reihenfolge.
3. Jede Karte zeigt: **Foto, Name, Bewertung, Preisniveau, Entfernung, Art/Küche**.
4. **Rechts wischen** = gefällt mir, **links wischen** = eher nicht. Alternativ Buttons für alle, die nicht wischen möchten.
5. Antippen einer Karte öffnet eine **Detailansicht** mit kleiner Karte (Lage) und Button **„In Google Maps öffnen“**.
6. Jeder swipt, wann er Zeit hat – es muss niemand gleichzeitig online sein.

### 3.3 Match und Ergebnis
- **Match:** Ein Ort, den **alle** Teilnehmenden mit „gefällt mir“ markiert haben. Es erscheint sofort live bei allen.
- **Rangliste:** Gibt es (noch) kein volles Match, sehen alle die beliebtesten Orte („4 von 5 mögen das“).
- Ergebnisansicht mit „In Google Maps öffnen“ (Navigation, Öffnungszeiten, Telefonnummer für Reservierung).
- Die Ersteller-Person kann die Runde beenden.

## 4. Funktionsumfang

### Version 1 (Ziel: in 3 Wochen nutzbar)
- Runde erstellen mit Filtern (Ausgangspunkt, Umkreis, Art, Preisniveau, Geöffnet um)
- Beitreten per Link nur mit Namen
- Swipe-Karten inkl. Detailansicht mit Karte und Google-Maps-Link
- Match, wenn alle zustimmen, plus Rangliste
- Live-Aktualisierung (wer ist dabei, wer ist fertig, Match)
- Als PWA installierbar, optimiert fürs Handy
- Runden werden nach einigen Tagen automatisch gelöscht

### Spätere Ausbaustufen (Ideen)
- Anmeldung mit Google-Konto, „Meine Runden“, Freundesliste
- Karten-Ansicht aller Vorschläge
- Datum/Uhrzeit abstimmen, Kalendereintrag
- „Super-Like“ / Veto
- Weitere Filter (Küche, Mindestbewertung, vegetarisch …)
- Push-Benachrichtigung bei Match
- Optional später echte App für iOS/Android

## 5. Technik

### 5.1 Aufbau

```
Handy-Browser (PWA: React + TypeScript + Vite)
   │  Firebase SDK (live)               │  HTTPS
   ▼                                    ▼
Firestore (Runden, Teilnehmende,   Cloud Functions
Swipes)  ◄────────────────────────  - Orte suchen (Places API)
                                    - Match berechnen
Firebase Auth (anonym)              - API-Schlüssel bleibt geheim
Firebase Hosting (App ausliefern)
```

- **Frontend:** React + TypeScript, gebaut mit Vite, als PWA. Swipe-Gesten über eine kleine Bibliothek.
- **Anmeldung:** Firebase Anonymous Auth – jede Person bekommt im Hintergrund eine ID, sichtbar ist nur der eingegebene Name.
- **Ortssuche:** Eine Cloud Function ruft die Places API auf. So liegt der API-Schlüssel nie im Browser, und die Suche passiert einmal pro Runde statt einmal pro Person.
- **Karte in der Detailansicht:** Maps Embed API (kostenlos) bzw. Link zu Google Maps.

### 5.2 Datenmodell (Firestore)

```
sessions/{sessionId}
  createdBy:   uid
  createdAt:   Zeitstempel
  expiresAt:   Zeitstempel (automatisches Löschen)
  status:      "open" | "closed"
  search:      { center: {lat, lng}, label, radiusM, types[], priceLevels[], openAt | null }
  placeIds:    [placeId, …]        // Reihenfolge des Stapels
  matchPlaceId: placeId | null

sessions/{sessionId}/members/{uid}
  name:     "Anna"
  joinedAt: Zeitstempel
  done:     true | false
  votes:    { placeId: true | false, … }
```

- Die **Session-ID** ist lang und zufällig – nur wer den Link hat, kommt in die Runde.
- **Sicherheitsregeln:** Nur Teilnehmende lesen eine Runde; jede Person darf nur ihre eigenen Swipes schreiben.

### 5.3 Wichtige Hinweise zur Google Places API
- **Speichern:** Laut Google-Bedingungen dürfen wir dauerhaft nur die **Place-ID** speichern. Name, Fotos, Bewertungen usw. werden bei Bedarf frisch von Google geladen und nicht in Firestore abgelegt.
- **„Geöffnet um“:** Die API kennt nur „jetzt geöffnet“. Für einen späteren Zeitpunkt laden wir die regulären Öffnungszeiten und filtern selbst. Orte ohne Öffnungszeiten bleiben drin und werden markiert.
- **Preisniveau:** Nicht jeder Ort hat eine Angabe. Orte ohne Preisniveau bleiben drin (sonst fallen zu viele weg).
- **Kosten:** Abrechnung pro Anfrage, mit kostenlosem monatlichen Kontingent. Für einen Freundeskreis sollte das reichen. Wir fragen nur die nötigen Felder ab, setzen **Tageslimits** und eine **Budget-Warnung**.

### 5.4 Datenschutz (Freundeskreis-Version)
- Gespeichert werden nur: Vorname/Spitzname, Swipes, Suchort der Runde.
- Keine E-Mail, kein Passwort, kein Tracking.
- Runden werden nach z. B. 7 Tagen automatisch gelöscht.
- Vor einer öffentlichen Version: Datenschutzerklärung und Impressum ergänzen.

## 6. Einrichtung (einmalig, gemeinsam)

1. **Firebase-Projekt anlegen** auf <https://console.firebase.google.com> mit dem eigenen Google-Konto.
2. **Tarif „Blaze“ (nutzungsbasiert) aktivieren** – wird für Cloud Functions und den Aufruf externer APIs benötigt. Bei unserer Nutzung bleiben die Kosten voraussichtlich im kostenlosen Rahmen; eine **Budget-Warnung** (z. B. 5 €) wird gesetzt.
3. In der Google Cloud Console (gleiches Projekt) die **Places API (New)** und **Maps Embed API** aktivieren und einen API-Schlüssel mit Einschränkungen anlegen.
4. Den API-Schlüssel als **Secret** in Firebase hinterlegen (nicht ins Repo, nicht in den Chat).

## 7. Zeitplan (3 Wochen)

| Woche | Inhalt |
|---|---|
| 1 | Projekt-Grundgerüst, Firebase-Anbindung, Runde erstellen, Beitreten per Link, Swipe-Oberfläche mit Beispieldaten |
| 2 | Anbindung Places API, Filter, Match-Logik, Rangliste, Live-Updates, Detailansicht mit Karte |
| 3 | Feinschliff, PWA, Testrunden im Freundeskreis, Fehler beheben, Veröffentlichung auf Firebase Hosting |

## 8. Offene Punkte
- Name/Adresse der App (Firebase Hosting liefert kostenlos `<projekt>.web.app`; eigene Domain optional)
- Gestaltung: Farben, Logo, Stil
- Feinabstimmung: Anzahl Vorschläge, Standard-Umkreis, Löschfrist
