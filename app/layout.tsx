import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'RolePath AI — Learn for the role you want',
  description: 'A personal AI career mentor with role-specific learning paths, streaming tutoring, knowledge checks, and mock interviews.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
