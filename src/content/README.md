# Managing Art and Photography

Art and Photography are separate collections, but they use the same folder structure and `info.json` format.

## Quick start

Every item needs one folder containing exactly one image and one `info.json` file:

```text
src/content/
  art/
    my-new-artwork/
      image.jpg
      info.json
  photography/
    evening-walk/
      image.jpg
      info.json
```

Use this starter `info.json` for either collection:

```json
{
  "title": "Evening Walk",
  "caption": "Late light across the empty street.",
  "date": "2025-07-19",
  "location": "Kathmandu",
  "alt": "A quiet street illuminated by warm evening sunlight"
}
```

## Field reference

| Field | Required? | Purpose |
| --- | --- | --- |
| `title` | Yes | Item name. Changing it does not change the URL. |
| `caption` | Yes | Short description shown beneath the image. |
| `date` | Yes | Controls the displayed date and automatic ordering. |
| `location` | No | Place shown beside the date. Omit it or use `""` when unknown. |
| `alt` | No | Accessible image description. Defaults to the caption. |

Use double quotes, and do not put a trailing comma after the final property.

## Art example

Create a folder inside `src/content/art`:

```text
art/
  watercolor-crow/
    image.webp
    info.json
```

```json
{
  "title": "Watercolor Crow",
  "caption": "A study of shape, texture, and restrained color.",
  "date": "2024",
  "alt": "Watercolor painting of a crow in profile"
}
```

## Photography example

Create a folder inside `src/content/photography`:

```text
photography/
  floating-reflections/
    image.jpeg
    info.json
```

```json
{
  "title": "Floating Reflections",
  "caption": "Reflections on a quiet afternoon.",
  "date": "2025-07-19",
  "location": "Lumbini",
  "alt": "Trees reflected in still water"
}
```

## Date and location rules

Use one of these date formats:

| Entered value | Displayed value |
| --- | --- |
| `"2025-07-19"` | **July 19, 2025** |
| `"2025"` | **2025** |

Written dates and mixed values such as `"July 19, 2025"` or `"Lumbini, 2025"` are not accepted.

When `location` is present, the metadata line displays:

```text
Lumbini · July 19, 2025
```

When `location` is empty or omitted, only the date is displayed—there is no extra separator.

## Add a new item

1. Duplicate an existing folder inside `art` or `photography`.
2. Rename the folder using lowercase letters and hyphens, such as `evening-walk`.
3. Replace the existing image.
4. Update every field in `info.json`.
5. Run `npm run dev` to check the result.

The folder name becomes the URL slug. For example, `photography/evening-walk` becomes `/photography/evening-walk`. Art items use `/art/folder-name`. Keep the folder name stable after publishing because renaming it changes the URL.

You do not need to edit imports, arrays, React pages, item counts, image dimensions, or a separate ordering file.

## Replace an image

Keep exactly one image in each item folder. Its name must be `image` with one of these extensions:

- `image.webp`
- `image.avif`
- `image.jpg`
- `image.jpeg`
- `image.png`

If the extension changes, delete the previous image. Renaming `image.jpg` to `image.webp` does not convert it—export a real WebP file from your image editor.

Image dimensions and orientation are detected automatically. You do not need to create thumbnails or enter width and height.

## Automatic ordering

Art and Photography each sort newest first using `date`. Grid View, Spiral View, and previous/next navigation all use the same order.

Ordering rules:

1. Newer dates appear first.
2. Items with the same date sort by folder name.
3. A year-only item appears after fully dated items from that year.
4. A year-only item still appears before items from older years.

There is no `order` field or manual order file for Art and Photography.

The repeating Grid View continues with the first item immediately after the last, even when the final item ends partway through a row. There is no required item count.

## How images are displayed

You maintain only the original image. The site automatically creates optimized WebP copies for each view:

| View | Generated size | Display behavior |
| --- | --- | --- |
| Grid | 480px and 960px maximum long edge | Cropped thumbnail selected for the card size. |
| Spiral | 1024px maximum long edge | Cropped texture sized for graphics-memory efficiency. |
| Media View | 2560px maximum long edge | High-quality, uncropped image preserving its original ratio. |

Small originals are never enlarged. Originals are never changed and are not included separately in the published site.

The first preview or build after adding an image may take longer while these copies are generated. Later runs reuse `node_modules/.cache/portfolio-media`. Replacing an original automatically regenerates its copies. The cache is excluded from Git and can be safely regenerated.

Image quality and size settings live in `build/mediaImages.ts`; normal content editing does not require changing that file.

## Hide or remove an item

To keep an item as a draft, prefix its folder with `_`:

```text
_evening-walk
```

Remove the prefix to publish it again.

Delete the entire item folder to remove it permanently. Its old detail-page link will then become unavailable.

## Preview and publish

Run `npm run dev` for a local preview. Saving `info.json`, replacing images, and adding or removing folders refreshes the preview automatically.

If a temporary missing-file error appears while duplicating a folder, finish copying both `image.*` and `info.json`.

Run `npm run build` before publishing. Validation errors identify the folder and the missing or invalid field.

The files `artworks.ts` and `photographs.ts` are automatic collection exports—leave them unchanged. The shared content loader is `build/mediaContent.ts` and only needs to be edited when changing the content system itself.
