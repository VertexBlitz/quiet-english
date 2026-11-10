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
const englishExercises = JSON.parse(fs.readFileSync(path.join(root, 'content/seed-exercises.json'), 'utf8'));
const germanExercises = JSON.parse(fs.readFileSync(path.join(root, 'content/seed-exercises.de.json'), 'utf8'));
const germanPlans = JSON.parse(fs.readFileSync(path.join(root, 'content/plan-templates.de.json'), 'utf8'));
const germanSkillTasks = JSON.parse(fs.readFileSync(path.join(root, 'content/skill-practice-tasks.de.json'), 'utf8'));
const germanIds = new Set(germanExercises.map(exercise => exercise.id));
if (germanExercises.some(exercise => exercise.language_code !== 'de')) {
  throw new Error('Every German exercise must declare language_code=de.');
}
if (englishExercises.some(exercise => exercise.language_code && exercise.language_code !== 'en')) {
  throw new Error('English seed contains a non-English exercise.');
}
if (new Set([...englishExercises, ...germanExercises].map(exercise => exercise.id)).size !== englishExercises.length + germanExercises.length) {
  throw new Error('Exercise IDs must be unique across language catalogs.');
}
const skillTaskIds = new Set(germanSkillTasks.map(task => task.id));
if (germanSkillTasks.some(task => task.language_code !== 'de' || !['listening','writing','speaking','pronunciation'].includes(task.skill))) {
  throw new Error('German Skills Lab content has an invalid language or skill.');
}
if (skillTaskIds.size !== germanSkillTasks.length) {
  throw new Error('German Skills Lab task IDs must be unique.');
}
for (const plan of germanPlans) {
  if (plan.language_code !== 'de' || plan.weekly_themes?.length !== 4 ||
      plan.weekly_themes.some(week => week.tasks?.length !== 7 || week.tasks.some(id => !germanIds.has(id)))) {
    throw new Error('Invalid German plan template: ' + plan.id);
  }
}

if (failed) process.exit(1);
console.log(`Syntax checked ${files.length} JavaScript files; English and German seed catalogs plus plan templates validated.`);
