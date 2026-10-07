# Roomfound website images

Website photographs are ordinary files in this folder. Do not put images in
TypeScript strings or add API routes to serve them.

## Replace the homepage image

In GitHub, open `public/images`, choose **Add file → Upload files**, and upload
an actual WebP file named `homepage-hero.webp`. Commit the replacement to main;
the normal Vercel deployment publishes it. Renaming a PNG to .webp does not
convert it. The text is live website text and must not be baked into the photo.

For a JPEG, PNG or WebP original, the recommended local workflow is:

```sh
npm install
npm run image:prepare -- "/path/to/your-room-photo.png"
npm run build
```

The command rotates from photo metadata, preserves the full composition,
limits width to 2400px without enlarging small photos, removes metadata, and
compresses to WebP. Invalid input leaves the existing image untouched.
Commit `public/images/homepage-hero.webp` and deploy. No page edit is needed.
Use a wide photograph (ideally 16:9, at least 1600px wide) with quiet space on
the left for the headline. Check desktop and mobile crops before publishing.

## Add another photograph

```sh
npm run image:prepare -- "/path/to/photo.jpg" example-living-room
```

This creates `public/images/example-living-room.webp`. Import it into the
relevant component and render with `next/image`; use appropriate alt text and
`sizes`. Use `priority` only for the main image visible on page load.

The homepage uses a static image import: Next.js reads dimensions, generates
responsive sizes, and fingerprints the asset so replacements get a new URL.
Its crop, overlay, live text and slow fade are controlled by `.homeHero*` rules
in `app/globals.css`. There is no Base64 reconstruction or image build hook.

These are public marketing assets. Customer room uploads continue through the
existing private upload flow; never commit customer photographs here.
