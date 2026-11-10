import fs from "fs";
import nodemailer, { Transporter } from "nodemailer";
import path from "path";
import { LOG_DIR } from "../configs/logger-factory";
import logger from "../configs/logger.config";
import { StringError } from "../errors/string.error";

// Outgoing email.
//   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM  -> real delivery (e.g. Gmail app password, Brevo)
//   MAIL_TRANSPORT=log                                          -> nothing is sent; each email is saved to logs/mail/*.eml
type TMailMode = "smtp" | "log" | null;

const mode = (): TMailMode => {
  if (process.env.MAIL_TRANSPORT === "log") return "log";
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  return null;
};

const fromAddress = () => process.env.MAIL_FROM || process.env.SMTP_USER || "invoices@localhost";

let transporter: Transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;
  if (mode() === "log") {
    transporter = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
  } else {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // fail within seconds instead of holding the request for minutes when the mail server stalls
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });
  }
  return transporter;
};

export const mailStatus = () => ({
  configured: mode() !== null,
  mode: mode(),
  from: mode() ? fromAddress() : null,
});

export type TMail = {
  to: string;
  cc?: string;
  replyTo?: string;
  fromName: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
};

export const sendMail = async (mail: TMail) => {
  if (!mode()) {
    throw new StringError(
      "Email isn't set up yet. Add SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM to the backend .env, then restart the server."
    );
  }

  const info = await getTransporter().sendMail({
    from: { name: mail.fromName, address: fromAddress() },
    to: mail.to,
    cc: mail.cc || undefined,
    replyTo: mail.replyTo || undefined,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    attachments: mail.attachments,
  });

  if (mode() === "log") {
    const dir = path.resolve(LOG_DIR, "mail");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${mail.to.replace(/[^a-z0-9@.]/gi, "_")}.eml`);
    fs.writeFileSync(file, info.message as Buffer);
    logger.info(`Email to ${mail.to} saved to ${file} (MAIL_TRANSPORT=log)`);
  } else {
    logger.info(`Email to ${mail.to} sent: ${info.messageId}`);
  }
  return info;
};
