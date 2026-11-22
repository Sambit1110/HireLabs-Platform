// Writes public/landing/paper-bouquet.svg from lib/landing/paperRose.js.
// Run after changing the roses: npm run build:roses
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildBouquetSvg } from '../../lib/landing/paperRose.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const target = path.join(root, 'public', 'landing', 'paper-bouquet.svg');

fs.mkdirSync(path.dirname(target), { recursive: true });
const svg = buildBouquetSvg();
fs.writeFileSync(target, svg);
console.log(`Wrote ${path.relative(root, target)} (${(svg.length / 1024).toFixed(0)} KB)`);
