import { ClerkProvider, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import './globals.css';

export const metadata = { title: 'Viewings' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <header className="site-header">
            <nav aria-label="Main">
              <Link href="/properties">Properties</Link>
              <Link href="/showings">Showings</Link>
            </nav>
            <UserButton />
          </header>
          <main>{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
