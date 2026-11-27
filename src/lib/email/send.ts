import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string; contentType: string }[];
};

// Envoie un email avec Resend. Sans clé (tests en local), l'email est enregistré dans un dossier.
// Un échec d'envoi ne bloque jamais le site : il est seulement signalé dans les journaux.
export async function sendEmail(email: Email) {
  const key = process.env.RESEND_API_KEY;
  try {
    if (key) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "VisiteFacile <onboarding@resend.dev>",
          to: [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
          attachments: email.attachments?.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content).toString("base64"),
            content_type: a.contentType,
          })),
        }),
      });
      if (!res.ok) console.error(`[email] envoi refusé (${res.status}) pour « ${email.subject} » :`, await res.text());
      return;
    }
    const dir = process.env.EMAIL_OUTBOX_DIR;
    if (dir) {
      await mkdir(dir, { recursive: true });
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await writeFile(path.join(dir, `${name}.json`), JSON.stringify(email, null, 2));
      await writeFile(path.join(dir, `${name}.html`), email.html);
      return;
    }
    console.info(`[email] (non envoyé, aucune clé Resend) à ${email.to} : ${email.subject}`);
  } catch (e) {
    console.error("[email] erreur d’envoi :", e);
  }
}
