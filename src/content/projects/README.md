# Edit case studies

Each project now has **one `info.json`**. Keep its original images beside it; no TypeScript imports or image renaming are needed.

## Change content or images

Open `jelli-studio/info.json` as an example. Current placeholder selections have been preserved. To use an uploaded image, change:

```json
"hero": "jelli-01.jpg"
```

For a more descriptive image or a different crop alignment:

```json
"hero": {
  "file": "jelli-01.jpg",
  "alt": "Jelli Studios visual identity overview",
  "position": "50% 30%"
}
```

Filenames are relative to this project's folder. Subfolders work too: `"images/jelli-01.jpg"`.
Supported formats: JPG, JPEG, PNG, WebP, AVIF and GIF.
`"@placeholder"` selects the existing temporary image.

A compressed thumbnail is generated from the hero automatically. To select a different image for Home and next-project previews, add `"thumbnail": "another-image.jpg"`.

Images are optimized at development/build time and cached. Originals are never changed. Only images referenced in JSON are processed; merely placing an image in a folder does not display it.

GIFs get an optimized animated WebP for the case-study detail and a still frame for thumbnails. Detail animations play while visible; offscreen, hidden-tab and reduced-motion states show a still. This is not frame-accurate pause/resume: native animated images may restart or rejoin their loop when shown again.

## Arrange sections

Sections appear in the exact order you write them. No `type` field is needed:

```json
"sections": [
  { "images": ["jelli-01.jpg"] },
  { "title": "The idea", "body": "First paragraph.\n\nSecond paragraph." },
  { "images": ["jelli-04.jpg", "jelli-05.jpg"] },
  { "images": ["jelli-07.jpg", "jelli-08.jpg", "jelli-09.jpg"] }
]
```

Each image may be a filename or an object with `file`, `alt` and optional `position`.
One, two or three images create the corresponding layout. All content image sections preserve each image's original aspect ratio without cropping. Multi-image sections allow different heights with top edges aligned; they stack on mobile and keep their natural proportions.

The old section-level `aspectRatio` field is accepted for compatibility but no longer changes content image proportions. `"heroAspectRatio": "2 / 1"` still overrides the hero's crop; the hero is unchanged.

Descriptions and note bodies accept plain text with `\n\n` between paragraphs. They also support the existing structured text format:

```json
"body": [
  {
    "type": "paragraph",
    "content": ["Read ", { "text": "the research", "href": "https://example.com/research" }, "."]
  },
  { "type": "list", "items": [["First insight"], ["Second insight"]] }
]
```

Add `"ordered": true` to a list for numbering.

## Add a project

1. Create a lowercase, hyphenated folder here, e.g. `my-new-project`.
2. Add your images without changing their filenames.
3. Add `info.json` (copy an existing minimal project or start with this):

```json
{
  "title": "My New Project",
  "roles": ["UI Design", "UX Design"],
  "projectType": "Mobile App",
  "date": "July 2026",
  "description": "A short introduction.",
  "hero": "my-original-filename.jpg",
  "sections": []
}
```

Run `npm run dev` and open the site, or run `npm run build`. Discovery adds the new folder to the **top** of `project-order.json` automatically. Commit that updated file with the new project.

If several unlisted folders arrive together, newest folder creation time comes first (alphabetical ties). Once recorded, that order is fixed until you edit it. Project dates never affect ordering.

Folders without `info.json`, or beginning with `_` / `.`, are ignored. Use an underscore-prefixed folder for a draft while editing. Invalid JSON, missing referenced images and invalid fields produce a file-specific error instead of silently dropping a project.

## Reorder projects

Edit `project-order.json`: move the **folder names** up or down. No imports and no per-project order field.

The same order drives Home Grid/List and the next-project footer; the last project wraps to the first. Keep each name only once. Removing a name alone will rediscover the project at the top; remove/move its folder or make it a draft to unpublish it. Missing-folder entries are retained in the file so restoring a folder restores its position; you can remove stale entries yourself.

Art and Photography remain separate and still sort by date.

## Metadata and URLs

- `title` and `hero` are required. Other text can be empty; omitted roles/sections default to empty arrays.
- `date` is unrestricted text, displayed exactly as entered. There is no date sorting.
- `roles` is a list of strings.
- Empty/omitted `siteUrl` hides VIEW SITE. A real URL uses the existing scramble link button and opens in a new tab.
- Optional `labels` customizes the metadata labels:
  `{ "projectType": "PROJECT TYPE", "date": "YEAR", "description": "DESCRIPTION" }`.
- The folder name becomes the URL slug by default. Set `"slug": "existing-url"` to preserve a different URL. Existing Jelli and Uptrendly URLs have been preserved.

JSON uses double quotes and does not allow comments or trailing commas.

## Existing appearance and motion controls

- `src/styles/tokens.css`: responsive `--type-case-*` and `--case-*` typography/spacing.
- `src/styles/case-study.css`: section proportions and footer composition.
- `src/components/case-study/caseStudyNavigation.ts`: extra scroll distance after footer pinning.
- `src/hooks/useCaseStudyScroll.ts`: footer pin/progress and section opacity reveals.
- `src/hooks/useTransitionScrollLock.ts`: residual input handling after navigation.

These systems remain shared and unchanged by the content migration.
