---
name: "Joey Wilkes — Certification Gallery"
description: "Joey's portfolio palette and typography applied to the established credential gallery."
colors:
  gold: "#d9ad59"
  gold-soft: "#f0d48d"
  gold-ink: "#795219"
  pink: "#ff5c91"
  pink-deep: "#d93f76"
  pink-ink: "#a82556"
  navy-950: "#04101f"
  navy-900: "#081a33"
  navy-800: "#0d2748"
  navy-700: "#17385f"
  ink: "#05070b"
  paper: "#f5f0e7"
  paper-muted: "#c8c8c4"
  light-panel: "#ebe5d9"
  light-raised: "#ffffff"
  line: "rgba(245, 240, 231, 0.18)"
  dark-border-strong: "rgba(217, 173, 89, 0.42)"
  light-border: "rgba(4, 16, 31, 0.2)"
  light-border-strong: "rgba(4, 16, 31, 0.46)"
typography:
  display:
    fontFamily: '"Iowan Old Style", "Baskerville", "Times New Roman", serif'
    fontSize: "clamp(38px, 5.4vw, 72px)"
    fontWeight: 400
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  display-mobile:
    fontFamily: '"Iowan Old Style", "Baskerville", "Times New Roman", serif'
    fontSize: "clamp(40px, 12vw, 58px)"
    fontWeight: 400
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"Iowan Old Style", "Baskerville", "Times New Roman", serif'
    fontSize: "clamp(40px, 4.8vw, 64px)"
    fontWeight: 400
    lineHeight: 1.03
    letterSpacing: "-0.04em"
  section-title:
    fontFamily: '"Iowan Old Style", "Baskerville", "Times New Roman", serif'
    fontSize: "clamp(32px, 3.5vw, 48px)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  title:
    fontFamily: '"Iowan Old Style", "Baskerville", "Times New Roman", serif'
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.14
    letterSpacing: "-0.025em"
  title-mobile:
    fontFamily: '"Iowan Old Style", "Baskerville", "Times New Roman", serif'
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  row-title:
    fontFamily: '"Iowan Old Style", "Baskerville", "Times New Roman", serif'
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  badge-title:
    fontFamily: '"Iowan Old Style", "Baskerville", "Times New Roman", serif'
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.16
    letterSpacing: "-0.02em"
  quote:
    fontFamily: '"Iowan Old Style", "Baskerville", "Times New Roman", serif'
    fontSize: "clamp(21px, 1.75vw, 27px)"
    lineHeight: 1.6
  body:
    fontFamily: '"Avenir Next", "Helvetica Neue", "Segoe UI", sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  control:
    fontFamily: '"Avenir Next", "Helvetica Neue", "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.6
  label:
    fontFamily: '"Avenir Next", "Helvetica Neue", "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.6
  position:
    fontFamily: '"SFMono-Regular", "Cascadia Code", "Roboto Mono", monospace'
    fontSize: "12px"
    lineHeight: 1.6
rounded:
  control: "0"
  round: "50%"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "7": "28px"
  "8": "38px"
  "9": "48px"
  "10": "72px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "13px 18px"
  button-primary-hover:
    backgroundColor: "{colors.gold-soft}"
    textColor: "{colors.ink}"
  button-quiet:
    backgroundColor: "{colors.navy-900}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "11px 15px"
  button-quiet-light:
    backgroundColor: "{colors.light-panel}"
    textColor: "{colors.navy-950}"
    rounded: "{rounded.control}"
  search:
    backgroundColor: "{colors.navy-800}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  search-light:
    backgroundColor: "{colors.light-raised}"
    textColor: "{colors.navy-950}"
  status-select:
    backgroundColor: "{colors.navy-800}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "9px 28px 9px 10px"
  filter-selected:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 13px"
  record-status:
    rounded: "{rounded.control}"
    padding: "4px 8px"
  front-card:
    backgroundColor: "{colors.navy-800}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "24px 28px 26px"
  front-card-light:
    backgroundColor: "{colors.light-raised}"
    textColor: "{colors.navy-950}"
  theme-toggle:
    backgroundColor: "{colors.navy-900}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "4px"
  collection-navigation:
    textColor: "{colors.paper}"
    typography: "{typography.control}"
  learning-disclosure:
    textColor: "{colors.paper}"
    padding: "12px 8px"
---

# Design System: Joey Wilkes — Certification Gallery

## Overview

**Creative North Star: "Joey's Portfolio Gallery"**

This gallery belongs to Joey's established portfolio world: navy and warm paper, gold actions, expressive pink, old-style serif headings and square controls. Its confident, personal voice comes from the user's chosen upstream theme; Avenir and Iowan are deliberate identity choices.

The implementation is a theme port over the existing gallery. The portfolio supplies color roles and typography; the gallery supplies composition, original credential artwork, orbital geometry and interaction. The result pairs a prominent visual showcase with compact evidence rows and readable permanent pages.

**Key Characteristics:**

- Navy and paper surfaces switch through shared semantic roles.
- Gold signals actions; pink adds expression and the hard feature shadow.
- Serif headings contrast with sans-serif facts and controls.
- Square surfaces frame original artwork and circular orbit details.
- Motion remains controlled, pausable and sensitive to reduced-motion preference.

Source authority: `design-system/tokens.css` and `tokens.json`, consumed through `assets/design-system/portfolio-tokens.css` and `portfolio-theme.css`; retained geometry lives in `styles.css` and `app.js`. The source is **July 2026 personal website system v1.0.0**, repository `JoeyWilkes12/personal-websites`, branch `replit/autoscale-2026-10-03-v1.0.1`, app `2026-10-03_v1.0.1`, verified release head `85e31d8565dd1a5458416537fdab7ab70758a075`. All 110 source declarations match the deployed stylesheet after minification normalization; the exact running deployment SHA is unconfirmed. See `design-system/provenance.json`.

## Colors

Warm gold and pink punctuate a paired navy-and-paper foundation. The frontmatter preserves source values; semantic `--portfolio-` roles determine the current theme.

### Primary

- **Portfolio Gold** (`gold`) fills primary actions, selected filters and the active appearance icon; **Soft Gold** (`gold-soft`) supplies hover and dark-theme links/focus.
- **Gold Ink** (`gold-ink`) supplies readable accent text on light surfaces.

### Secondary

- **Expressive Pink** (`pink`) colors the emphasized showcase heading and dark-theme progress/expiry text.
- **Deep Pink** (`pink-deep`) supplies the showcase's hard offset and light-theme expressive mixes; **Pink Ink** (`pink-ink`) is light-theme expressive text.

### Neutral

- **Midnight / Panel / Raised Navy** (`navy-950`, `navy-900`, `navy-800`) establish dark page, panel and card depth.
- **Secondary Navy** (`navy-700`) supplies light secondary text and focus; **Action Ink** (`ink`) stays on gold.
- **Warm Paper / Muted Paper** (`paper`, `paper-muted`) supply dark primary/secondary text. **Light Panel / White Mount** (`light-panel`, `light-raised`) supply light surfaces; credential artwork keeps its white mount in both themes.
- `line` and the theme-specific border colors divide records and outline controls.

| Semantic role | Dark | Light |
| --- | --- | --- |
| Surface: page / panel / raised | navy-950 / navy-900 / navy-800 | paper / light-panel / light-raised |
| Text: primary / secondary | paper / paper-muted | navy-950 / navy-700 |
| Accent text / expressive text | gold-soft / pink | gold-ink / pink-ink |
| Action / hover / action text | gold / gold-soft / ink | gold / gold-soft / ink |
| Expressive mix source / focus | pink / gold-soft | pink-deep / navy-700 |
| Divider / control border | line / dark-border-strong | light-border / light-border-strong |

Completed status uses accent text over a 12% accent/raised-surface mix. Progress and expiry use expressive text over an 8% expressive/raised-surface mix. Planned status uses secondary text on panel. Initial appearance follows device preference; stored explicit preference overrides it.

**The Semantic Theme Rule.** Consume `--portfolio-surface-*`, `--portfolio-text-*`, `--portfolio-accent`, `--portfolio-expressive`, `--portfolio-border*` and `--portfolio-focus`; preserve their source values and use theme roles rather than hardcoding a dark-only skin.

## Typography

**Display Font:** Iowan Old Style, Baskerville, Times New Roman, serif.  
**Body Font:** Avenir Next, Helvetica Neue, Segoe UI, sans-serif.  
**Position/Shortcut Font:** SFMono-Regular, Cascadia Code, Roboto Mono, monospace.

These system stacks pair editorial headings with compact, clear facts. Heading weight is regular (400); control and issuer emphasis is generally semibold (600). There is no single geometric type-scale ratio.

### Hierarchy

- **Display:** the showcase uses `display`; at ≤700px it uses `display-mobile`. Presentation mode uses a mobile headline of 42px.
- **Headline:** permanent credential titles use `headline`, with 40px on mobile and a desktop measure of 23ch.
- **Section title:** the primary collection uses `section-title`. Other retained section titles range from 32px to 38px according to context.
- **Title:** front-card captions use `title`, 26px at ≤1100px and `title-mobile` at ≤700px. These compact captions are distinct from the larger upstream portfolio display token.
- **Row / badge title:** use `row-title` / `badge-title`; mobile sizes become 16px / 18px.
- **Body:** `body` sets the page baseline. Detail overview uses 1.8 leading and 70ch; disclosure overview uses 14px/1.6 and 72ch.
- **Quote:** issuer excerpts use `quote`, with the retained 1.6 leading.
- **Labels:** issuer labels use `label`; metadata remains context-specific at 10–12px. Search and filters use 12px; orbit position uses `position` with tabular numerals. The upstream uppercase tracked label style is not applied to this gallery.

**The Source Type Rule.** Keep the Iowan/Avenir stacks and regular serif headings; retain each gallery component's responsive size instead of substituting the upstream portfolio's larger page-title scale.

## Layout

The centered page caps at 1280px. Its total side allowance is 96px normally, 56px at ≤1100px and 32px at ≤700px. The desktop showcase keeps introduction and orbit beside one another in `.82fr / 1.18fr` columns, with 48px 52px 25px padding and a 620px minimum height. Compact desktop uses `.85fr / 1.15fr`; mobile stacks introduction, reel and controls with 30px 20px 18px padding.

The reel and stack retain 520px minimum height, becoming 470px on mobile. The front card is `min(310px, 82%)`, then 280px at ≤1100px and `min(230px, 70%)` at ≤700px. Side cards step from 168px to 150px to 112px. Do not replace this geometry with a conventional card grid.

Evidence rows retain five desktop columns; they reflow at 1200px and 1000px, then become two columns at 700px with evidence actions beneath the facts. Detail heroes pair a 300px artwork mount with text, reduce the artwork column at 1000px, and stack at 700px. Detail reading columns and disclosure content also collapse at these breakpoints. Minimum regression viewports are 1440px desktop and 390px mobile.

The spacing entries name loaded source steps that recur in retained gallery geometry; they do not replace the original component padding. The touch-target token is 44px and is consumed by key actions, search, filters and appearance controls. Verify rendered target dimensions rather than assuming every existing control meets the token; pagination retains smaller hit areas.

## Elevation & Depth

Tonal page/panel/raised layers provide the foundation. The showcase uses a source-family hard pink offset adapted to the gallery (12px 12px); presentation mode removes it. Orbit cards keep the original diffuse spatial shadows: front 0 30px 60px with 40% midnight navy, side 0 14px 30px with 19%, hover 0 20px 40px with 33%. The sidecar records their exact CSS.

Artwork focus uses a navy outline plus white and gold rings so the signal remains legible on the original white mount. The halo uses a gold border, pulse and dashed rotation; it is an interaction cue around artwork, not a new card surface.

## Shapes

Controls, filters, status labels, search fields, cards, artwork panels and detail heroes have square corners (`control`). Circular artwork links, halo and orbit lines retain their original circular geometry (`round`). Pagination retains circular inactive markers and a square active marker. Keep issuer artwork unchanged: full images use containment, while the reel's existing record-specific crops remain in `styles.css`.

## Components

### Buttons

Primary actions are gold with action ink, square corners, 13px 18px padding and a CSS minimum height of 44px; hover uses soft gold. Quiet actions use panel surfaces and strong borders, with raised-surface hover. Orbit previous/next controls retain 44px square dimensions; gold appears on hover. Visible focus is a 3px theme-role outline with retained offsets. Disabled buttons keep the original reduced opacity and default cursor.

### Search and filters

Search is a 44px raised-surface field with strong border, 12px text, inline search icon and a monospace shortcut hint hidden on mobile. Category filters are transparent with secondary text; selected filters are gold/ink and exposed through `aria-pressed`. The status filter retains the native select element, popup and keyboard behavior, with `appearance: none` so its 44px CSS minimum works in mobile WebKit. A non-interactive CSS chevron (6px) overlays the theme-role border/surface; right padding (28px) clears the selected text in both layouts. Keyboard focus remains visible through the shared 3px outline. Both collections keep independent search.

### Status and topic labels

Status labels are compact, square, semibold and explicit in text; completion, progress and planned roles follow Colors. Topics use secondary text on panel. Personal favorite/rating stars remain visually separate from issuer facts.

### Navigation and appearance

Collection navigation is a quiet semibold text link with underline on hover, hidden in the mobile header. Detail navigation retains back-to-record and evidence links. The square appearance toggle contains sun/moon icons; the active icon is gold. Preserve accessible names and `aria-pressed` state.

### Orbit cards

Only the front card exposes its caption; side tiles show artwork. White artwork mounts and original crops remain intact in both themes. Preserve the original pointer, swipe, keyboard and evidence-link behavior. Auto-rotation rests for 3600ms, glides for 900ms with cubic ease-out, and resumes after 6000ms of inactivity. Hover, focus, dragging, an offscreen reel or hidden document suspend auto-rotation. Reduced motion disables auto-rotation, CSS animation/transition and smooth scrolling; manual selection still works without glide.

### Evidence rows and learning disclosures

Rows use separators, a regular serif title and compact sans-serif metadata; hover uses the panel surface. Native learning disclosures retain their square artwork, chevron and expandable evidence/context area. The disclosure marker turns in 140ms; reduced motion removes the transition. Preserve readable source labels and permanent navigation with JavaScript disabled.

## Do's and Don'ts

### Do:

- **Do** use the namespaced semantic roles for both light and dark appearances.
- **Do** preserve original artwork, white mounts, record-specific crops and orbital geometry.
- **Do** retain Iowan/Avenir typography and the actual responsive caption sizes.
- **Do** verify focus, reduced motion, navigation and overflow at 390px and 1440px.
- **Do** keep shared source tokens and provenance aligned when refreshing the portfolio theme.

### Don't:

- **Don't** replace this theme port with a new visual identity or change the established interactions.
- **Don't** apply rounded control presets to the square portfolio surfaces.
- **Don't** recolor issuer artwork or promote personal ratings into issuer metadata.
- **Don't** copy unused upstream sidebar, testimonial or portfolio layout rules into gallery screens.
- **Don't** treat loaded upstream tokens or sidecar tonal previews as evidence of components or colors used by this gallery.
