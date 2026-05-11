import type { Metadata } from 'next';
import './globals.css';

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
