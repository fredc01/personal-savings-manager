import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const root = path.dirname(appDir);
const www = path.join(appDir, 'www');
await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });
for (const item of ['index.html', 'manifest.json', 'sw.js', 'icon.svg', 'css', 'js']) await cp(path.join(root, item), path.join(www, item), { recursive: true });
await mkdir(path.join(www, 'public'), { recursive: true });
await cp(path.join(root, 'public', 'manus-routes.json'), path.join(www, 'public', 'manus-routes.json'));
console.log(`Synced shared web app into ${www}`);
