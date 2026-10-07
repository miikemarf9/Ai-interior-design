# Roomfound website images

Put normal website images in this folder.

The homepage hero is:

`public/images/homepage-hero.webp`

and is referenced in the site as:

`/images/homepage-hero.webp`

To replace the homepage image in future, replace that single file with a WebP image using the same filename. No API route or TypeScript image chunks are required for new images.

The build helper only reconstructs the old hero when the normal static file is missing, so an uploaded static image always takes priority.
