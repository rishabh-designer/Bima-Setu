#!/usr/bin/env node
/*
 * Builds the prototype.
 *
 * The app is written as numbered modules in app/ — one stylesheet fragment and
 * twenty-two JavaScript modules, concatenated in filename order into a single
 * self-contained page. There is no bundler and there are no dependencies: the
 * order of the filenames IS the dependency order.
 *
 *   node build.mjs          -> public/index.html   (the deployed page)
 *
 * Vercel runs this on every push; see vercel.json.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const appDir = join(root, 'app');
const outDir = join(root, 'public');

const head = readFileSync(join(appDir, '01-css.html'), 'utf8');

const modules = readdirSync(appDir)
  .filter((f) => /^\d\d-.*\.js$/.test(f))
  .sort();

const js = modules.map((f) => readFileSync(join(appDir, f), 'utf8')).join('\n');

// A stray closing script tag inside a module would end the page's script block
// early and break everything below it, silently. Fail the build instead.
if (js.includes('</script')) {
  console.error('build failed: a module contains a literal </script');
  process.exit(1);
}

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="BimaSetu CRM — a clickable prototype of the BimaKavach sales and relationship-management interface. Every record in it is synthetic.">
<meta name="robots" content="noindex, nofollow">
${head}
</head>
<body>
<div id="app"></div>
<div id="ovl" class="ovl" hidden></div>
<div id="toasts" class="toasts" aria-live="polite"></div>
<script>
${js}
</script>
</body>
</html>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), page, 'utf8');

const kb = Math.round(Buffer.byteLength(page) / 1024);
console.log(`built public/index.html — ${modules.length} modules, ${kb} KB, ${page.split('\n').length} lines`);
