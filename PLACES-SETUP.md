# Google Places einrichten (Woche 2)

Einmalig nötig, damit die App echte Restaurants, Bars und Cafés von Google anzeigt.
Dauer: ca. 15 Minuten, alles im Browser, immer im Projekt **wo-gehen-wir-hin**.

## 1. APIs einschalten

1. <https://console.cloud.google.com/apis/library/places.googleapis.com?project=wo-gehen-wir-hin> → **„Aktivieren“**
   (Name: *Places API (New)*).
2. <https://console.cloud.google.com/apis/library/maps-embed-backend.googleapis.com?project=wo-gehen-wir-hin> → **„Aktivieren“**
   (Name: *Maps Embed API* – kostenlos, für die kleine Karte in der Detailansicht).
3. <https://console.cloud.google.com/apis/library/secretmanager.googleapis.com?project=wo-gehen-wir-hin> → **„Aktivieren“**
   (Name: *Secret Manager* – sicherer Tresor für den Schlüssel).

## 2. Geheimer Schlüssel für die Ortssuche (Server)

1. <https://console.cloud.google.com/apis/credentials?project=wo-gehen-wir-hin> → **„+ Anmeldedaten erstellen“ → „API-Schlüssel“**.
2. Den neuen Schlüssel **bearbeiten** (Stift-Symbol):
   - Name: `places-server`
   - **API-Einschränkungen → „Schlüssel einschränken“ → nur „Places API (New)“** auswählen
   - Anwendungseinschränkungen: **Keine** (der Schlüssel liegt nur auf dem Server)
   - **Speichern**
3. Schlüssel kopieren (**nicht** in den Chat schicken).

## 3. Schlüssel in den Tresor legen

1. <https://console.cloud.google.com/security/secret-manager?project=wo-gehen-wir-hin> → **„+ Secret erstellen“**.
2. Name: `PLACES_API_KEY` (genau so geschrieben)
3. Secret-Wert: den kopierten Schlüssel einfügen → **„Secret erstellen“**.

## 4. Dem Veröffentlichungs-Konto Zugriff auf den Tresor geben

1. <https://console.cloud.google.com/iam-admin/iam?project=wo-gehen-wir-hin> öffnen.
2. Bei **github-deploy@…** auf den Stift → **„+ Weitere Rolle hinzufügen“** →
   **Secret Manager-Administrator** (*Secret Manager Admin*) → **Speichern**.

## 5. Öffentlicher Schlüssel für die Karte (Browser)

1. Wieder unter <https://console.cloud.google.com/apis/credentials?project=wo-gehen-wir-hin> einen **zweiten API-Schlüssel** erstellen und bearbeiten:
   - Name: `maps-embed-browser`
   - **Anwendungseinschränkungen → „Websites“** und diese zwei Einträge hinzufügen:
     - `https://wo-gehen-wir-hin.web.app/*`
     - `https://wo-gehen-wir-hin.firebaseapp.com/*`
   - **API-Einschränkungen → nur „Maps Embed API“**
   - **Speichern**
2. Diesen Schlüssel **darfst du mir schicken** – er ist für den Browser gedacht und durch die Einschränkungen nur auf unserer Seite nutzbar.

## 6. Kostenbremse

Im Testzeitraum lassen sich die API-Kontingente nicht bearbeiten. Deshalb hat die App eine **eigene, harte Grenze im Server-Code**
(`functions/src/limits.ts`): höchstens **1.500 Google-Aufrufe pro Tag** insgesamt, dazu Grenzen pro Person
(10 Runden, 40 Kartenladungen, 400 Fotos, 150 Adresssuchen pro Tag). Danach lehnt der Server weitere Anfragen bis zum nächsten Tag ab.

Nach dem Testzeitraum zusätzlich die Kontingente unter
<https://console.cloud.google.com/apis/api/places.googleapis.com/quotas?project=wo-gehen-wir-hin> niedrig setzen.

## Danach

Kurz Bescheid geben (und den Browser-Schlüssel aus Schritt 5 schicken) – dann baue ich die Anbindung ein.
