import { clerkSetup } from '@clerk/testing/playwright';

export default async function globalSetup() {
  await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY });
}
