# Managing case-study projects

Each project has its own folder containing one `info.json` file and its original media. You do not need to rename images, import them into TypeScript, or create a separate React page.

## Quick start

Create a lowercase, hyphenated folder inside `src/content/projects`, such as `my-new-project`. Add your images and create `info.json`:

```json
{
  "title": "My New Project",
  "roles": ["UI Design", "UX Design"],
  "projectType": "Mobile App",
  "date": "July 2026",
  "description": "A short introduction to the project.",
  "hero": "cover.jpg",
  "sections": []
}
```

`title` and `hero` are required. Everything else may be empty or omitted.

For a complete working example, see `jelli-studio/info.json`.

## Field reference

| Field | Purpose |
| --- | --- |
| `title` | Project name. Required. |
| `roles` | List of your roles, such as `["UI Design", "Research"]`. |
| `projectType` | Free-form project category. |
| `date` | Free-form display text, such as `2026` or `July 2026`. |
| `description` | Project introduction. |
| `hero` | Main cover image. Required. |
| `heroAspectRatio` | Optional hero crop ratio, such as `"2 / 1"`. |
| `thumbnail` | Optional image used on Home and in the next-project preview. |
| `siteUrl` | Optional project URL. Empty or omitted hides **VIEW SITE**. |
| `sections` | Ordered project content: notes and image layouts. |
| `labels` | Optional custom names for metadata labels. |
| `slug` | Optional URL override. Normally the folder name is used. |

The `date` value is displayed exactly as entered and does not control project order.

## Working with images

### Simple image

Use a filename when no extra settings are needed:

```json
"hero": "cover.jpg"
```

Filenames are relative to the project folder. Subfolders also work:

```json
"hero": "images/cover.jpg"
```

### Image with options

Use an object to add an alternative description or adjust a cropped image's position:

```json
"hero": {
  "file": "cover.jpg",
  "alt": "Jelli Studios visual identity displayed across printed materials",
  "position": "50% 30%"
}
```

Available image fields:

| Field | Purpose |
| --- | --- |
| `file` | Image filename. Required when using the object format. |
| `alt` | Accessible description of what the image communicates. |
| `position` | Crop alignment, such as `"50% 30%"`. |
| `caption` | Optional plain-text caption displayed below a section image. |

If `alt` is omitted, the project title is used. Use a specific description for meaningful images and `"alt": ""` for a purely decorative image.

Supported formats are JPG, JPEG, PNG, WebP, AVIF, and GIF. Use `"@placeholder"` to select the temporary project image.

### Thumbnail

A compressed thumbnail is generated from the hero automatically. To use a different image on Home and in the next-project footer, add:

```json
"thumbnail": "thumbnail.jpg"
```

## Building the page with sections

Sections appear in exactly the order listed in `info.json`. You do not need a `type` field.

```json
"sections": [
  { "images": ["overview.jpg"] },
  { "title": "The idea", "body": "First paragraph.\n\nSecond paragraph." },
  { "images": ["screen-01.jpg", "screen-02.jpg"] },
  { "images": ["detail-01.jpg", "detail-02.jpg", "detail-03.jpg"] }
]
```

### Image layouts

An image section accepts one, two, or three images:

```json
{ "images": ["single.jpg"] }
```

```json
{ "images": ["left.jpg", "right.jpg"] }
```

```json
{ "images": ["first.jpg", "second.jpg", "third.jpg"] }
```

Content images preserve their original aspect ratios and are never cropped. In multi-image sections, top edges align while image heights may differ. The images stack on mobile.

The older section-level `aspectRatio` field is still accepted for compatibility, but it no longer changes content-image proportions. `heroAspectRatio` still controls the hero crop.

### Image captions

Add a separate plain-text caption to any section image by using the object format:

```json
{
  "images": [
    {
      "file": "dashboard.jpg",
      "alt": "Campaign dashboard showing performance metrics and filters",
      "caption": "Final campaign-performance dashboard."
    },
    {
      "file": "filters.jpg",
      "caption": "Selected filtering states."
    }
  ]
}
```

Each caption appears directly below its own image and fades in shortly after that image begins revealing. Captions are optional and support plain text only—no links, rich text, or formatted blocks.

### Notes

For ordinary notes, use a title and body:

```json
{
  "title": "The idea",
  "body": "First paragraph.\n\nSecond paragraph."
}
```

Use `\n\n` to separate paragraphs.

For links or lists, use the structured format:

```json
{
  "title": "Research",
  "body": [
    {
      "type": "paragraph",
      "content": [
        "Read ",
        { "text": "the research", "href": "https://example.com/research" },
        "."
      ]
    },
    {
      "type": "list",
      "items": [["First insight"], ["Second insight"]]
    }
  ]
}
```

Add `"ordered": true` to a list to display numbers.

### Videos

Video sections are full width and appear in the same ordered `sections` list as images and notes:

```json
{
  "video": "prototype.mp4",
  "poster": "prototype-poster.jpg",
  "alt": "Prototype showing a user filtering campaign results",
  "caption": "Final filtering interaction."
}
```

Only `video` is required. The remaining fields are optional:

| Field | Purpose |
| --- | --- |
| `video` | MP4 filename inside the project folder. Use H.264/AVC encoding. |
| `poster` | Still image shown while the video loads and before playback. |
| `alt` | Accessible description of the interaction. Defaults to the project title. |
| `caption` | Plain-text caption displayed below the video. |

The build reads the video's original width and height directly from the MP4, so you do not enter dimensions manually. No FFmpeg installation is needed. A poster is recommended but not required.

Videos:

- preserve their original aspect ratio
- begin playing silently when visible
- loop while playing
- pause when they leave the viewport or the browser tab is hidden
- can be paused or resumed by clicking or tapping
- can be controlled with **Enter** or **Space** when focused
- hide the browser's native video controls
- remain paused by default when reduced motion is requested, until the visitor starts them

The video uses the same case-study mask-and-scale reveal as a full-width image. Its optional caption uses the same caption styling and delayed fade.

## Project URLs and metadata labels

The folder name becomes the URL slug. For example, `my-new-project` becomes `/case-studies/my-new-project`. Keep the folder name stable after publishing.

Use `slug` only when an existing URL must be preserved:

```json
"slug": "existing-url"
```

Use `labels` to rename the displayed metadata headings:

```json
"labels": {
  "projectType": "PROJECT TYPE",
  "date": "YEAR",
  "description": "DESCRIPTION"
}
```

A real `siteUrl` opens through the existing **VIEW SITE** button in a new tab:

```json
"siteUrl": "https://example.com"
```

## Adding, ordering, and hiding projects

### Add a project

1. Create its lowercase, hyphenated folder.
2. Add its original images without renaming them.
3. Add `info.json` using the quick-start example.
4. Run `npm run dev` or `npm run build`.
5. Commit the automatically updated `project-order.json` with the project.

New project folders are added to the top of `project-order.json`. If several arrive together, newer folder creation time comes first; alphabetical order breaks ties.

### Reorder projects

Edit `project-order.json` and move folder names into the order you want. This one order controls:

- Home Grid View
- Home List View
- next-project navigation

The last project wraps to the first. Keep every folder name unique.

Removing only a name from `project-order.json` does not unpublish the project—it will be discovered and added at the top again.

### Hide a draft

Prefix a folder with `_`, such as `_my-new-project`. Folders starting with `_` or `.`, and folders without `info.json`, are ignored.

Missing-folder entries remain in `project-order.json`, so restoring a folder also restores its position. You can remove stale entries manually.

Art and Photography have their own ordering system and continue to sort by date.

## Image processing

Only images referenced by `info.json` are processed. Adding an unused image to the folder does not display or optimize it.

During development and builds:

- optimized copies are generated and cached
- original files are never changed
- the hero automatically produces a compressed thumbnail
- GIF details produce an optimized animated WebP
- GIF thumbnails use a still frame

Animated detail images play only while visible. Offscreen images, hidden browser tabs, and reduced-motion settings show a still frame. Native animated images may restart or rejoin their loop when shown again.

## Preview and troubleshoot

Run `npm run dev` to preview changes. Run `npm run build` before publishing to validate all project data.

Invalid JSON, unknown fields, missing images, and invalid values produce an error that identifies the affected file. Remember that JSON requires double quotes, does not support comments, and does not allow a trailing comma after the last property.

## Design and motion controls

These files control the shared case-study presentation. Editing project content normally does not require changing them.

| File | Controls |
| --- | --- |
| `src/styles/tokens.css` | Responsive `--type-case-*` typography and `--case-*` spacing tokens. |
| `src/styles/case-study.css` | Case-study layouts, image sections, captions, and footer composition. |
| `src/components/case-study/revealTiming.ts` | Image, caption, and section reveal timing. |
| `src/components/case-study/caseStudyNavigation.ts` | Extra scroll distance after the footer pins. |
| `src/hooks/useCaseStudyScroll.ts` | Scroll reveals and footer progress. |
| `src/hooks/useTransitionScrollLock.ts` | Residual scroll-input handling during navigation. |
