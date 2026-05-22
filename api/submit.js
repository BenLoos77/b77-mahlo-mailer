// Vercel Serverless Function — /api/submit
// Nimmt die Vertriebs-Check-Antworten entgegen und versendet sie per Brevo
// an B_77 (ben@b77.de), mit Kopie (CC) an die E-Mail des Mandanten.
//
// SICHERHEIT: Der Brevo-API-Key liegt NUR hier serverseitig als Environment-Variable.
// Er wird niemals an den Browser ausgeliefert.

const ALLOWED_ORIGINS = [
  "https://www.b77.de",
  "https://b77.de",
];

const RECIPIENT = { email: "ben@b77.de", name: "B_77" };
const SENDER = { email: "check@b77.de", name: "B_77 Vertriebs-Check" }; // muss in Brevo als Absender verifiziert sein

function setCors(res, origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  setCors(res, origin);

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Method not allowed" }); return; }

  try {
    // Body robust parsen (Vercel liefert ihn meist schon als Objekt)
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    const subject = (body.subject || "Vertriebs-Check Mahlo — Positionsbestimmung").toString().slice(0, 200);
    const summaryText = (body.summaryText || "").toString();
    const kundeEmail = (body.kundeEmail || "").toString().trim();
    const kundeName = (body.kundeName || "").toString().trim().slice(0, 120);
    const summaryHtml = (body.summaryHtml || "").toString();

    if (!summaryText || summaryText.length < 20) {
      res.status(400).json({ ok: false, error: "Leere oder ungültige Zusammenfassung." });
      return;
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      res.status(500).json({ ok: false, error: "BREVO_API_KEY fehlt in Vercel (Environment Variables) oder Re-Deploy steht aus." });
      return;
    }

    const htmlContent = (summaryHtml && summaryHtml.length > 50)
      ? summaryHtml
      : `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0a0a0a;">
          <h2 style="font-size:18px;margin:0 0 12px;">Vertriebs-Check Mahlo — Positionsbestimmung</h2>
          <p style="color:#666;margin:0 0 18px;">Eingegangen über den B_77 Vertriebs-Check auf b77.de.</p>
          <pre style="white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;margin:0;">${escapeHtml(summaryText)}</pre>
        </div>`;

    const payload = {
      sender: SENDER,
      to: [RECIPIENT],
      replyTo: (kundeEmail && /\S+@\S+\.\S+/.test(kundeEmail))
        ? { email: kundeEmail, name: kundeName || kundeEmail }
        : undefined,
      subject,
      htmlContent,
      textContent: summaryText,
    };

    // Kopie an den Mandanten, wenn gültige Adresse
    if (kundeEmail && /\S+@\S+\.\S+/.test(kundeEmail)) {
      payload.cc = [{ email: kundeEmail, name: kundeName || kundeEmail }];
    }

    const brevoResp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!brevoResp.ok) {
      const detail = await brevoResp.text().catch(() => "");
      res.status(502).json({
        ok: false,
        error: "Brevo lehnte den Versand ab (HTTP " + brevoResp.status + "): " + detail.slice(0, 400)
      });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: "Unerwarteter Fehler.", detail: String(e).slice(0, 300) });
  }
};
