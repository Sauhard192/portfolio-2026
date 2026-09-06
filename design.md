# Portfolio Design Direction

## Purpose

This document defines the visual and interaction direction for Jhelli's personal portfolio across UI/UX design, art, and photography.

The design emphasizes spatial galleries, a minimal persistent interface, alternate browsing modes, image-led hierarchy, and interaction-driven navigation. The implementation must remain original.

Figma remains the source of truth for page-specific static layouts. This document defines the broader visual and behavioral system used when Figma does not specify a state or breakpoint.

---

## Design read

An image-first creative portfolio for UI/UX design, art, and photography, expressed through an editorial-experimental visual language with restrained interface chrome and spatial, responsive interaction.

- **Variance:** 7/10 — structured layouts with occasional spatial or scale contrast
- **Motion:** 5/10 — tactile and noticeable, but never continuous without purpose
- **Density:** 3/10 — imagery and whitespace dominate
- **Default 3D tier:** 0 — normal interface and layout remain HTML/CSS
- **Gallery 3D tier:** 2 — reserved for the future Art/Photography spiral view

The site should feel calm at rest and expressive during direct interaction.

---

## Core principles

### 1. Images are the interface

Project imagery, artwork, and photography carry the identity. Interface elements should frame, label, switch, or navigate the work without competing with it.

### 2. Minimal chrome, persistent orientation

The logo, primary navigation, browsing-mode control, and essential gallery status may remain fixed while content moves behind them. Persistent elements should occupy the edges or small floating controls, leaving the center available for media.

### 3. Multiple views, one dataset

Alternate views are different spatial interpretations of the same content, not separate experiences with separate data.

- Home: Grid / List
- Art: Grid / Spiral
- Photography: Grid / Spiral

View changes must preserve project identity, order, and selection state wherever practical.

### 4. Spatial depth is reserved for galleries

Depth, perspective, and WebGL belong in gallery exploration where they improve discovery. Navigation, text, metadata, menus, and accessibility-critical controls remain HTML/CSS.

### 5. Experimental does not mean obscure

The visual system may feel unusual, but users must always understand:

- where they are
- what can be selected
- how to change views
- how to open and close navigation
- how to move to the next or previous item
- how to return to the gallery

---

## Gallery design principles

### Spatial and interaction principles

- A full-viewport gallery that feels like a space rather than a conventional page
- Fixed edge-aligned identity and navigation
- A compact, persistent view switcher
- Media arranged at different depths or scales in immersive modes
- One dominant selected item with surrounding items providing context
- Cursor-adjacent project labels on fine-pointer devices
- Small status information at the viewport edge
- A simplified mobile shell with a menu control instead of desktop navigation
- Scroll or drag input used to explore a bounded gallery world

Gallery composition, branding, motion, and copy should be original to this portfolio.

---

## Color system

Use the portfolio's existing neutral color theme. Color should come primarily from project media rather than interface chrome.

| Token | Value | Role |
| --- | --- | --- |
| `--color-background` | `#ededed` | Main page background |
| `--color-surface` | `#f0f0f0` | Fixed overlays, menus, secondary surfaces |
| `--color-foreground` | `#100f0f` | Primary text, active controls, cursor |
| `--color-secondary` | `#666666` | Secondary navigation and metadata |
| `--color-tertiary` | `#999999` | Inactive list items and low-priority labels |
| `--color-grid-line` | `rgba(16, 15, 15, 0.055)` | Structural guide lines |

### Color rules

- Project imagery may contain any color; interface colors remain neutral.
- Active state is expressed primarily through near-black ink, opacity, scale, or position.
- Keep shadows nearly absent. Use contrast, space, and layering instead.
- Glass is limited to compact floating controls and tooltips.
- Provide a solid `--color-surface` fallback for reduced-transparency preferences.
- Body text must meet WCAG AA contrast. Tertiary gray is for large text or nonessential metadata only.

---

## Typography

Use DM Sans as the current portfolio family unless a future Figma direction explicitly replaces it.

### Roles

- **Logo / identity:** DM Sans, 900 weight, tightly tracked
- **Navigation / controls:** DM Sans, 600–700 weight, compact and precise
- **Gallery list titles:** DM Sans, 400–500 weight, oversized editorial scale
- **Project headings:** DM Sans, 500–700 weight depending on hierarchy
- **Body text:** DM Sans, 400–500 weight, comfortable reading measure
- **Metadata:** DM Sans, 500–600 weight, small but not faint

### Type behavior

- Use `clamp()` for display and list typography.
- Display tracking may reach `-0.04em`, but glyphs must never touch.
- Keep body copy between 60 and 72 characters per line.
- Use tight display leading around `0.95–1.1` and body leading around `1.5–1.65`.
- Use tabular numerals for dates, counters, and indexes.
- Project titles use their actual capitalization. Navigation labels may remain uppercase.
- Avoid decorative text animation that reduces readability.

---

## Grid and spacing

Use a 4px base unit with an 8px visual rhythm.

### Page gutters

- Wide desktop: 48px minimum
- Laptop: 32px minimum
- Tablet: 24px minimum
- Mobile: 16px minimum

### Structural grid

- A subtle vertical guide grid may remain visible on gallery pages.
- Guide lines are structural, not decorative texture.
- Media should align to the guide grid or deliberately break it by a clearly perceptible amount.
- Ordinary page content uses a maximum readable width rather than stretching across ultra-wide screens.

### Gallery columns

- Wide desktop: 4 project cards per row
- Tablet and compact laptop: 3 cards per row
- Mobile: 2 cards per row
- Card aspect ratios come from the supplied design or content model.
- The base Grid view is clean: no per-card perspective, skew, or rotation.
- Spatial distortion is reserved for a future, separately authored WebGL mode.

---

## Interface chrome

### Desktop header

- Fixed logo at the upper-left
- Fixed primary navigation at the upper-right
- View switcher centered near the top
- Header remains visually light and does not create a solid full-width bar
- Current location is darker than inactive navigation items

### Tablet and mobile header

- Fixed logo at the upper-left
- 44–48px menu control at the upper-right
- Desktop navigation is replaced by a full-screen neutral overlay
- Menu links use large editorial type and strong vertical rhythm
- The overlay closes with the menu button, Escape, or navigation selection
- Opening the overlay locks background scrolling, traps focus, and restores focus when closed
- The view switcher may move to the bottom-center to protect horizontal space

### View switcher

- Compact segmented control
- Labels describe genuine alternate views
- Active state uses a neutral filled pill; inactive state remains readable
- Switching views should not create layout shift in the control
- The switcher must remain keyboard-operable and expose the active state semantically

### Tooltips

- Use the supplied 20px arrow icon
- Show project title and date/year
- Use the same neutral glass treatment as the view switcher
- Position beside the custom cursor while avoiding viewport edges
- Tooltips are supplementary; project identity must remain accessible without hover

---

## Home / Design gallery

### Grid view

- A clean, repeating gallery arranged on the structural grid
- Same-size project cards unless Figma defines a later hierarchy
- Large vertical breathing room between rows
- Hover may use a small scale increase and tooltip; no permanent card distortion
- Infinite scrolling repeats the same project sequence without a visible seam
- Scroll position wraps only after the user is safely inside a duplicated cycle
- Project cards open the shared Case Study View

### List view

- Oversized project titles form the primary visual field
- Inactive titles use tertiary gray; hovered/focused titles use foreground ink
- A selected or hovered project may reveal a media preview at the opposite edge
- The list repeats seamlessly from the same project dataset as Grid view
- Text must wrap or scale intentionally on narrow screens; it must not clip horizontally

### Infinite behavior

- Repetition should feel continuous, not like loading additional pages
- Maintain one canonical dataset and duplicate only presentation cycles
- Hide duplicated cycles from assistive technology and keyboard navigation
- Avoid scroll-velocity effects that repeatedly create animation instances
- If scroll scaling is used, trigger one restrained compress action per scroll burst and one settle action when scrolling ends
- Disable decorative scroll scaling on mobile and reduced-motion paths

---

## Art and Photography galleries

Art and Photography share the same gallery components, interaction rules, and compatible data structure.

### Grid view

- Neutral, image-first grid
- Preserve source aspect ratios when the content requires it
- Show title/date metadata without relying on hover on touch devices
- No spatial distortion in the default accessible view

### Spiral view

The Spiral view should feel like a navigable media field with an original composition.

- Use one shared React Three Fiber canvas for the gallery
- Arrange media along a custom helical or ribbon path
- Keep the current item dominant and readable; surrounding items establish direction and depth
- Scroll or drag advances through one bounded sequence
- The camera should move predictably along the portfolio's own path system
- Selection opens the same Media View used by Grid view
- HTML overlays provide navigation, labels, status, and accessibility

### Spiral mobile strategy

- Reduce visible item count, texture resolution, DPR, and depth
- Prefer drag plus vertical scroll rather than hover-dependent interaction
- If performance is insufficient, replace Spiral with a flat scroll-snap interpretation while preserving the same order
- Never ship the desktop scene unchanged to mobile

---

## Case Study View

- Use a shared, data-driven renderer for every design project
- Begin with a clear project identity block: title, role/context, date, and restrained summary
- Let media dominate after the introduction
- Alternate reusable layout families according to content: full-width, columns, asymmetric, text, and video
- Preserve generous vertical intervals between major chapters
- Avoid adding gallery-like 3D interaction inside ordinary case-study reading unless a project specifically requires it
- Provide a persistent or obvious path back to the Home gallery

---

## Shared Media View

- The selected image is the dominant focal point
- Always preserve the original aspect ratio
- Never crop primary media
- Center and constrain media with behavior equivalent to `object-fit: contain`
- Keep caption and date visually secondary
- Previous/next zones are calculated from the rendered media bounds
- Support Arrow Left / Arrow Right navigation where appropriate
- Provide explicit touch controls because empty-side click zones are not self-evident on touch screens
- Art and Photography reuse this viewer without duplicated implementations

---

## Cursor and pointer behavior

- Custom cursor is available only for fine pointers with hover capability
- Default state: small filled near-black circle
- Interactive state: larger outlined circle
- Movement may lag slightly through interpolation, but must remain responsive
- Never use React state for per-frame cursor coordinates
- Cursor changes supplement native semantics and must not be the only interaction cue
- Native cursor remains for coarse pointers, reduced-motion users, and unsupported environments
- Mobile and tablet interactions must work without hover

---

## Motion system

Motion should communicate spatial continuity, selection, and navigation state.

### Motion tokens

```css
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

### Timing ranges

- Tooltip: 80–120ms
- Button and switch feedback: 120–180ms
- Card hover: 180–240ms
- Menu overlay: 280–360ms
- View transition: 400–600ms
- Gallery camera settle: 450–800ms depending on distance

### Motion rules

- Animate transform and opacity on hot paths.
- Do not animate layout properties during scrolling.
- Significant scroll sequences use GSAP; smooth scrolling uses Lenis where required.
- Do not create a new GSAP tween for every raw scroll event.
- Clamp velocity-reactive behavior aggressively.
- Remove `will-change` when an element is no longer animating where practical.
- View changes should feel continuous but remain interruptible.
- Never animate simply to keep the screen moving.

### Reduced motion

- Disable smooth scrolling and cursor lag.
- Replace spatial transitions with short opacity changes.
- Freeze decorative WebGL motion.
- Show a flat, complete gallery representation.
- Keep all content and navigation functional.

---

## Responsive behavior

### Desktop

- Full navigation and top-centered view control
- Four-column Home grid
- Cursor tooltip and hover preview available
- Spatial gallery modes may use the full viewport

### Tablet

- Three-column Home grid
- Menu icon replaces desktop navigation at the approved breakpoint
- Touch-visible metadata
- Reduced spacing and motion duration
- WebGL item count and DPR are reduced

### Mobile

- Two-column Home grid
- Full-screen navigation overlay
- Bottom-centered view switcher where required
- No hover-only information
- No decorative scroll scaling, parallax, or expensive post-processing
- 44px minimum targets and safe-area-aware fixed controls

Test at 360, 390, 768, 1024, 1440, and 1920 pixels without horizontal overflow.

---

## Accessibility

- Use semantic links, buttons, navigation, headings, figures, and captions
- Every interactive element has a visible `:focus-visible` state
- Menus trap focus, close with Escape, and restore focus
- Grid/List and Grid/Spiral controls expose their active state
- Duplicated infinite-scroll content is removed from the accessibility tree and tab order
- Meaningful images have specific alt text; decorative duplicates use empty alt text
- Text and UI boundaries meet WCAG AA contrast
- Touch interactions never depend on hover
- Support `prefers-reduced-motion` and `prefers-reduced-transparency`
- Preserve core browsing and sequential navigation without WebGL

---

## Performance

- Prioritize the first visible project media as HTML imagery
- Lazy-load below-fold media
- Reserve media dimensions to prevent layout shift
- Keep animation logic below 10ms per frame
- Avoid React state updates during pointer, scroll, shader, or camera frames
- Lazy-load the future Spiral canvas after the initial HTML interface is interactive
- Clamp WebGL DPR to a maximum of 2 and lower it on mobile
- Compress textures and keep only nearby gallery media resident where practical
- Pause WebGL when the document is hidden or the gallery is off-screen
- Disable nonessential post-processing on mobile and low-powered devices
- Maintain a flat fallback using the same content data

---

## Do not do

- Do not apply perspective, skew, or rotation to every card in the normal Grid view
- Do not turn navigation, text, or metadata into WebGL
- Do not maintain separate datasets for alternate views
- Do not hide essential labels behind hover
- Do not use motion to compensate for weak hierarchy
- Do not add large gradients, neon glow, heavy shadows, or generic SaaS cards
- Do not ship desktop navigation unchanged on mobile
- Do not sacrifice image clarity or interaction predictability for spectacle

---

## Implementation order

1. Establish semantic data and routes.
2. Implement Figma-defined HTML structure and static CSS.
3. Verify desktop, tablet, and mobile layouts.
4. Add accessible interaction states and menus.
5. Add restrained cursor and smooth-scroll behavior.
6. Implement shared viewers and keyboard/touch navigation.
7. Build the Art/Photography Spiral as an isolated progressive enhancement.
8. Add reduced-motion and flat fallbacks.
9. Profile performance and reduce mobile complexity.
10. Compare every page against Figma and this document before shipping.

---

## Acceptance checklist

- The interface uses the portfolio's gray/near-black theme.
- The result is recognizably Jhelli's portfolio.
- Images remain the dominant visual material.
- Alternate views share their content datasets.
- Home is 4 columns on desktop, 3 on tablet, and 2 on mobile.
- Desktop navigation becomes an accessible full-screen menu on smaller screens.
- The default Grid view has no permanent card distortion.
- Infinite scrolling has no visible seam or keyboard duplication.
- Hover enhancements have touch equivalents.
- Media View never crops the selected image.
- Motion is smooth, restrained, interruptible, and reduced-motion safe.
- Any WebGL gallery has a performant mobile strategy and complete flat fallback.
- No horizontal overflow occurs at the required verification widths.
