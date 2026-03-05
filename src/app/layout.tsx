import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Specter | Synthetic User Testing',
  description: 'Deploy autonomous synthetic users to test your web applications.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#050505]">
        {children}
      </body>
    </html>
  );
}
