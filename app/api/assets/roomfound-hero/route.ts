import part0 from '@/lib/hero-image/part0';
import part1 from '@/lib/hero-image/part1';
import part2 from '@/lib/hero-image/part2';
import part3 from '@/lib/hero-image/part3';
import part4 from '@/lib/hero-image/part4';
import part5 from '@/lib/hero-image/part5';
import part6 from '@/lib/hero-image/part6';
import part7 from '@/lib/hero-image/part7';

export const runtime = 'nodejs';

const heroImage = Buffer.from(
  [part0, part1, part2, part3, part4, part5, part6, part7].join(''),
  'base64',
);

export async function GET() {
  return new Response(heroImage, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
