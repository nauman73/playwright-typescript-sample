import { expect } from '@playwright/test';

type Summary = { ID: string; Subject: string };
const base = () => process.env.MAILPIT_URL ?? 'http://localhost:8025';

export class Mailbox {
  private async search(to: string): Promise<Summary[]> {
    const res = await fetch(`${base()}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    return ((await res.json()) as { messages: Summary[] }).messages;
  }

  /** Polls until a message with this subject reaches this address, then returns its text. */
  async waitFor(to: string, subject: string) {
    let found: Summary | undefined;
    await expect
      .poll(async () => (found = (await this.search(to)).find((m) => m.Subject === subject)), { timeout: 10_000 })
      .toBeTruthy();
    const res = await fetch(`${base()}/api/v1/message/${found!.ID}`);
    return (await res.json()) as { Subject: string; Text: string };
  }

  /** Lists the subjects of the messages that have reached this address. */
  async listFor(to: string): Promise<string[]> {
    return (await this.search(to)).map((m) => m.Subject);
  }

  async deleteFor(to: string) {
    await fetch(`${base()}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`, { method: 'DELETE' });
  }
}
