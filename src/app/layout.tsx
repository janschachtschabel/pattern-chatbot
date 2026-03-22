import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Birdpattern – Intent · Persona · Kontext → Angebot',
  description: 'Prototyp: KI-Chat mit transparenter Intent- und Persona-Erkennung',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
