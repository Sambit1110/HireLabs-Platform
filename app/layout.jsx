import { DM_Serif_Display, Fraunces, Libre_Franklin } from 'next/font/google';

import '../index.css';

const displayFont = Fraunces({
  subsets: ['latin'],
  weight: ['200', '300'],
  variable: '--lp-font-display',
  display: 'swap',
});

const serifFont = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--lp-font-serif',
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
    <html lang="en" className={`${displayFont.variable} ${serifFont.variable} ${bodyFont.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
