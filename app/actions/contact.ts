"use server";

import { Resend } from "resend";

// SPEC 03 — envío del formulario de contacto de Acerca de mediante Resend.
// Las Server Functions son alcanzables por POST directo: la validación y el honeypot se aplican siempre.

export interface ContactInput {
  name: string;
  email: string;
  msg: string;
  website: string; // honeypot, debe llegar vacío
}

export type ContactResult = { ok: true } | { ok: false; reason: "invalid" | "send_failed" };

const MAX_NAME = 80;
const MAX_EMAIL = 254;
const MAX_MSG = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_FROM = "Arcade Vault <onboarding@resend.dev>";

const str = (v: unknown) => (typeof v === "string" ? v : "");

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendContactMessage(input: ContactInput): Promise<ContactResult> {
  const raw = (input ?? {}) as Partial<Record<keyof ContactInput, unknown>>;

  // Honeypot: un bot lo rellena; respondemos OK sin enviar nada.
  if (str(raw.website).trim() !== "") return { ok: true };

  const name = str(raw.name).trim();
  const email = str(raw.email).trim();
  const msg = str(raw.msg).trim();

  if (
    !name ||
    !email ||
    !msg ||
    name.length > MAX_NAME ||
    email.length > MAX_EMAIL ||
    msg.length > MAX_MSG ||
    !EMAIL_RE.test(email)
  ) {
    return { ok: false, reason: "invalid" };
  }

  // Variables leídas en tiempo de ejecución (no al importar) para no romper el build.
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM;
  if (!apiKey || !to) {
    console.error("[contact] Faltan RESEND_API_KEY o CONTACT_TO_EMAIL");
    return { ok: false, reason: "send_failed" };
  }

  // Sin saltos de línea en el asunto (evita inyección de cabeceras).
  const safeName = name.replace(/[\r\n]+/g, " ").slice(0, MAX_NAME);

  const text = `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}\n`;
  const html =
    `<p><strong>Nombre:</strong> ${escapeHtml(name)}</p>` +
    `<p><strong>Correo:</strong> ${escapeHtml(email)}</p>` +
    `<p><strong>Mensaje:</strong></p>` +
    `<p style="white-space:pre-wrap">${escapeHtml(msg)}</p>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${safeName}`,
      text,
      html,
    });
    if (error) {
      console.error("[contact] Resend devolvió un error:", error);
      return { ok: false, reason: "send_failed" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[contact] Excepción al enviar:", err);
    return { ok: false, reason: "send_failed" };
  }
}
