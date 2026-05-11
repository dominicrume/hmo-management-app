import type { Metadata } from 'next';
import './globals.css';

// All pages require runtime env vars (Supabase keys) — disable static prerendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Matty's Place — HMO Tenant Management",
  description: "Ash Shahada Housing Association · Reliance Housing · Matty's Place",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream text-navy antialiased">{children}</body>
    </html>
  );
}
