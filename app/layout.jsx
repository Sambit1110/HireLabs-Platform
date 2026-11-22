import { Fraunces, Libre_Franklin } from 'next/font/google';

import '../index.css';

const displayFont = Fraunces({
  subsets: ['latin'],
  weight: ['200', '300'],
  variable: '--lp-font-display',
  display: 'swap',
});

const bodyFont = Libre_Franklin({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--lp-font-body',
  display: 'swap',
});

export const metadata = {
  title: 'HireLabs - AI Resume Parser & Resume Workspace',
  description: 'A private resume workspace with AI-assisted resume parsing and secure Supabase storage.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
