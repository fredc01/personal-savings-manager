// Copies only the files the browser needs into dist/ (used for GitHub Pages).
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const item of ['index.html', 'manifest.json', 'sw.js', 'icon.svg', 'css', 'js']) {
  await cp(path.join(root, item), path.join(dist, item), { recursive: true });
}
await writeFile(path.join(dist, '.nojekyll'), '');
console.log(`Built static site into ${dist}`);
