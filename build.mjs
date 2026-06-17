import { build, context } from 'esbuild';
import { argv } from 'process';

const isWatch = argv.includes('--watch');

const common = {
  bundle: true,
  format: 'esm',
  target: 'es2020',
  sourcemap: true,
};

const entries = [
  { entryPoints: ['client/src/main.ts'],             outfile: 'client/dist/app.js' },
  { entryPoints: ['client/src/ui/delete-modal.ts'],  outfile: 'client/dist/delete-modal.js' },
  { entryPoints: ['client/src/ui/gallery.ts'],       outfile: 'client/dist/gallery.js' },
];

if (isWatch) {
  const ctxs = await Promise.all(entries.map(e => context({ ...common, ...e })));
  await Promise.all(ctxs.map(c => c.watch()));
  console.log('Watching client/src/**/*.ts …');
} else {
  await Promise.all(entries.map(e => build({ ...common, ...e })));
  console.log('Client build complete.');
}
