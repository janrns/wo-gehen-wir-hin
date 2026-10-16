# Automatische Veröffentlichung einrichten

Einmalig nötig, damit GitHub die App nach jedem Update selbst auf Firebase veröffentlichen darf.
Dauer: ca. 10 Minuten. Es muss nichts installiert werden, alles läuft im Browser.

## 1. Dienstkonto anlegen (Google Cloud)

1. <https://console.cloud.google.com/iam-admin/serviceaccounts?project=wo-gehen-wir-hin> öffnen
   (mit demselben Google-Konto wie bei Firebase).
2. **„+ Dienstkonto erstellen“** (*Create service account*)
   - Name: `github-deploy`
   - **„Erstellen und fortfahren“**
3. Unter **„Rollen zuweisen“** nacheinander diese Rollen hinzufügen (Suchfeld nutzen, jeweils „+ Weitere Rolle hinzufügen“):

   | Deutsch | Englisch |
   |---|---|
   | Firebase-Administrator | Firebase Admin |
   | Cloud Functions-Administrator | Cloud Functions Admin |
   | Cloud Run-Administrator | Cloud Run Admin |
   | Dienstkontonutzer | Service Account User |
   | Artifact Registry-Administrator | Artifact Registry Administrator |
   | Cloud Scheduler-Administrator | Cloud Scheduler Admin |
   | Service Usage-Administrator | Service Usage Admin |
   | Eventarc-Administrator | Eventarc Admin |

4. **„Weiter“** → **„Fertig“**.

## 2. Schlüssel erzeugen

1. In der Liste auf **github-deploy@…** klicken → Reiter **„Schlüssel“** (*Keys*).
2. **„Schlüssel hinzufügen“ → „Neuen Schlüssel erstellen“ → JSON → „Erstellen“**.
3. Eine `.json`-Datei wird heruntergeladen.

⚠️ Diese Datei ist ein Generalschlüssel für das Projekt: **nicht per Chat/Mail verschicken**, nicht ins Repo legen.

## 3. Schlüssel in GitHub hinterlegen

1. <https://github.com/janrns/wo-gehen-wir-hin/settings/secrets/actions> öffnen.
2. **„New repository secret“**
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: den **gesamten Inhalt** der JSON-Datei (Datei mit einem Texteditor öffnen, alles markieren, kopieren, einfügen)
3. **„Add secret“**.
4. Die heruntergeladene JSON-Datei vom Computer **löschen** (auch aus dem Papierkorb).

## 4. Erste Veröffentlichung starten

1. <https://github.com/janrns/wo-gehen-wir-hin/actions> öffnen → oberster Lauf **„CI“**.
2. Rechts oben **„Re-run all jobs“**.
3. Nach ca. 5 Minuten ist die App unter <https://wo-gehen-wir-hin.web.app> erreichbar.

Ab dann passiert das bei jedem Update automatisch.

## Falls etwas schiefgeht

- Beim allerersten Mal schaltet Firebase einige Google-Dienste ein. Das kann ein paar Minuten dauern;
  schlägt der erste Lauf deshalb fehl, einfach nach 5 Minuten nochmal „Re-run all jobs“.
- Meldet der Lauf fehlende Berechtigungen (*permission denied*), nennt die Fehlermeldung die fehlende Rolle –
  sie kann in der Google Cloud Console unter **IAM** beim Dienstkonto ergänzt werden.
- Schlüssel kompromittiert? In der Google Cloud Console beim Dienstkonto unter „Schlüssel“ löschen und neu erzeugen.
