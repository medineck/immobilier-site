import "server-only";
import { site } from "@/lib/site";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Block = { kind: "p"; text: string } | { kind: "quote"; text: string } | { kind: "box"; lines: string[] };

// Mise en page commune : logo, titre, contenu, bouton, pied de page
export function layout({ preheader, title, blocks, button, footer }: { preheader: string; title: string; blocks: Block[]; button?: { label: string; url: string }; footer?: string }) {
  const body = blocks
    .map((b) =>
      b.kind === "p"
        ? `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#1c2421">${esc(b.text)}</p>`
        : b.kind === "quote"
          ? `<div style="margin:0 0 16px;padding:12px 16px;border-left:4px solid #1f8a70;background:#f7f9f8;border-radius:6px;font-size:15px;line-height:1.55;color:#1c2421;white-space:pre-line">${esc(b.text)}</div>`
          : `<div style="margin:0 0 16px;padding:14px 16px;background:#eef6f4;border-radius:10px;font-size:15px;line-height:1.6;color:#135c4b">${b.lines.map(esc).join("<br>")}</div>`,
    )
    .join("");
  const cta = button
    ? `<p style="margin:22px 0 6px"><a href="${esc(button.url)}" style="display:inline-block;background:#1f8a70;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:13px 22px;border-radius:10px">${esc(button.label)}</a></p>`
    : "";
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f2f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="padding:20px 24px;border-bottom:1px solid #e3e8e6"><span style="display:inline-block;background:#1f8a70;color:#fff;font-weight:700;border-radius:8px;padding:4px 9px">⌂</span> <strong style="font-size:17px;color:#1c2421;vertical-align:middle">${esc(site.name)}</strong></td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:#1c2421">${esc(title)}</h1>${body}${cta}
</td></tr>
<tr><td style="padding:16px 24px;background:#f7f9f8;font-size:12px;line-height:1.5;color:#5d6b66">${esc(footer ?? `Vous recevez cet email car vous utilisez ${site.name}, les visites immobilières par écrit.`)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    title,
    "",
    ...blocks.map((b) => (b.kind === "box" ? b.lines.join("\n") : b.text)),
    button ? `\n${button.label} : ${button.url}` : "",
    "",
    `— ${site.name}`,
  ].join("\n");
  return { html, text };
}

// Fichier .ics pour ajouter la visite à son agenda (téléphone, Google, Outlook…)
export function visitIcs({ id, start, end, title, location, description }: { id: string; start: string; end: string; title: string; location: string; description: string }) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const clean = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${site.name}//FR`,
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:visite-${id}@visitefacile`,
    `DTSTAMP:${f(new Date().toISOString())}`,
    `DTSTART:${f(start)}`,
    `DTEND:${f(end)}`,
    `SUMMARY:${clean(title)}`,
    `LOCATION:${clean(location)}`,
    `DESCRIPTION:${clean(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
