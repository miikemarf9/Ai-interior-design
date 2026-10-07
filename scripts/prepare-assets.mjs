import { mkdir, access, writeFile, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const outputDir = path.join(process.cwd(), 'public', 'images');
const outputFile = path.join(outputDir, 'homepage-hero.webp');
const legacyDir = path.join(process.cwd(), 'lib', 'hero-image');

await mkdir(outputDir, { recursive: true });

try {
  await access(outputFile, constants.F_OK);
  console.log('Using static public/images/homepage-hero.webp');
} catch {
  const parts = [];
  for (let index = 0; index < 8; index += 1) {
    const source = await readFile(path.join(legacyDir, `part${index}.ts`), 'utf8');
    const match = source.match(/export default ['"`]([A-Za-z0-9+/=]+)['"`];?/);
    if (!match) throw new Error(`Could not read legacy hero image part ${index}`);
    parts.push(match[1]);
  }
  await writeFile(outputFile, Buffer.from(parts.join(''), 'base64'));
  console.log('Created public/images/homepage-hero.webp from the legacy hero asset.');
}
