import sharp from 'sharp';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [input, name = 'homepage-hero'] = process.argv.slice(2);
if (!input || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
  console.error('Usage: npm run image:prepare -- "/path/to/photo.jpg" [image-name]');
  process.exit(1);
}
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'public/images');
const output = path.join(directory, `${name}.webp`);
const temporary = `${output}.${process.pid}.tmp`;
try {
  // Decode before touching the existing asset. Rotate from EXIF, preserve the
  // composition, avoid enlargement, and strip metadata from the public copy.
  const { data, info } = await sharp(path.resolve(input), { limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: 2400, withoutEnlargement: true })
    .webp({ quality: 85, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  await mkdir(directory, { recursive: true });
  await sharp(data).metadata();
  await writeFile(temporary, data);
  await rename(temporary, output);
  console.log(`Prepared public/images/${name}.webp: ${info.width} × ${info.height}, ${Math.round(data.length / 1024)} KB`);
} catch (error) {
  await rm(temporary, { force: true });
  console.error(`Image was not replaced: ${error.message}`);
  process.exitCode = 1;
}
