import { clerkSetup } from '@clerk/testing/playwright';

export default async function globalSetup() {
  // playwright.config.ts has already loaded the environment files.
  await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, dotenv: false });
}
