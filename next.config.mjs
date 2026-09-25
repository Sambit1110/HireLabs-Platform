/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse loads the pdf.js worker from its own package directory at
  // runtime, so it must be required from node_modules instead of bundled.
  serverExternalPackages: ['pdf-parse'],
  // A package-lock.json in a parent directory would otherwise be picked as the root.
  turbopack: { root: import.meta.dirname },
  experimental: {
    // `typescript` is the TS 6 API package (needed by typescript-eslint), which
    // ships no `tsc` binary, so type-check through the TypeScript API instead of
    // the CLI. The TS 7 compiler remains available as @typescript/native.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
