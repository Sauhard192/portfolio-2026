# Managing Art and Photography

Each item has its own folder. Art and Photography stay separate, but use the same format.

```text
src/content/
  art/
    afterimage/
      image.jpeg
      info.json
  photography/
    floating-reflections/
      image.jpeg
      info.json
```

## Replace an image

Open the item's folder and replace `image.jpeg` with your image. Use exactly one of:
`image.webp`, `image.avif`, `image.jpg`, `image.jpeg`, or `image.png`.
Delete the old image if the extension changes. Do not just rename a JPEG to WebP;
export it in the desired format first.

Dimensions are detected automatically. Grid and Spiral crop thumbnails;
the shared Media View preserves the original image's aspect ratio.
Optimized WebP copies are generated automatically; your original is never changed:

- Grid: 480px and 960px maximum long edge, chosen for the displayed card size.
- Spiral: 1024px maximum long edge, keeping textures small in graphics memory.
- Media View: 2560px maximum long edge, high-quality and uncropped.

Small originals are never enlarged. Orientation is corrected automatically.
You still maintain only one image per folder—no manual thumbnail files.
Image quality/size settings live in `build/mediaImages.ts`.

The first preview/build after adding an image takes extra time to generate its copies.
Later runs reuse `node_modules/.cache/portfolio-media/`; changing the original regenerates
them automatically. These generated copies are excluded from Git, and originals
are not included in the published website. The cache can be regenerated at any time.

## Edit the details

Open `info.json` in that folder:

```json
{
  "title": "Floating Reflections",
  "caption": "Reflections on a quiet afternoon.",
  "date": "2025-07-19",
  "location": "Lumbini",
  "alt": "Trees reflected in still water."
}
```

- `title`: item name. Changing this does not change its URL.
- `caption`: short text shown beneath the image.
- `date`: use `YYYY-MM-DD`, e.g. `2025-07-19`, displayed as **July 19, 2025**.
  If you only know the year, use `2025`; it will display just **2025**.
  Written dates or mixed labels such as `Lumbini, 2025` are no longer accepted here.
- `location`: optional. With a location, the second line reads
  **Lumbini · July 19, 2025**. Set it to `""` or omit it to show only the date,
  with no extra separator. The first line remains your caption.
- `alt`: accessible image description. Optional; defaults to the caption.

Art and Photography each sort **newest first** automatically. Grid, Spiral, and
previous/next navigation share that order. Same-date items sort by folder name.
Year-only entries follow fully dated entries within that year, but precede older
years. No separate `order` field is needed.

Use double quotes and no trailing comma after the final property.

## Add an item

1. Duplicate an existing item folder inside `art/` or `photography/`.
2. Rename the folder, e.g. `evening-walk` (lowercase, hyphens, no spaces).
3. Replace its image and edit `info.json`, including its date, optional location, and alt text.

The folder name is the URL slug: `photography/evening-walk`.
Keep it stable once published; renaming it changes the link.
You do not need to edit imports, arrays, React pages, or image dimensions.
There is no required item count: Grid continues with the first item immediately
after the last, including halfway through a row, at all column counts.

## Hide or remove an item

Prefix its folder with `_` to keep it as a draft, e.g. `_evening-walk`.
Remove the prefix to publish it again. Delete an item folder to remove it permanently.
Removing an item makes its old detail link unavailable.

## Preview and publish

Run `npm run dev`. Saving details, replacing images, and adding/removing folders
automatically refreshes the local preview. Complete both files if a temporary
missing-file error appears while copying a folder.

Run `npm run build` to validate all content before publishing. Errors identify the
folder and missing/invalid field. Deploy the new build for changes to appear online.

`artworks.ts` and `photographs.ts` are automatic collection exports—leave them alone.
The shared loader lives in `build/mediaContent.ts`; only developers need to edit it.
