# Portfolio Website

## Project

Personal portfolio website for UI/UX design, art, and photography.

The site should feel minimal, experimental, image-focused, and interaction-driven.

Visual inspiration may come from contemporary creative portfolio websites such as K95, but implementations must be original.

Prioritize:

1. Visual fidelity
2. Interaction quality
3. Performance
4. Maintainable architecture
5. Responsive behavior

---

## Stack

Core stack:

- React
- TypeScript
- Vite
- CSS
- GSAP + ScrollTrigger
- Lenis
- Three.js
- React Three Fiber
- Drei where useful
- GLSL shaders where appropriate

Do not introduce Tailwind unless explicitly requested.

Use CSS custom properties for shared design tokens.

Do not add dependencies when the existing stack can reasonably handle the task.

---

# Website Structure

The website has three primary content areas:

- Home / Design
- Art
- Photography

There are two primary viewer systems:

- Case Study View
- Media View for Art and Photography

---

## Home / Design

Home is the primary design portfolio gallery.

It displays all UI/UX case-study projects.

Users can switch between:

- Grid View
- List View

Both views must use the same underlying project data.

Clicking a project opens its Case Study View.

Do not maintain separate content datasets for Grid and List views.

---

## Case Study View

All UI/UX projects use a shared case-study page system.

Do not create separate React page components for individual projects unless there is a strong architectural reason.

Case-study content should be data-driven.

Projects may contain different combinations of:

- text
- images
- video
- full-width media
- multi-column media
- asymmetric image layouts
- other reusable content sections

Create reusable section/layout components as they become necessary.

Project-specific content, media, ordering, and layout configuration belong in project data rather than being hardcoded into the generic case-study renderer.

---

## Art

Art is a gallery containing all artworks.

Users can switch between:

- Grid View
- 3D Spiral View

Both views must use the same underlying artwork data.

Clicking an artwork opens the shared Media View.

---

## Photography

Photography follows the same architecture and interaction model as Art.

Users can switch between:

- Grid View
- 3D Spiral View

Both views must use the same underlying photography data.

Clicking a photograph opens the shared Media View.

Art and Photography should reuse the same gallery/viewer components whenever their behavior is identical.

Do not duplicate implementations merely because the content type differs.

---

# Media View

Art and Photography use a shared media viewer.

The selected image is the primary focus of the screen.

Images must:

- preserve their original aspect ratio
- never be cropped
- remain centered
- fit within the available viewport
- work correctly for portrait, landscape, square, and unusual aspect ratios

The image should generally behave like `object-fit: contain`, constrained by the available viewport.

Each artwork or photograph includes:

- image
- short caption / description
- date

The metadata should remain visually secondary to the image.

---

## Media Navigation

Users navigate sequentially through Art or Photography from the Media View.

Clicking the empty area to one side of the image navigates to the previous item.

Clicking the empty area on the opposite side navigates to the next item.

Navigation zones must account for the actual rendered image dimensions rather than assuming a fixed image width.

Navigation must not interfere with metadata or other interactive UI.

Keyboard navigation may also be supported where appropriate.

Navigation should remain understandable on touch devices where hover cues are unavailable.

---

# Content Architecture

Content should be data-driven.

Maintain structured data for:

- case studies
- artwork
- photography

Art and Photography items should share a compatible data model where practical.

Do not hardcode content repeatedly inside page components.

Exact TypeScript schemas should live in the codebase rather than in this file.

This document defines the architectural intent; TypeScript types define the implementation contract.

---

# Figma Workflow

Figma is the source of truth for static visual design.

When implementing a supplied Figma frame:

1. Read this `AGENTS.md`.
2. Inspect the existing implementation.
3. Use the relevant Figma/design-to-code skill.
4. Use Figma MCP to inspect the requested frame.
5. Inspect only additional nodes necessary to understand that design.
6. Identify reusable components and design tokens.
7. Implement the static design first.
8. Compare the result against Figma.
9. Add advanced motion/WebGL in a separate pass unless explicitly requested.

Do not reproduce Figma's layer hierarchy literally.

Translate the design into sensible React architecture.

Implement only the requested page/frame unless related frames are necessary to understand responsive behavior or shared components.

When desktop/mobile/tablet frames describe the same page, use them together to infer responsive behavior.

---

# Development Workflow

## Ask Before Implementing

When the user says they want to build, add, change, remove, redesign, fix, or otherwise do something in this project, do not begin implementation immediately.

Before modifying files or installing dependencies:

1. Ask at least one concise question about the requested change.
2. Confirm the intended scope, behavior, or important design choice.
3. Wait for the user's answer before implementing.

Follow this rule even when the request appears clear. The user may explicitly override it by telling you to implement immediately or proceed without questions.

Read-only requests, explanations, inspections, and status questions do not require implementation confirmation unless they would lead to file changes.

---

Before implementing a substantial feature:

1. Read the relevant existing files.
2. Understand the current architecture before changing it.
3. Check whether a suitable component, hook, utility, or system already exists.
4. Use the relevant installed skills.
5. Make the smallest coherent change that solves the task.
6. Preserve existing working behavior unless the task requires changing it.

Do not rewrite unrelated parts of the application.

Do not create parallel systems for functionality that already exists.

When architecture is unclear, inspect the codebase before making assumptions.

---

# Development Cues

## When implementing from Figma

Use the Figma design-to-code skill.

Focus first on:

- hierarchy
- typography
- spacing
- sizing
- grid
- imagery
- responsive relationships

Do not add speculative visual effects that are absent from the design or request.

---

## When working on visual design

Use the relevant Web Design / UI Design skills.

Preserve the site's established visual language.

Avoid drifting toward generic SaaS-style UI.

---

## When implementing motion

Use the appropriate creative frontend / GSAP skill.

Prefer GSAP for significant timeline or scroll-based animation.

Use ScrollTrigger for GSAP scroll interactions.

Use Lenis where smooth scrolling is required.

Motion should feel restrained, smooth, and intentional.

Do not animate something simply because it can be animated.

---

## When implementing 3D or WebGL

Use the Three.js / R3F skills.

Use React Three Fiber as the primary React integration for Three.js.

Good uses of WebGL include:

- the Art/Photography spiral gallery
- image distortion
- background/grid deformation
- subtle 3D interaction
- shader effects
- transitions that genuinely benefit from WebGL

Do not convert normal interface elements into WebGL without a reason.

HTML/CSS should remain the default for navigation, text, accessibility-critical UI, and ordinary layout.

---

## When implementing shaders

Use the relevant Three.js / GLSL skill.

Prefer uniforms and refs for frequently changing shader values.

Do not update React state every frame.

Keep shader complexity appropriate for the visual benefit it provides.

---

# Interaction Principles

Interactions should feel:

- smooth
- precise
- restrained
- slightly inertial where appropriate
- responsive to user intent

Experimental interaction must not make basic navigation difficult.

Hover effects must have sensible touch-device behavior.

Custom cursor behavior must not replace essential native interaction.

---

# Performance

Performance is especially important because the website may combine large imagery, animation, and WebGL.

Be conservative with:

- texture resolution
- geometry density
- DPR
- draw calls
- post-processing
- simultaneous animations

Lazy-load heavy content where appropriate.

Avoid unnecessary React renders during animation.

Do not update React state every animation frame when refs or shader uniforms are sufficient.

Simplify expensive effects on lower-powered or mobile devices when necessary.

---

# Responsive Behavior

Desktop is not the only target.

Layouts must adapt intentionally for:

- desktop
- laptop
- tablet
- mobile

Do not simply shrink desktop layouts.

Account for:

- touch input
- lack of hover
- different aspect ratios
- smaller viewport heights
- WebGL performance
- navigation hit areas
- typography and spacing

---

# Motion Accessibility

Respect `prefers-reduced-motion`.

When reduced motion is requested, simplify or disable:

- smooth scrolling
- decorative WebGL movement
- large page transitions
- aggressive scroll-linked effects

Core navigation and content must remain functional.

---

# Skills

Use installed skills when the current task matches their specialization.

Expected mapping:

- Figma implementation → Figma design-to-code
- Visual/interface decisions → Web Design / UI Design
- Creative frontend and motion → Prism
- Three.js / React Three Fiber / GLSL → Three.js skills
- Experimental WebGL experiences → Immersive 3D Web

Skills provide specialized technical knowledge.

`AGENTS.md` defines the rules and architecture specific to this portfolio.

If generic guidance from a skill conflicts with established project architecture, preserve the project's architecture unless explicitly instructed otherwise.

---

# General Rule

Build in layers:

Figma / visual reference  
→ semantic React structure  
→ CSS and responsive layout  
→ verify visual fidelity  
→ interaction and motion  
→ WebGL / shaders where needed  
→ performance refinement

Do not attempt to solve every layer simultaneously unless the task explicitly requires it.
