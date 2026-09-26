import nodemailer from 'nodemailer';
import { config } from '@/lib/config';

// The booking request waits for the send, so short timeouts stop an SMTP server that does not
// answer from holding the response for Nodemailer's default of two minutes.
const transport = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: false,
  connectionTimeout: 5_000,
  greetingTimeout: 5_000,
  socketTimeout: 10_000,
});

export async function sendEmail(m: { to: string; subject: string; text: string }): Promise<void> {
  await transport.sendMail({ from: config.mailFrom, ...m });
}
