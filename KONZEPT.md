# Wo gehen wir hin? – Grobkonzept

Stand: Oktober 2026 · Version 0.2 (nach [Red-Teaming](REDTEAMING.md))

## 1. Idee in einem Satz

Freunde starten per Link eine gemeinsame Runde, swipen unabhängig voneinander durch Restaurants und Bars in der Nähe und sehen live, welcher Ort der Gruppe am besten gefällt. Mögen alle denselben Ort, gibt es ein „Perfect Match“.

## 2. Rahmenbedingungen

| Punkt | Entscheidung |
|---|---|
| Plattform | Web-App als PWA (läuft im Browser, kann auf den Home-Bildschirm gelegt werden) |
| Ortsdaten | Google Places API (New) |
| Backend / Datenbank | Firebase (Firestore, Authentication, Hosting, Cloud Functions, App Check), Standort Frankfurt |
| Zielgruppe | Zunächst nur der eigene Freundeskreis |
| Sprache | Deutsch |
| Zeitrahmen | Erste echte Nutzung in ca. 3 Wochen |
| Rollen | Claude programmiert, getestet wird gemeinsam |
| Gestaltung | Sehr heller, pastelliger Peach-Ton (siehe Abschnitt 6) |

## 3. Ablauf aus Nutzersicht

### 3.1 Runde erstellen
1. Person A öffnet die App und gibt ihren **Namen** ein (keine Registrierung nötig).
2. A legt die Suche fest:
   - **Ausgangspunkt:** aktueller Standort (Standard) oder Adresse/Stadt mit Autovervollständigung
   - **Umkreis:** 1 / 2 / 5 / 10 km
   - **Art:** Restaurant, Bar, Café (Mehrfachauswahl)
   - **Preisniveau:** € bis €€€€ (Mehrfachauswahl; Orte ohne Angabe bleiben drin)
   - **Geöffnet:** optional „am … ab … Uhr für … Stunden“ (Standard 2 Std.)
3. Die App sucht passende Orte (Ziel 20–30). Gibt es zu wenige, wird der Umkreis automatisch erweitert, und die App weist darauf hin.
4. A bekommt einen **Einladungslink** und teilt ihn z. B. per WhatsApp.

### 3.2 Beitreten und swipen
1. Freunde öffnen den Link, geben ihren Namen ein und sind dabei.
2. Ist der Name schon in der Runde, fragt die App: „Bist du *Anna*? → weitermachen“. Das ist für den Fall, dass jemand das Gerät oder den Browser gewechselt hat.
3. Alle sehen **denselben Stapel** in derselben Reihenfolge.
4. Jede Karte zeigt: **Foto, Name, Bewertung, Preisniveau, Entfernung zum Treffpunkt, Art/Küche** und gegebenenfalls „Öffnungszeiten prüfen“.
5. **Rechts wischen** = gefällt mir, **links wischen** = eher nicht. Zusätzlich gibt es Buttons mit Symbolen (♥ / ✕), nicht nur Farben.
6. Antippen einer Karte öffnet eine **Detailansicht** mit kleiner Karte und dem Button **„In Google Maps öffnen“**.
7. Jeder swipt, wann er Zeit hat. Mit **„Ich bin fertig“** kann man auch vor der letzten Karte aufhören.

### 3.3 Zwischenstand und Ergebnis
- **Live-Zwischenstand:** Rangliste der Orte und wer schon fertig ist.
- **Rangliste:** sortiert nach Zustimmungsquote unter denen, die die Karte gesehen haben. Bei Gleichstand zählen mehr Likes, dann die bessere Google-Bewertung, dann die geringere Entfernung. Nicht geswipte Karten zählen nicht als Ablehnung.
- **Perfect Match 🎉:** ein Ort, den alle Teilnehmenden mögen. Ab 4 Personen ist das selten, deshalb ist die Rangliste das eigentliche Ergebnis.
- **Endergebnis:** Es steht fest, wenn alle fertig sind oder die Ersteller-Person die Runde beendet. Danach kann niemand mehr beitreten.
- Die Ersteller-Person kann Teilnehmende entfernen.
- Ergebnisansicht mit „In Google Maps öffnen“ (Navigation, Öffnungszeiten, Telefonnummer für Reservierung).
- *Offen (A4):* Sieht man, wer welchen Ort mag, oder nur die Summe? Vorschlag: **nur die Summe**.

## 4. Funktionsumfang

### Version 1 (Ziel: in 3 Wochen nutzbar)
**Kern, der in jedem Fall fertig wird:**
- Runde erstellen (Standort, Umkreis, Art, Preisniveau)
- Beitreten per Link, Wiedererkennen über den Namen
- Swipe-Karten
- Live-Rangliste, Perfect Match, Runde beenden

**Ebenfalls geplant. Wird es eng, streichen wir in dieser Reihenfolge:**
1. Filter „Geöffnet“ (zur Not nur „heute Abend geöffnet“)
2. Detailansicht mit eingebetteter Karte (zur Not nur Google-Maps-Link)
3. Adresseingabe statt Standort

**Außerdem:** als PWA installierbar, fürs Handy optimiert, automatisches Löschen nach 7 Tagen.

### Spätere Ausbaustufen (Ideen)
- Anmeldung mit Google-Konto, „Meine Runden“, Freundesliste
- Kartenansicht aller Vorschläge
- Datum/Uhrzeit abstimmen, Kalendereintrag
- „Super-Like“ / Veto
- Weitere Filter (Küche, Mindestbewertung, vegetarisch …)
- Push-Benachrichtigung bei Match
- Optional später echte App für iOS/Android

## 5. Technik

### 5.1 Aufbau

```
Handy-Browser (PWA: React + TypeScript + Vite)
   │  Firebase SDK (live)                │  HTTPS + App Check
   ▼                                     ▼
Firestore (Frankfurt)                Cloud Functions (Frankfurt)
 Runden, Teilnehmende,  ◄──────────  - Orte suchen (Places Text Search)
 Rangliste                           - Rangliste / Match berechnen
                                     - Wiedererkennen per Name
Firebase Auth (anonym)               - Aufräumen (täglich)
Firebase Hosting (App ausliefern)    - Limits pro Person
```

- **Frontend:** React + TypeScript, gebaut mit Vite, als PWA.
- **Anmeldung:** Firebase Anonymous Auth. Jede Person bekommt im Hintergrund eine ID, sichtbar ist nur der eingegebene Name.
- **Ortssuche:** über eine Cloud Function mit **Text Search** (bis zu 60 Ergebnisse, Preis- und Typfilter direkt bei Google). Der API-Schlüssel bleibt auf dem Server.
- **Schutz vor Missbrauch:** Firebase App Check, nur angemeldete Nutzer, Begrenzung der Suchen pro Person und Tag.
- **Adresseingabe:** Places Autocomplete.
- **Karte in der Detailansicht:** Maps Embed API (kostenlos), Schlüssel auf unsere Domain beschränkt.
- **Region:** `europe-west3` (Frankfurt) für Firestore und Functions.

### 5.2 Datenmodell (Firestore)

```
sessions/{sessionId}
  createdBy:    uid
  createdAt, expiresAt
  status:       "open" | "closed"
  search:       { center: {lat, lng} (auf ~200 m gerundet), label (Stadtteil),
                  radiusM, types[], priceLevels[], openFrom | null, openHours }
  placeIds:     [placeId, …]                // Reihenfolge des Stapels
  ranking:      [{ placeId, likes, seen }, …]  // nur Server schreibt
  perfectMatchIds: [placeId, …]             // nur Server schreibt

sessions/{sessionId}/members/{uid}
  name, joinedAt, expiresAt
  done:     true | false
  removed:  true | false                    // nur Ersteller/Server

sessions/{sessionId}/votes/{uid}
  expiresAt
  votes:    { placeId: true | false, … }    // nur eigene Person liest/schreibt
```

- Die **Session-ID** ist lang und zufällig. Nur wer den Link hat, kommt in die Runde. Ein Auflisten aller Runden ist gesperrt.
- **Swipes bleiben privat:** Jede Person sieht nur ihre eigenen. Der Server berechnet daraus die Rangliste.
- **Sicherheitsregeln:** Clients schreiben nur den eigenen Namen, den Fertig-Status und Swipes auf Orte dieser Runde. Rangliste, Match, Status und Ersteller setzt nur der Server. Die Regeln werden mit automatischen Tests abgesichert.
- **Löschen:** Jedes Dokument hat ein eigenes `expiresAt` (Firestore-TTL), dazu kommt eine tägliche Aufräumfunktion. Die TTL löscht keine Unterdokumente mit.

### 5.3 Google Places API
- **Speichern:** Dauerhaft speichern wir nur die **Place-ID**. Name, Fotos und Bewertungen kommen frisch von Google. Ob wir Details für die Dauer einer Runde zwischenspeichern dürfen, prüfen wir vor Woche 2 in den Google-Bedingungen für den EWR.
- **Öffnungszeiten:** Für Termine in den nächsten 7 Tagen nutzen wir die tagesaktuellen Öffnungszeiten von Google, die Feiertage und Sonderzeiten enthalten. Bei fehlenden Angaben bekommt die Karte den Hinweis „Öffnungszeiten prüfen“.
- **Typen:** Pro Kategorie fassen wir mehrere Google-Typen zusammen, etwa bar, pub und wine_bar. Wir justieren in der Testphase nach.
- **Kosten:**
  - Wir fragen nur die nötigen Felder ab.
  - Pro Karte laden wir ein Foto in kleiner Auflösung.
  - In der Google Cloud Console setzen wir **harte Tageslimits (Quotas)**. Die sind die eigentliche Kostenbremse, denn eine Budget-Warnung schickt nur eine E-Mail.
  - In Woche 2 messen wir die echten Kosten mit einer Testrunde.

### 5.4 Datenschutz (Freundeskreis-Version)
- Gespeichert werden nur: Vorname/Spitzname, Swipes und der gerundete Suchort der Runde.
- Keine E-Mail, kein Passwort, kein Tracking.
- Runden werden nach 7 Tagen automatisch gelöscht.
- Schriften liefern wir selbst aus, nicht über Google Fonts.
- Vor einer öffentlichen Version: Datenschutzerklärung (inkl. Google-Dienste) und Impressum ergänzen.

## 6. Gestaltung

Leicht, freundlich, viel Weißraum. Die Grundfarbe ist ein sehr heller, pastelliger Peach-Ton.

| Rolle | Farbe | Verwendung |
|---|---|---|
| Hintergrund | `#FFF7F2` | App-Hintergrund |
| Fläche | `#FFE9DD` | Karten, Eingabefelder |
| Peach (Akzent) | `#FBC9B0` | Buttons, aktive Filter, „gefällt mir“ |
| Peach kräftig | `#F2A285` | Hervorhebungen, Perfect Match |
| Text | `#3B2A25` | Schrift (gut lesbar auf allen Peach-Tönen) |
| Neutral | `#B8AAA4` | „eher nicht“, Nebeninfos |

Erste Werte, die wir am echten Bildschirm feinjustieren. Schrift auf Peach-Flächen ist immer dunkel, damit der Kontrast stimmt. Die Bedeutung hängt nie nur an der Farbe, es gibt immer auch Symbole.

## 7. Einrichtung (Woche 0, gemeinsam)

1. **Firebase-Projekt anlegen** auf <https://console.firebase.google.com> mit dem eigenen Google-Konto. Google Analytics ist nicht nötig.
2. **Tarif „Blaze“ aktivieren.** Er wird für Cloud Functions und externe APIs benötigt. Dazu eine **Budget-Warnung** setzen (z. B. 5 €).
3. **Firestore anlegen mit Standort `europe-west3` (Frankfurt).** Der lässt sich später nicht ändern.
4. In der Google Cloud Console (gleiches Projekt):
   - **Places API (New)** und **Maps Embed API** aktivieren
   - **Tageslimits (Quotas)** setzen, Werte stimmen wir ab
   - API-Schlüssel anlegen und auf diese APIs beschränken
5. Den API-Schlüssel als **Secret** in Firebase hinterlegen (nicht ins Repo, nicht in den Chat).

## 8. Zeitplan

| Woche | Inhalt |
|---|---|
| 0 | Einrichtung Firebase/Google Cloud (siehe Abschnitt 7) |
| 1 | Grundgerüst, Gestaltung, Runde erstellen, Beitreten per Link, Swipe-Oberfläche mit Beispieldaten, Sicherheitsregeln |
| 2 | Places-Anbindung, Filter, Rangliste/Match, Live-Updates, Kostenmessung |
| 3 | Feinschliff, PWA, Testrunden auf iPhone und Android, Veröffentlichung auf Firebase Hosting |

## 9. Offene Punkte
- **A4:** Einzelne Swipes sichtbar oder nur die Summe? (Vorschlag: nur die Summe)
- Höhe der Tageslimits für die Places API
- Name und Adresse der App (`<projekt>.web.app` kostenlos, eigene Domain optional)
- Logo
- Feinabstimmung: Anzahl Vorschläge, Standard-Umkreis
