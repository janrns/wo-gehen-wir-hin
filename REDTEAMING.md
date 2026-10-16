# Red-Teaming des Grobkonzepts

Stand: Oktober 2026 · geprüft: [KONZEPT.md](KONZEPT.md) Version 0.1

Ziel: Schwachstellen finden, bevor Code entsteht – bei Logik, Kosten, Technik, Sicherheit, Datenschutz und Zeitplan.

**Schwere:** 🔴 kippt das Produkt oder kostet Geld · 🟠 führt zu Frust/Fehlern · 🟡 Feinschliff

**Status:** ✅ in Konzept v0.2 eingearbeitet · ❓ Entscheidung offen

---

## A. Produktlogik

### A1 🔴 „Match nur, wenn alle zustimmen“ klappt in größeren Gruppen fast nie ✅
Rechenbeispiel: Jede Person mag ca. 30 % der Vorschläge, 25 Karten pro Runde. Wahrscheinlichkeit, dass es **mindestens ein** volles Match gibt:

| Personen | 2 | 3 | 4 | 5 | 8 |
|---|---|---|---|---|---|
| Chance auf ein volles Match | 91 % | 50 % | 18 % | 6 % | ≈ 0 % |

In der Realität liegen die Geschmäcker näher beieinander, der Trend bleibt aber: Ab 4 Personen ist „kein Match“ der Normalfall.
**Gegenmaßnahme:** Das Ergebnis ist immer die **Rangliste**. Ein volles Match ist ein Bonus („Perfect Match 🎉“). Klare Regeln bei Gleichstand: zuerst mehr Likes, dann bessere Google-Bewertung, dann geringere Entfernung.

### A2 🟠 „Alle“ ist eine bewegliche Zielgröße ✅
Weil jeder swipt, wann er will, kann ein Match entstehen – und wieder verschwinden, wenn jemand später beitritt. Wer beitritt und nie swipt, blockiert dagegen für immer.
**Gegenmaßnahme:** Jede Person hat einen Status (*swipt* / *fertig*). Live angezeigt wird ein **Zwischenstand**. Das **Endergebnis** steht fest, wenn alle fertig sind oder die Ersteller-Person die Runde beendet. Die Ersteller-Person kann Teilnehmende entfernen.

### A3 🟠 Nicht geswipt ≠ abgelehnt ✅
Wer nach 10 von 25 Karten aufhört, würde die übrigen Orte sonst wie ein „Nein“ verschlechtern.
**Gegenmaßnahme:** Für die Rangliste zählt die Zustimmungsquote unter denen, die die Karte gesehen haben. Daneben steht, wie viele Stimmen die Quote hat. Dazu kommt ein Button „Ich bin fertig“.

### A4 ❓ Sieht man, wer was abgelehnt hat?
Wenn alle die Swipes der anderen lesen können, sieht Anna, dass Ben ihr Lieblingslokal weggewischt hat. Das sorgt für Diskussionen im Freundeskreis.
**Vorschlag:** Anzeigen nur als Summe („4 von 5 mögen das“), einzelne Swipes bleiben privat. Technisch berechnet das der Server. **→ Deine Entscheidung.**

## B. Ortsdaten & Google Places API

### B1 🔴 „20–30 Vorschläge“ sind mit der geplanten Suche nicht erreichbar ✅
Die „Nearby Search“ liefert **maximal 20 Ergebnisse, ohne weitere Seiten**. Danach filtern wir noch nach Preisniveau und Öffnungszeit, und dann bleiben eventuell nur 5–8 übrig.
**Gegenmaßnahme:** Stattdessen nutzen wir die **„Text Search“**: bis zu 60 Ergebnisse über mehrere Seiten, Filter nach Preisniveau und Typ direkt bei Google. Bleiben trotzdem zu wenige übrig, wird der Umkreis automatisch erweitert, und die App weist darauf hin.

### B2 🔴 Die Ortssuche ist ein öffentlicher Endpunkt, der Geld kostet ✅
Jeder, der die App-Adresse kennt, könnte die Cloud Function in einer Schleife aufrufen. Das Risiko trägt Deine Kreditkarte. **Eine Budget-Warnung stoppt dabei nichts, sie schickt nur eine E-Mail.**
**Gegenmaßnahme:**
- **Firebase App Check:** Nur unsere App darf die Funktion aufrufen.
- Nur angemeldete Nutzer, und höchstens einige Suchen pro Person und Tag.
- **Harte Tageslimits (Quotas)** für die Places API in der Google Cloud Console. Das ist die eigentliche Kostenbremse.
- Den API-Schlüssel auf die benötigten APIs beschränken.

### B3 🟠 Kosten hängen an Fotos und Detailfeldern ✅
Bewertung, Preisniveau, Öffnungszeiten und vor allem **Fotos** gehören bei Google zu den teureren Abrechnungsstufen mit kleinerem Gratis-Kontingent. Beispiel: 5 Personen × 25 Karten = 125 Foto-Abrufe pro Runde, wenn jedes Gerät die Bilder selbst lädt.
**Gegenmaßnahme:** Nur benötigte Felder anfordern, ein Foto pro Karte in kleiner Auflösung. Die tatsächlichen Kosten messen wir in Woche 2 mit einer Testrunde. Ob und wie lange wir Details für die Dauer einer Runde zwischenspeichern dürfen, prüfen wir vorher in den Google-Bedingungen. Für Deutschland gelten die EWR-Bedingungen.

### B4 🟠 Adresseingabe braucht eine weitere API ✅
„Adresse oder Stadt eingeben“ funktioniert nur mit einer Autovervollständigung (Places Autocomplete) oder Geocoding. Das stand bisher nicht im Konzept und kostet ebenfalls.
**Gegenmaßnahme:** Places Autocomplete kommt mit ins Konzept. Der Standort per GPS ist der Standard.

### B5 🟠 „Geöffnet um 19 Uhr“ ist zu ungenau ✅
Ein Lokal, das um 19:30 schließt, ist um 19 Uhr „geöffnet“, aber nutzlos. Feiertage und Sonderöffnungszeiten fehlen in den regulären Öffnungszeiten.
**Gegenmaßnahme:** Die Eingabe wird zu „ab Uhrzeit + Dauer“ (Standard 2 Std.). Für die nächsten 7 Tage nutzen wir die tagesaktuellen Öffnungszeiten von Google, die Sonderzeiten enthalten. Bei unklaren Angaben bekommt die Karte den Hinweis „Öffnungszeiten prüfen“.

### B6 🟡 Typen sind unscharf ✅
Viele Bars sind bei Google als „Restaurant“ eingetragen und umgekehrt. Der Filter „Bar“ trifft daher nicht immer.
**Gegenmaßnahme:** Mehrere Google-Typen pro Kategorie zusammenfassen und in der Testphase nachjustieren.

## C. Technik & Plattform

### C1 🔴 Identitätsverlust bei anonymer Anmeldung (vor allem iPhone) ✅
Die anonyme Identität hängt am Browser-Speicher. Neu bei Null startet man, wenn
- der Link zuerst im WhatsApp-internen Browser und später in Safari geöffnet wird,
- die PWA auf dem Home-Bildschirm liegt (eigener Speicher, getrennt von Safari),
- Safari den Speicher einer Website nach längerer Nichtnutzung löscht.

Die bisherigen Swipes sind dann „weg“, und die Person taucht doppelt auf.
**Gegenmaßnahme:** Beim erneuten Beitreten bietet die App an: „Bist du *Anna*? → weitermachen“. Der Server überträgt dann Teilnahme und Swipes auf die neue Identität. Für einen Freundeskreis ist das ausreichend sicher.

### C2 🟠 Automatisches Löschen löscht nur die Hälfte ✅
Die Firestore-Löschfrist (TTL) löscht ein Dokument, **aber nicht dessen Unterdokumente**. Teilnehmende und Swipes einer Runde blieben liegen.
**Gegenmaßnahme:** Eine geplante Funktion löscht abgelaufene Runden täglich rekursiv, also inklusive aller Unterdokumente.

### C3 🟠 Server-Standort lässt sich später nicht ändern ✅
Den Firestore-Standort wählt man einmalig beim Anlegen, danach ist er fest.
**Gegenmaßnahme:** **Frankfurt (`europe-west3`)** für Firestore und Functions. Das ist wichtig für Deinen nächsten Schritt (siehe Konzept, Abschnitt 6).

### C4 🟠 Sicherheitsregeln müssen enger sein als beschrieben ✅
„Jede Person schreibt nur ihre eigenen Swipes“ reicht nicht. Sonst könnte jemand sich selbst als Ersteller eintragen, das Match setzen oder Stimmen für Orte abgeben, die gar nicht in der Runde sind.
**Gegenmaßnahme:** Match, Rangliste und Status setzt **nur der Server**. Clients dürfen nur Name, Fertig-Status und Swipes auf Orte dieser Runde schreiben. Ein Durchsuchen aller Runden ist gesperrt. Dazu kommen automatische Tests für die Regeln.

### C5 🟡 Kaltstart der Cloud Function ✅
Der erste Aufruf nach längerer Pause dauert einige Sekunden.
**Gegenmaßnahme:** Ladeanimation („Wir suchen Lokale …“). Dauerhaft laufende Instanzen kosten Geld und sind für den Freundeskreis nicht nötig.

## D. Sicherheit & Datenschutz

### D1 🟠 Der Startpunkt kann die Wohnadresse sein ✅
Wer „aktueller Standort“ wählt, speichert eventuell die eigene Wohnung in der Runde, und alle Teilnehmenden können sie sehen.
**Gegenmaßnahme:** Koordinaten auf ca. 200 m runden. Statt der genauen Adresse wird nur der Stadtteil angezeigt.

### D2 🟡 Weitergeleitete Links ✅
Wer den Link hat, kann beitreten, auch wenn er weitergeleitet wurde. Für Freunde ist das okay.
**Gegenmaßnahme:** Die Ersteller-Person kann Teilnehmende entfernen und die Runde schließen. Geschlossene Runden nehmen niemanden mehr auf.

### D3 🟡 Daten fließen an Google ✅
Karten, Fotos und Schriften laden von Google-Servern, dabei wird die IP-Adresse übertragen. Für private Nutzung im Freundeskreis ist das unkritisch. Vor einer öffentlichen Version muss das in die Datenschutzerklärung. Schriften liefern wir selbst aus, nicht über Google Fonts.

## E. Zeitplan

### E1 🟠 3 Wochen sind knapp, aber machbar ✅
Die Risiken liegen eher außerhalb des Codes: Einrichtung von Abrechnung und API, iPhone-Eigenheiten und gemeinsame Testtermine.
**Gegenmaßnahme:**
- Firebase- und Google-Cloud-Einrichtung **jetzt** (Woche 0).
- Mindestens ein iPhone und ein Android-Gerät zum Testen.
- Klare **Streichliste**, falls es eng wird: „Geöffnet um“ zuerst vereinfachen, dann die Detailansicht mit Karte (nur noch Link).
- **Kern, der in jedem Fall fertig wird:** Runde per Link, swipen, Rangliste.

---

## Zusammenfassung

| Bereich | 🔴 | 🟠 | 🟡 |
|---|---|---|---|
| Produktlogik | 1 | 2 (+1 offen) | – |
| Places API | 2 | 3 | 1 |
| Technik | 1 | 3 | 1 |
| Datenschutz | – | 1 | 2 |
| Zeitplan | – | 1 | – |

Alle Punkte bis auf A4 sind in [KONZEPT.md](KONZEPT.md) Version 0.2 eingearbeitet.
