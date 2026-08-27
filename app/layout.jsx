import '../index.css';

export const metadata = {
  title: 'HireLabs - AI Resume Parser & Semantic Applicant Tracking System',
  description: 'Production-oriented AI resume parser and semantic ATS powered by Gemini 1536-dim embeddings, pgvector, and Supabase Row Level Security.',
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
