import '../index.css';

export const metadata = {
  title: 'HireLabs - AI Resume Parser & Skill-Based Applicant Tracking System',
  description: 'Resume parser and skill-based ATS with transparent matching, parallel server-side parsing, optional Gemini analysis, and Supabase Row Level Security.',
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
