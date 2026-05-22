# B_77 Mahlo-Check — Mailversand über Brevo (Vercel)

Diese kleine Funktion nimmt die Antworten aus dem Vertriebs-Check entgegen und
versendet sie per Brevo als E-Mail an **ben@b77.de**, mit Kopie an den Mandanten.
Der Brevo-API-Key bleibt sicher auf dem Server und ist nie im Browser sichtbar.

## Was du brauchst
- Ein Vercel-Konto (hast du)
- Ein Brevo-Konto mit API-Key (hast du)
- Einen in Brevo **verifizierten Absender** (siehe Schritt 3)

## Schritt 1 — Projekt zu Vercel bringen
Variante A (einfach, ohne Git):
1. Installiere die Vercel CLI:  `npm i -g vercel`
2. In diesem Ordner ausführen:  `vercel`
3. Den Anweisungen folgen (neues Projekt anlegen).
4. Für die Live-Version:  `vercel --prod`

Variante B (über GitHub): Ordner in ein Repo legen, in Vercel "New Project" → Repo
auswählen → Deploy.

## Schritt 2 — Brevo-API-Key als Umgebungsvariable hinterlegen
WICHTIG: Den Key NICHT in den Code schreiben.
1. Vercel-Dashboard → dein Projekt → Settings → Environment Variables
2. Neue Variable:
   - Name:  `BREVO_API_KEY`
   - Value: dein Brevo-API-Key (Brevo → SMTP & API → API Keys)
   - Environments: Production (und Preview, falls gewünscht)
3. Speichern und das Projekt neu deployen (`vercel --prod`), damit die Variable greift.

## Schritt 3 — Absender in Brevo verifizieren
Brevo versendet nur von verifizierten Absendern.
1. Brevo → Senders, Domains & Dedicated IPs → Senders
2. Trage die Absenderadresse ein, die in `api/submit.js` unter `SENDER` steht
   (Standard: `check@b77.de`) und verifiziere sie.
   - Am besten die ganze Domain b77.de in Brevo verifizieren (DKIM/SPF) — dann
     ist jede @b77.de-Adresse als Absender nutzbar und die Zustellbarkeit ist besser.
3. Falls du eine andere Absenderadresse willst, passe `SENDER` in `api/submit.js` an.

## Schritt 4 — Die Endpoint-URL in den Check eintragen
Nach dem Deploy hat deine Funktion eine URL, z. B.:
  `https://DEIN-PROJEKT.vercel.app/api/submit`
Diese URL trägst du im Vertriebs-Check ein (siehe dortige Konstante `SUBMIT_ENDPOINT`).

Tipp: Wenn der Check auf www.b77.de läuft und die Funktion unter einer
*.vercel.app-Adresse, ist das technisch ok (CORS ist in der Funktion auf b77.de
freigegeben). Sauberer ist, die Vercel-Funktion unter einer Subdomain wie
`check.b77.de` einzubinden — dann gibt es keine Cross-Origin-Themen.

## Schritt 5 — Testen
- Check ausfüllen, abschließen.
- In Brevo unter "Transactional → Logs" siehst du den Versand.
- Kommt nichts an: Vercel → dein Projekt → Logs ansehen (zeigt Brevo-Fehlertext).

## Anpassungen
- Empfänger ändern: `RECIPIENT` in `api/submit.js`
- Erlaubte Domains (CORS): `ALLOWED_ORIGINS` in `api/submit.js`
