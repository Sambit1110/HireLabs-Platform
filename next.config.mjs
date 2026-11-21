/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse loads the pdf.js worker from its own package directory at
  // runtime, so it must be required from node_modules instead of bundled.
  serverExternalPackages: ['pdf-parse'],
  // A package-lock.json in a parent directory would otherwise be picked as the root.
  turbopack: { root: import.meta.dirname },
  experimental: {
    // Next.js requires the TypeScript CLI when using TypeScript 7.x
    useTypeScriptCli: true,
  },
};

export default nextConfig;
