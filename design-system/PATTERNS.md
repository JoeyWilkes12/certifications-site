# Component and composition contracts

This folder belongs only to `2026-10-03_v1.0.1`. The July website is the visual source; Imperial 3.0 supplies the content and behavior.

## Shell and navigation

`SiteShell({ children: ReactNode })` reserves a fixed 292px sidebar on desktop, with a 92px collapsed state. Native links preserve accessible names and `aria-current`. Native nested disclosures expose credentials and academic reports without stealing the parent page’s destination. Below 900px, a 72px header contains a native `details.mobile-navigation` Menu disclosure. Links close it after navigation; Escape returns focus to the summary. Native navigation works without JavaScript.

`ThemeToggle` follows device appearance until a selected light/dark preference is stored. It uses semantic tokens, a labeled SVG icon, and a minimum 44px target. Storage denial retains the current page’s choice. Both header and sidebar controls describe the destination theme.

## Page and record composition

`PageHero({ title, description?, children? })` exposes one serif `h1` and concise reading copy. `PortfolioContent`, `AcademicContent`, `AcademicReportContent`, `ProfessionalContent`, and `ResumeContent` compose typed canonical JSON data. Divide records with fine rules, metadata first, and a serif title; let records stack on mobile. Keep body copy under 72ch.

Report pages preserve title, authors, source date precision, page count, topics, and pinned source links. A direct PDF link and download accompany an accessible lazy PDF iframe. Compact screens prioritize the direct actions. Structured CreativeWork metadata identifies PDF MIME and source.

## Actions

`.button` plus `.button--primary` or `.button--quiet` uses a native anchor for destinations and native button for actions. The shape is square and at least 52px tall. Gold surfaces use `--text-on-accent`; quiet actions use readable theme text and a boundary. Hover, focus, and reduced-motion states preserve the same function. `ExternalLink` adds a consistent authored SVG and `noopener noreferrer`.

## Testimonials

`TestimonialCarousel()` reads the five approved entries. `.testimonial-slide` contains only the complete quote, a pink quotation mark, and a navy reading field with gold offset. Previous/Next and arrow keys wrap through all five. There is no automatic rotation. A polite live region announces deliberate changes. Without JavaScript, every quote is visible and the inactive controls are hidden. Long quotes expand naturally.

## Résumé disclosures and print

Each role contains a native `details.role-details` with Show/Hide responsibilities labels and a chevron. Four disclosures expand independently; all 13 source bullets remain in static HTML. Printing exposes all bullets with light paper and dark text. JavaScript print events restore the previous disclosure state; print CSS also handles JavaScript-disabled reading. QR pixels remain unfiltered in both themes.

## Verification

Playwright covers 390px and 1440px layouts, theme persistence/device changes, storage denial, menu dismissal/focus, sidebar collapse, all source content, every report/download, manual carousel wrap, no-JavaScript access, print expansion/restoration, reduced motion, and overflow. `tests/check-links.mjs` checks all emitted pages and resources plus external redirects, failing 4xx/5xx. Rendered screenshots accompany the regression run.

## Contact links

Use `ContactLink` for GitHub, LinkedIn, and compact email actions. Pair the platform or envelope icon with a northeast arrow, including mailto links. Preserve an accessible name and title, keep both vectors decorative, and maintain at least 44 × 44px targets. Platform links open a new tab; email opens the visitor’s mail application. The résumé’s full email address remains readable. Icons use currentColor in both themes and print.

Feather vectors come from `shared-assets/icons/contact/`; the build bundles the SVGs and MIT notice under `public/assets/icons/contact/` for standalone releases. All presentation rules remain inside this version.
