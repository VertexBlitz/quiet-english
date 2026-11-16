import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await build({
  entryPoints: [path.join(root, 'src/topography-entry.jsx')],
  outfile: path.join(root, 'public/topography.js'),
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2020'],
  jsx: 'automatic',
  legalComments: 'none',
  logLevel: 'info'
});

console.log('Built React Bits Topography assets.');
