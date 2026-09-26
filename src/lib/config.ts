function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const config = {
  get databaseUrl() { return required('DATABASE_URL'); },
  get appEnv() { return process.env.APP_ENV ?? 'development'; },
  get timeZone() { return process.env.APP_TIMEZONE ?? 'America/New_York'; },
  get allowTestClock() { return process.env.ALLOW_TEST_CLOCK === 'true'; },
  get smtpHost() { return process.env.SMTP_HOST ?? 'localhost'; },
  get smtpPort() { return Number(process.env.SMTP_PORT ?? 1025); },
  get mailFrom() { return process.env.MAIL_FROM ?? 'Viewings <no-reply@viewings.example>'; },
  get smsProvider() { return process.env.SMS_PROVIDER ?? 'recording'; },
};
