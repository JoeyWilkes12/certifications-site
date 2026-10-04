# Token roles

The original variables (`--navy-950`, `--gold`, `--display`, and so on) remain
available for source compatibility. New component CSS uses purpose-based roles.
Colors in `tokens.json` match the executable declarations in `tokens.css`.

| CSS role | Dark | Light | Use |
| --- | --- | --- | --- |
| `--surface-page` | Navy 950 | Paper | Body and primary content field |
| `--surface-panel` | Navy 900 | Light panel | Sidebar and supporting sections |
| `--surface-raised` | Navy 800 | White | Selected route and raised content |
| `--surface-inverse` | Paper | Navy 950 | Deliberate contrast band |
| `--text-primary` | Paper | Navy 950 | Headlines and body text |
| `--text-secondary` | Paper muted | Navy 700 | Descriptions and metadata |
| `--text-inverse` | Navy 950 | Paper | Text on the inverse surface |
| `--text-on-accent` | Ink | Ink | Text on gold actions |
| `--text-accent` | Gold soft | Gold ink | Gold-family labels and links |
| `--text-expressive` | Pink | Pink ink | Pink-family labels and links |
| `--border` | Translucent paper | Translucent navy | Decorative separators |
| `--border-strong` | Translucent gold | Strong translucent navy | Control boundaries |
| `--accent` | Gold | Gold | Primary action background |
| `--accent-hover` | Gold soft | Gold soft | Primary action hover background |
| `--expressive` | Pink | Pink deep | Current-route rules and decoration |
| `--focus` | Gold soft | Navy 700 | Visible keyboard focus outline |
| `--surface-scrim` | Translucent black | Translucent navy | Mobile menu backdrop |

`--accent` is a surface color. It does not provide sufficient text contrast on
paper. Choose `--text-accent` for light-theme text. The same distinction applies
to `--expressive` and `--text-expressive`.

The paper/navy primary pair, muted-paper/navy secondary pair, gold/ink action
pair, and darker light-theme accent text pairs meet WCAG AA normal-text contrast.
Subtle separator borders are decorative; use the stronger boundary role and
clear text/icon labels when a control needs to remain identifiable.

## Typography

The incumbent system uses local font stacks without remote font requests:

- `--display`: Iowan Old Style, Baskerville, Times New Roman, serif. Hero,
  section headings, quote text, and the personal brand.
- `--sans`: Avenir Next, Helvetica Neue, Segoe UI, sans-serif. Reading text,
  navigation, and action labels.
- `--mono`: SFMono-Regular, Cascadia Code, Roboto Mono, monospace. Route
  indices, metadata, numbered counters, and small utility labels.

Use `--type-display`, `--type-page-title`, `--type-section-title`,
`--type-quote`, `--type-body`, and `--type-label` for their named purposes. Body
text uses `--leading-body`; long prose uses `--leading-reading` and
`--measure-reading`. Preserve mobile type overrides from the consumer stylesheet
to prevent oversized long titles from breaking the layout.

## Geometry and motion

The space scale retains common July values instead of forcing every distance
onto a new grid. Shell dimensions, target sizes, and fluid gutters have named
roles. The 640px, 900px, and 1180px breakpoints remain in JSON because CSS custom
properties cannot be used in native media query conditions.

Controls use square corners; round geometry is reserved for utility controls,
social icons, and status marks. Content depth comes from navy tone changes and
hard gold/pink offset shadows. Navigation alone uses a soft overlay shadow.

Fast state transitions use 160ms; shell transitions use 260ms. Automatic
transitions stop when `prefers-reduced-motion: reduce` is active. Testimonials advance manually in this version. A reduced-motion
stylesheet disables decorative movement and smooth scrolling. The theme
preference itself changes immediately without a full-page color animation.
