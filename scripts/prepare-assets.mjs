import { mkdir, access, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import part0 from '../lib/hero-image/part0.ts';
import part1 from '../lib/hero-image/part1.ts';
import part2 from '../lib/hero-image/part2.ts';
import part3 from '../lib/hero-image/part3.ts';
import part4 from '../lib/hero-image/part4.ts';
import part5 from '../lib/hero-image/part5.ts';
import part6 from '../lib/hero-image/part6.ts';
import part7 from '../lib/hero-image/part7.ts';

const outputDir = path.join(process.cwd(), 'public', 'images');
const outputFile = path.join(outputDir, 'homepage-hero.webp');

await mkdir(outputDir, { recursive: true });

try {
  await access(outputFile, constants.F_OK);
  console.log('Using static public/images/homepage-hero.webp');
} catch {
  const encoded = [part0, part1, part2, part3, part4, part5, part6, part7].join('');
  await writeFile(outputFile, Buffer.from(encoded, 'base64'));
  console.log('Created public/images/homepage-hero.webp from the legacy hero asset.');
}
