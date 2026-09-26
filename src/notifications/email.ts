import nodemailer from 'nodemailer';
import { config } from '@/lib/config';

const transport = nodemailer.createTransport({ host: config.smtpHost, port: config.smtpPort, secure: false });

export async function sendEmail(m: { to: string; subject: string; text: string }): Promise<void> {
  await transport.sendMail({ from: config.mailFrom, ...m });
}
