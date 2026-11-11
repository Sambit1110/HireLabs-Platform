import '../index.css';

export const metadata = {
  title: 'HireLabs - AI Resume Parser & Resume Workspace',
  description: 'A private resume workspace with AI-assisted resume parsing and secure Supabase storage.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
