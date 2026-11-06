import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const roots = ['server.js', 'src', 'public', 'scripts', 'tests'];
const files = [];

function walk(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (target.endsWith('.js')) files.push(target);
    return;
  }
  for (const entry of fs.readdirSync(target)) walk(path.join(target, entry));
}

for (const item of roots) walk(path.join(root, item));
let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(`Syntax error in ${path.relative(root, file)}\n${result.stderr}`);
  }
}
JSON.parse(fs.readFileSync(path.join(root, 'content/seed-exercises.json'), 'utf8'));
if (failed) process.exit(1);
console.log(`Syntax checked ${files.length} JavaScript files; seed JSON parsed successfully.`);
