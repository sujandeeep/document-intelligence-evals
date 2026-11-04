# Universal Three-Panel Enterprise UI Design Guide — V2

**Version:** 2 · 18 October 2026 · owner-approved design contract; soundness revision the same day. Adoption is verified per product.
**Status:** Current single source of truth for Telemetry, SAM (`sam-new`), HAM, and any product adopting this shell.
**Audience:** Engineers and coding agents (greenfield and brownfield).
**Supersedes:** [V1](archive/historical-root-20261026/frontend-ui-design-guide.md) and split “playbook vs design guide” pairs. V1 is retained as a historical reference; V2 governs new and changed UI. Do not maintain competing active contracts. This document changes requirements, not deployed applications. Product docs must record unimplemented requirements and dated verification separately.

V2 preserves the shell, tokens and visual language. It adds interaction continuity, coherent drill-down, copy/export semantics, tablet targets, complete filter behavior and journey-based acceptance. Product entities, permissions, retention and business workflows belong in each product’s own documentation.

| Clause | Meaning |
|---|---|
| **Must** | Required. Fail review if violated. |
| **Should** | Default; deviate only with a documented product reason. |
| **May** | Optional. |
| **Must not** | Forbidden even if it looks “modern.” |

**Resolved contract (do not re-litigate):**

| Topic | Canonical rule |
|---|---|
| Minimum viewport | **900×600** hard gate (not 1024×768) |
| Landscape-only? | **No** — tall windows OK when both floors are met |
| Compact nav backdrop | **Transparent** click-catcher (never grey/blur dim) |
| Panel 2 stream rows | **Two-line** title + meta; **44px** compact or **56px** relaxed (not 68px three-line) |
| Auto-collapse | Width **&lt; 1440** → 56px rail + overlay expand. Exactly 1440 is wide |
| Shell sum | Splitter hit areas **overlay** the seam. Compact floor is **56 + 360 + 480 = 896**, which fits in 900. Panel 2 never goes below **360** |

Reference implementations (patterns only — do not copy product chrome):

| Product | Shell entrypoints |
|---|---|
| Telemetry | `dashboard/src/App.jsx`, `SupportedViewportGate.jsx`, `dashboard/src/index.css` |
| SAM | `frontend/src/App.jsx`, `frontend/src/components/Sidebar.jsx`, `frontend/src/components/Header.jsx`, `frontend/src/components/ScreenResolutionNotice.jsx` |
| HAM | `src/App.jsx`, `SupportedViewportGate.jsx`, `src/index.css` |

---

## 1. Purpose and product mapping

Outlook-inspired enterprise desktop UI: compact, flat, restrained, information-dense. Not a card dashboard, mobile consumer app, or decorative analytics page.

The adopting product supplies name, destinations, items, permissions, and actions. Those must map into this geometry; they must not change the visual language.

| Design role | Product supplies | Notes |
|---|---|---|
| Global bar (48px) | Brand, version, optional search, theme, account | Nav toggle **Must** be reachable in compact mode |
| Panel 1 | Destinations + counts | Navigation only |
| Panel 2 | Searchable/filterable item list | Selection drives Panel 3 |
| Panel 3 | Selected-item detail + actions | Tabs/toolbars fixed; body scrolls |
| Auth gate | Directory sign-in | Initial entry or in-place recovery dialog; protected content hidden |
| Viewport gate | Unsupported-size notice | Hard gate; no dismissible bypass |
| Activity strip | Optional background job status | Below global bar; does not overlay panels |

If there is **no** meaningful selectable list, **Must not** force three panels. Use one workspace under the global bar with the same tokens and controls.

Framework choice (React, Vue, etc.) is irrelevant. Rendered geometry, tokens, and interactions are the compatibility boundary.

---

## 2. Design intent

**Must:**

- Fill the layout viewport; no centered page chrome. `html`, `body`, and the app root are `width: 100%; height: 100%; margin: 0`. The shell is `width: 100%; height: 100%; overflow: hidden`. **Must not** size the shell with `100vw` (that width includes the scrollbar and clips the 480px detail floor)
- Fixed global bar + three-panel workspace
- Hairline borders and selection washes — not card sprawl
- One restrained blue accent; status color rare
- Integer px type; stable control geometry across states

**Must not:**

- Purple/indigo “AI” gradients, cream/terracotta editorial themes
- Glassmorphism, multi-layer glow shadows, emoji decoration
- Full-bleed marketing heroes inside the app shell
- Rounded-full pill clusters for ordinary actions
- Mobile stacked cards replacing the three-panel shell
- Raw framework colors in feature components

---

## 3. Viewport gate (hard)

| Rule | Value |
|---|---|
| Min width | **900px** |
| Min height | **600px** |
| Landscape-only (`width > height`) | **Forbidden** |
| Tall windows (e.g. 1275×1301) | **Supported** when floors are met |
| Behavior | Workspace **Must not** mount; no “continue anyway” |

**Copy:** `{Product} requires a larger screen` · show current `W × H` · state minimum `900 × 600` · maximize or move to a larger display.

**Must not:** soft blur warnings with dismiss; mount authenticated chrome behind the gate.

The hard gate controls rendering, not the lifetime of navigation memory. **Must**
preserve selected IDs, filters, expanded sections, scroll bookmarks and preferred
pane sizes when crossing the floor. Returning to a supported size restores the
same place, subject to fresh authorization and whether the item still exists.
Authentication and navigation ownership survive workspace unmounting. Hide the
credential form below the floor and clear the password when it unmounts. Keep the
in-memory username for that same recovery attempt. When the viewport is valid
again, show the sign-in dialog again with an empty password; the recovery state
stays “sign-in required” across the unmount. Never keep protected content
rendered behind either gate. Section 15 defines the identity key and the locked
workspace.

**Automated cases:** allow `900×600`, `1024×768`, `1275×1301`; block `899×700`, `1024×599`, `320×900`.

**Note:** `1024×768` is a **recommended UAT/backstop viewport**, not the minimum support floor.

---

## 4. Application frame

```
┌──────────────────────────── global bar 48px ────────────────────────────┐
├─ Panel 1 ─┼─ Panel 2 ─────────────────┼─ Panel 3 ───────────────────────┤
│ 220 / 56  │ list / filters            │ detail / actions                │
└───────────┴───────────────────────────┴─────────────────────────────────┘
  5px splitter hit areas overlay the seams. They are not flex columns.
```

**Must:**

- Root fills the layout viewport (`width: 100%; height: 100%`), `overflow: hidden`, no page scroll. **Must not** use `100vw`
- Shell and panes use `box-sizing: border-box`, so a border sits inside the stated pane width
- Vertical flex: global bar → optional activity strip → workspace
- Horizontal flex: Panel 1 (or the compact 56px spacer) → Panel 2 → Panel 3
- Scroll only inside explicitly owned content regions (`min-height: 0` on flex/grid children); see Section 12
- Truncation: `min-width: 0` + ellipsis

| Constant | Value |
|---|---|
| `--topbar-height` | **48px** |
| `--activity-strip-height` | **0** when absent; **32px** when the strip is shown |
| `--shell-offset` | `calc(var(--topbar-height) + var(--activity-strip-height))` |
| Panel 1 expanded | **220px** default; drag **180–320px** in wide mode only |
| Panel 1 collapsed | **56px** exact. Collapse is a control, not a drag position |
| Panel 2 width | Saved width, displayed inside **360–600px** after the fit below |
| Panel 2 default preference | `clamp(360px, 25vw, 480px)` only when the user has not dragged |
| Panel 3 min | **480px**. Leftover width goes to Panel 3 |
| Splitter hit area | **5px** overlay, centered on the seam, `z-index: 5` |

**Fit.** Saved widths are kept separately from the widths on screen.

Compact (`panel1` is the 56px spacer):

```text
displayedPanel2 = clamp(savedPanel2, 360, min(600, viewport - 56 - 480))
```

Wide. Collapse and drag are different states:

```text
collapsed rail:  displayedPanel1 = 56
expanded rail:   displayedPanel1 = clamp(savedPanel1, 180, min(320, viewport - 360 - 480))
either way:      displayedPanel2 = clamp(savedPanel2, 360, min(600, viewport - displayedPanel1 - 480))
```

At the 900px floor, compact mode, the upper bound is `900 - 56 - 480 = 364`. A saved width of 600 displays as **364** and is restored when the window grows. The minimum stays **360**. `56 + 360 + 480 = 896`, so the minimum panes fit in 900 with 4px to spare and the page does not scroll horizontally. A saved Panel 2 of 360 displays as 360.

Wide mode starts at 1440. `320 + 600 + 480 = 1400`, so both saved maxima fit at every supported wide width and Panel 3 is at least 520px. The wide-mode clamps above do not reduce a saved width inside the supported range.

Dragging the right splitter writes `savedPanel2` inside 360–600, then the fit runs. The left splitter exists only in wide mode while Panel 1 is expanded, and it writes `savedPanel1` inside 180–320. Dragging does not collapse the rail. Below 180px a label does not fit; the collapse control switches to the 56px rail instead.

An earlier same-day draft let Panel 2 shrink to 354–359px so two in-flow 5px splitters could fit in 900px. Hit areas overlay the seam and are not part of the sum. Panel 2 **Must not** go below 360px. Wide data may still scroll inside its own content region.

---

## 5. Compact overlay navigation

Canonical responsive nav for Telemetry / SAM / HAM. **Must not** reintroduce 57%-detail or aspect-ratio collapse engines.

| Viewport width | Mode |
|---|---|
| `&lt; 900` | Gate blocks (no workspace) |
| `900–1439` | **Compact:** 56px spacer + fixed rail; expand = overlay over P2 |
| `≥ 1440` | **Wide:** in-flow Panel 1; manual collapse/resize |

```text
MIN_SUPPORTED_VIEWPORT_WIDTH = 900
MIN_SUPPORTED_VIEWPORT_HEIGHT = 600
NAV_DRAWER_MAX_WIDTH = 900
NAV_AUTO_COLLAPSE_MAX_WIDTH = 1440

narrow  = width <  900                 // hard gate, no workspace
compact = width >= 900 && width < 1440 // 56px rail + overlay
wide    = width >= 1440                // in-flow Panel 1
```

`NAV_DRAWER_MAX_WIDTH` is the exclusive end of the blocked range. It is **not** the drawer’s width. The open drawer is **220px**. Both bounds are exclusive at the top: exactly 900 is compact, exactly 1440 is wide. Implement the comparisons as `width < constant`, not `width <= constant`.

**Compact expand Must:**

1. Keep **56px in-flow spacer** so Panel 2 does not jump.
2. Panel 1 `position: fixed` under `--shell-offset` (the bar, plus the activity strip when it is present). Set `top` and `bottom: 0`. Do not also set a `100vh` height.
3. Collapsed **56px**; open **220px**; light edge shadow only (`6px 0 28px` ~22% black).
4. Overlay **slides over** Panel 2 — does not push layout.
5. Backdrop is **`background: transparent`** — **no** `rgba` dim, **no** `backdrop-filter`.
6. Escape, outside click, and destination choice close the overlay.
7. Global bar exposes Menu/close with correct `aria-expanded`.
8. While the overlay is open, Panel 2 and Panel 3 are `inert`. Focus moves into the drawer. Tab cycles the drawer and the menu toggle. The global bar stays usable. On close, restore focus to the toggle.

```css
.nav-compact-spacer { width: 56px; min-width: 56px; flex-shrink: 0; }
.panel-1.nav-compact {
  position: fixed;
  top: var(--shell-offset);
  left: 0; bottom: 0;
  z-index: 850;
}
.panel-1.nav-compact.p1-collapsed { width: 56px; }
.panel-1.nav-compact.drawer-open {
  width: 220px; z-index: 900;
  box-shadow: 6px 0 28px rgba(0, 0, 0, 0.22);
}
.p1-drawer-backdrop {
  position: fixed;
  top: var(--shell-offset);
  left: 0; right: 0; bottom: 0;
  background: transparent;
  z-index: 890;
}
```

Wide mode stores its own collapse preference. Crossing **up** through 1440 closes the overlay and applies that preference (default expanded). An open overlay does not become the wide expanded pane. Crossing **down** through 1440 shows the 56px rail with the overlay closed and keeps the wide preference for the return trip. Compact mode always owns expand via the overlay’s open state. There is no Panel 1 resize handle in compact mode.

---

## 6. Exact design tokens

All feature UI **Must** use semantic CSS variables. Do not scatter raw hex in screens.

### Light

| Token | Value | Use |
|---|---:|---|
| `--surface-canvas` | `#f4f5f7` | Canvas / Panel 3 background |
| `--surface-base` | `#ffffff` | Top bar, Panel 2, dialogs |
| `--surface-raised` | `#ffffff` | Menus, popovers |
| `--surface-muted` | `#f8f9fa` | Panel 1, filter rows, table headers |
| `--surface-hover` | `#f1f3f5` | Hover |
| `--surface-selected` | `#e8f0fe` | Selected rows |
| `--surface-subtle` | `#f9fafb` | Key-value fields |
| `--text-primary` | `#1e293b` | Titles, values |
| `--text-secondary` | `#475569` | Descriptions |
| `--text-muted` | `#596779` | Metadata. Holds 4.5:1 on canvas, hover, and the selected wash |
| `--text-disabled` | `#94a3b8` | Disabled |
| `--text-on-accent` | `#ffffff` | On primary buttons |
| `--border-subtle` | `#f1f5f9` | Interior dividers |
| `--border-default` | `#e2e8f0` | Panel / row borders |
| `--border-strong` | `#7e8999` | Input boundary. Holds 3:1 on white and on the canvas |
| `--border-focus` | `#2563eb` | Focus |
| `--intent-primary` | `#2563eb` | Text, icons, selection, focus |
| `--intent-primary-hover` | `#1d4ed8` | Accent hover |
| `--intent-primary-solid` | `#2563eb` | Primary button fill. Same hex as `--intent-primary` in light |
| `--intent-primary-solid-hover` | `#1d4ed8` | Primary button hover |
| `--intent-primary-subtle` | `#eff6ff` | Selected filters |
| `--intent-success` | `#0369a1` | Success text. Restrained blue, not neon green. Holds 4.5:1 on white and on the success wash |
| `--intent-success-subtle` | `#f0f9ff` | Success wash |
| `--intent-success-border` | `#bae6fd` | Success badge border |
| `--intent-warning` | `#b45309` | Warning |
| `--intent-warning-subtle` | `#fffbeb` | Warning wash |
| `--intent-danger` | `#b91c1c` | Danger |
| `--intent-danger-subtle` | `#fef2f2` | Danger wash |
| `--intent-neutral` | `#475569` | Neutral |
| `--intent-neutral-subtle` | `#f8fafc` | Neutral wash |

Products **May** skin the primary tokens (for example Fluent `#0f6cbd`) if every usage still goes through the semantic name and the contrast rules in Section 18 still hold. Primary **buttons** use `--intent-primary-solid` with `--text-on-accent`. Text, icons, the selection accent, and the focus ring use `--intent-primary`. In light mode the solid and the accent are the same hex.

### Dark

| Token | Value |
|---|---:|
| `--surface-canvas` | `#0f172a` |
| `--surface-base` | `#1e293b` |
| `--surface-raised` | `#1e293b` |
| `--surface-muted` | `#0f172a` |
| `--surface-hover` | `#334155` |
| `--surface-selected` | `rgba(96, 165, 250, 0.12)` |
| `--surface-subtle` | `#1e293b` |
| `--text-primary` | `#f8fafc` |
| `--text-secondary` | `#cbd5e1` |
| `--text-muted` | `#94a3b8` |
| `--text-disabled` | `#64748b` |
| `--text-on-accent` | `#ffffff` |
| `--border-subtle` | `#334155` |
| `--border-default` | `#475569` |
| `--border-strong` | `#7d8da1` |
| `--border-focus` | `#60a5fa` |
| `--intent-primary` | `#60a5fa` |
| `--intent-primary-hover` | `#93c5fd` |
| `--intent-primary-solid` | `#2563eb` |
| `--intent-primary-solid-hover` | `#1d4ed8` |
| `--intent-primary-subtle` | `rgba(96, 165, 250, 0.12)` |
| `--intent-success` | `#38bdf8` |
| `--intent-success-subtle` | `rgba(56, 189, 248, 0.10)` |
| `--intent-success-border` | `rgba(56, 189, 248, 0.35)` |
| `--intent-warning` | `#fbbf24` |
| `--intent-warning-subtle` | `rgba(251, 191, 36, 0.10)` |
| `--intent-danger` | `#f87171` |
| `--intent-danger-subtle` | `rgba(248, 113, 113, 0.10)` |
| `--intent-neutral` | `#94a3b8` |
| `--intent-neutral-subtle` | `rgba(148, 163, 184, 0.15)` |

Dark mode = token swap via `data-theme="dark"`. Geometry **Must not** change.

In dark mode `--intent-primary` (`#60a5fa`) is the text and focus accent. White text on that blue is 2.54:1, and `#2563eb` as text on `#1e293b` is 2.83:1, so one token cannot do both jobs. Button fills use `--intent-primary-solid` (`#2563eb`) with `--text-on-accent`; that pair is 5.17:1. Hover fills use `--intent-primary-solid-hover`. Status washes are **10%** of their own solid token. The primary selection wash is **12%** of `#60a5fa`, which keeps accent text at 4.67:1 on `#1e293b`. A wash **Must** be mixed from its own token. `--border-subtle` **Must** differ from `--surface-base` and from `--surface-canvas`.

### Spacing, radii, controls

| Token | Value |
|---|---|
| `--space-1` … `--space-6` | 4 / 8 / 12 / 16 / 20 / 24 px |
| `--radius-xs` | 2px |
| `--radius-sm` | 4px |
| `--radius-md` | 6px |
| `--radius-capsule` | 9999px — status chips only |
| `--control-height-sm` | 26px |
| `--control-height-md` | 32px |
| `--control-height-lg` | 38px |
| `--row-height-header` | 32px |
| `--row-height-stream-compact` | **44px** |
| `--row-height-stream-relaxed` | **56px** |

Do not invent intermediate sizes for convenience. The coarse-pointer 44px slots in Section 18 are already specified.

---

## 7. Typography

- Family: **`Inter`**, then `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, sans-serif
- Weights: **400, 500, 600, 700** (`display=swap`)
- Apply to document and form controls; email addresses shown in the UI use Inter (not monospace). HTML mail templates are outside this guide
- Tabular numerals for counts, IDs, metrics, viewport readouts
- Default body **12px**, line-height **1.4**, antialiased, integer sizes only
- Stream, nav, and table rows use an integer **16px** line-height. The 1.4 body line-height is for prose, not for those rows
- **Must not** render UI text below **10px**, including tooltips, tables, badges, form controls and inherited component styles
- **Must not** use automatic text shrinking, CSS zoom or scaling to make content fit; wrap, truncate with an accessible full value, or scroll
- Verify computed font sizes at normal browser zoom; do not disable user zoom or text enlargement

| Role | Size |
|---|---|
| Micro / badge | 10–12px |
| Body / table cell | **12px** |
| Row title / control | 13–14px |
| Section | 14px |
| Page / dossier title | 16px |
| Modal title | 16–18px |

Uppercase micro-labels: `letter-spacing: 0.04em`. Weight 600 selected/section; 700 critical headings/badges.

Legacy `--font-mono` **Must** resolve to the same Inter stack for ordinary UI, or be removed — do not reintroduce a second UI typeface for emails/IDs. True monospace **May** appear only in explicit code/payload viewers.

---

## 8. CSS construction

1. Font load → light `:root` tokens → dark overrides → reset → shell → primitives → composites → states → reduced-motion → product layout
2. Prefer classes + state attributes (`aria-selected`, `data-theme`). Avoid IDs for styling, `!important`, and deep descendant chains.
3. One shared primitive per control type; screens compose, they do not fork padding/color.

---

## 9. Global top bar

- Height **48px**, base surface, 1px bottom border, 16px horizontal padding
- **Left:** nav toggle, brand icon **18px**, name **13px/700** (`-0.2px` tracking), version badge **10px/600** tabular
- **Center:** optional search ≤380px, height 32px, strong border, 4px radius; `/` focuses search
- **Right:** theme (**15px** Sun/Moon), account/status; static metric badges OK

**Must:** Menu toggle visible whenever compact overlay modes apply.

---

## 10. Panel 1 — navigation

| Spec | Value |
|---|---|
| Surface | `--surface-muted` |
| Expanded width | 220px default; drag **180–320px** in wide mode only |
| Collapsed | **56px** exact. Not the bottom of the drag range |
| Row height | **34px** |
| Left accent | Always reserve **3px**; selected → primary |
| Section labels | 10px uppercase, 700, muted |
| Icons | Lucide **`size={15}`** (explicit prop) |
| Counts | Tabular badge, right |
| Transition | 150ms `cubic-bezier(0.4, 0, 0.2, 1)` |

Collapsed: hide labels/counts/footer; center icons; tooltips required. Destination click **Must** close overlay when `navUsesOverlay`.

---

## 11. Panel 2 — master list

Continuous divided stream — **not** a card grid.

### Header stack (fixed above scroll)

1. **36px** context header — title left; count and Export in the trailing slot. Export sits immediately before Refresh when Refresh is present, and is the only trailing action when Refresh is omitted
2. **38px** muted search row
3. **28px** filter chip bar
4. Optional **32px** column header (uppercase 11px)

These are the fine-pointer heights. On a coarse pointer, rows that contain actions grow under Section 18.

### Stream rows (canonical)

| Spec | Value |
|---|---|
| Density | **Two lines** only (title + meta) |
| Compact height | **44px** (`--row-height-stream-compact`) |
| Relaxed height | **56px** (`--row-height-stream-relaxed`) |
| Selection | Pre-reserved 3px left border; selected wash; **no** size shift |
| Separators | 1px `--border-default` |

**Line 1:** primary title (12–13px, weight 500–600), single-line ellipsis; optional timestamp right (10–11px muted tabular).
**Line 2:** muted meta / ID / badge row (10–12px, 16px line-height). Compact badges are at most **16px** tall. Relaxed 56px rows may use a 20px badge. A 13px title on a 16px line, a 16px badge, and a 1px separator occupy 33px of the 44px row.

**Must not:** require 68px three-line rows as the default stream pattern.

### Actions hygiene

- List-scoped Export **Must** occupy the trailing slot of the Panel 2 header, immediately before Refresh when Refresh is shown.
- **Must not** add novelty footers (“Executive Actions”, contract telemetry blurbs, etc.).
- Selected-object copy/export **Should** live in its detail pane title bar, leaving selection rows clean.
- Repeat row actions only when a documented workflow requires acting without selecting; do not rely on hover for discovery.
- Refresh **Should** appear only where updated data can usefully be requested; omit it for immutable snapshots. Expose loading/disabled state without shifting geometry.
- Action placement does not define export semantics; Section 14 does.

### Search / filters

- Panel search control is **26px** (`--control-height-sm`); icon 14px. The global-bar search stays **32px**. These are the two specified search heights
- The panel search is immediate. The field value **is** the applied query. A short request debounce is allowed, and outdated responses are ignored. The search field is not a draft
- Chips 20px high, 10px/600; active → primary-subtle. On a coarse pointer the hit box grows under Section 18; the 20px visual size stays
- Filtering that removes selection clears Panel 3 or selects the first remaining row according to one documented product rule; never leave stale details.
- Dropdown filters **Must** apply immediately and refresh the list, with outdated responses ignored. A dropdown change **Must not** modify the search query
- Advanced filters **Must** distinguish draft fields from applied values. Apply validates and commits the draft, refreshes results and closes the popover on success. The advanced-filter popover is the only draft
- Empty optional fields mean no restriction. Empty Apply must not create a match-nothing query. A product requiring a filter must explain that requirement inline.
- Invalid input keeps the draft open with a field-level error; do not present it as an empty result.
- Provide a discoverable Reset filters action that clears the search query, dropdowns, and advanced filters, then refreshes the list. Indicate active advanced filters when collapsed.
- Cancel, Escape and outside click discard unapplied advanced-filter edits. They do not clear the already-applied search query
- Distinguish initial/loading, request failure and a successful query with zero matches. Preserve the user's query when reporting errors.

### Splitters

- The left splitter exists only in wide mode while Panel 1 is expanded. It writes `savedPanel1` inside **180–320px** and does not collapse the rail
- The right splitter writes `savedPanel2` inside **360–600px**. Section 4 then clamps the displayed width. There is no sub-360 exception
- Keyboard-accessible separator roles in production

---

## 12. Panel 3 — detail

| Spec | Value |
|---|---|
| Min width | 480px |
| Surface | `--surface-canvas` |
| Toolbar | **40px** on a fine pointer; **44px** when it holds an icon button on a coarse pointer (Section 18). One primary action max |
| Tabs | **34px**; underline active; no filled tab chrome |
| Body | One vertical scroll owner per visible pane; 16px gaps between flat sections |

Sections: base surface, 1px border, 6px radius, 16px padding — **no** nested card stacks. Key-value: compact two-column grid collapsing to one when needed; do not waste space with oversized row padding while crowding subsequent controls.

### Object-centred drill-down

Keep the selected object as the organising principle. Content, measurements,
metadata and related records **Must** remain connected by one consistent selection
and detail pattern. Tabs **Should** represent distinct work areas, not scatter
aspects of the same object into unrelated navigation structures.

- Related-object selectors **Should** reuse Panel 2's divided, two-line 44/56px stream rows, selection wash and keyboard behavior.
- Where useful, selecting a row opens a **resizable bottom detail pane** with a title and selected-object actions. A bottom pane is a pattern, not a mandatory fourth panel in every screen.
- Deeper drill-down **Must** provide an explicit return action restoring the previous selection, expanded state and position.
- Avoid redundant headings such as “Content” and repeated “Details” / “View payload” gates. One selection should reveal the relevant content and its metadata together when permitted.
- Separate section headings visually with spacing; use full-width **44px minimum** expandable headers with separators. The whole header is actionable, with `aria-expanded` and keyboard activation.
- Keep IDs accessible via adjacent copy actions and metadata. Prefer useful human-readable row titles; exact naming and fallback numbering are product decisions.

### Scroll ownership and resizing

- Each independent list, conversation or inspector pane **Must** have an explicit scroll owner; headers and toolbars stay outside that scrolling body.
- A payload/code block **Should** grow vertically inside its pane rather than introduce another fixed-height vertical scroller. Horizontal overflow for wide code/tables is allowed.
- The final content and controls **Must** be reachable with wheel, native scrollbar, touch and keyboard. Ctrl+End alone is not acceptance evidence.
- Flex/grid ancestors **Must** permit shrinkage (`min-height: 0`, `min-width: 0` where applicable). Do not hide inaccessible content behind root `overflow: hidden`.
- Split panes **Must** retain usable upper and lower regions at supported sizes, support keyboard and touch resizing, and fit preferred sizes to available space. With a bottom pane open at the 600px floor, each region keeps at least **120px** of content height. The seam handle overlays; it is not a third content band.
- Scroll restoration and native scroll anchoring **Must not** compete. Disable anchoring only in explicitly restored panes where needed, and test repeated restore/resize cycles for drift.
- After reflow, restore the same logical item/reading position; clamp impossible offsets. At the original size, restore the prior geometry and offsets when content is unchanged.

---

## 13. Icons

| Context | Size |
|---|---|
| Panel 1 nav | **15px** |
| Global Menu / brand | **18px** |
| Theme toggle | **15px** |
| Dense header actions | **13–14px** |
| Stroke | **2** |

Familiar utilities (copy, spreadsheet export, refresh) **Should** use icon buttons,
not repeated “Copy X” / “Export X XLSX” text. Every icon-only action **Must** have a
scope-specific accessible name and tooltip. Distinguish copying an identifier from
copying an object's content through placement and grouping, not two unexplained
adjacent identical glyphs. Place an ID copy icon on the same line as the ID or its
human-readable substitute. Align contextual help with the value and its copy action.
Third-party logos **Must** use the same button surface, dimensions and focus states
as neighbouring actions. Unfamiliar business actions retain meaningful text labels.

Library: `lucide-react` direct. Brownfield MUI wrappers **Must** map onto the sizes in the table above: **15** for navigation, **18** for the menu and brand, **14** for dense header actions. **Must not** keep 16, 20, 24, or 35.

---

## 14. Shared primitives

**Buttons:** 32px standard / 26px compact; 4px radius; primary solid / secondary outlined / ghost; never pill-shaped actions. The primary fill is `--intent-primary-solid`, the label is `--text-on-accent`, and the hover fill is `--intent-primary-solid-hover`.
**Icon buttons:** 28×28 visual size, 4px radius. On a fine pointer the hit target matches the visual size. On a coarse pointer the layout slot is at least 44×44 and does not overlap its neighbours. Visual size and interactive target size are distinct.
**Badges:** static labels, 16px in a compact stream row and up to 20px elsewhere, 2px radius, uppercase 10px/700 — not fake buttons.
**Links:** real `mailto:` where applicable; primary underline.
**Modal:** overlay `rgba(15,23,42,0.4)` z-999; dialog ~480px; focus trap + Escape + restore focus.
**Empty / error / loading:** explicit; no empty flash that looks like “no data.”

One implementation each — screens compose. Do not fork button height, background,
spacing or feedback per screen. Coarse-pointer target growth uses the layout slots
in Section 18. Invisible overlapping hitboxes are forbidden.

### Copy, export and feedback

One **presentation model** supplies the column identity, the row set, the sort, and each value. Copy and export both read that model. CSS ellipsis is not part of a value. A hidden technical field is not a member of the model and **Must not** replace a column.

**Row set.** The displayed table is every row in the current filtered result, in the current sort. It is not the scrolled window, not the mounted virtualization window, and not rows the filter excluded. A selected-object export is a different action. Its accessible name names the object. A list export’s accessible name names the filtered set, for example “Export filtered requests”.

| Action | Contract |
|---|---|
| Copy displayed table | The presentation columns, in order, as display strings. Numbers may be formatted the way the cell reads |
| Export displayed table | The same columns, rows, and order. Numbers stay numbers, identifiers stay strings, blanks stay blank, and a recorded zero stays zero |
| Copy raw data | A separate action whose name says “raw”. It is never the unlabeled result of Copy or Export |
| Copy identifier | Adjacent icon with a specific accessible name. The clipboard receives the exact identifier |
| Export selected object | Named for that object. Extra sheets are named in the control or the product doc, and are not presented as the on-screen table |
| Filename | A sanitized name from the current object or view, plus the export kind. Never a hard-coded example |

A workbook cell whose display string starts with `=`, `+`, `-`, or `@` is written as text so the spreadsheet does not execute it. The clipboard copy of that cell is the plain display string, without the workbook’s text-guard character. Reuse the established, reviewed export and clipboard primitives; do not add plugins merely to implement a button.

Copy/export success or cancellation **Must** use a shared, transient accessible
toast instead of persistent inline “Copied”, “Download requested” or “Cancelled”
labels. Show errors with actionable information. Announce feedback without stealing
focus. Do not claim a file was saved when only a browser download was requested.
Cancellation must not trigger a fallback download. Authentication expiry cancels
pending exports; do not replay them automatically after sign-in.

---

## 15. Auth / sign-in

| Rule | Spec |
|---|---|
| Field | Username (or email/username) — `type="text"`, `autocomplete="username"` |
| Domain force | **Must not** use `type="email"` when bare usernames are valid |
| Backend | Accept bare username and full email/UPN |
| States | checking, anonymous, invalid, unauthorized, directory down, lockout, expired |
| Initial entry | Product sign-in in a centered card or dialog on the canvas. The surface behind it shows no counts, names, or cached rows |
| Expired session | In-place sign-in dialog in the application; no forced trip through another product or return to a default list |

---

### Reauthentication and continuity

- The identity key is the directory subject id the session already treats as stable and unique, compared as an exact opaque string. Username, email, UPN, and display name are not that key. A product with no subject id **Must** document the single stable key it uses, and that key **Must not** be the display name.
- Same-account sign-in **Must** restore selected item, nested detail, filters, expanded sections, scroll bookmarks and preferred pane sizes after fresh authorized reads.
- Expiry **Must** hide protected content, abort outstanding requests and disregard stale responses while retaining only the navigation state required for recovery.
- Authentication-only recovery **Must not** create business objects, start workflows or re-execute prior mutations. Shared identity/session bookkeeping may still occur.
- A different identity key **Must** clear the previous user's workspace, caches, and recovery bookmarks, then load that user's own state. Do not restore the previous place.
- Cancel leaves the shell mounted and the data unmounted. Lists, counts, previews, detail, and cached records stay hidden. The remaining actions are reopen sign-in and, where the product offers it, sign out. A valid account that lacks permission sees access denied, not another password attempt.
- Use one modal, shared authentication ownership, focus trapping/restoration and password-manager autocomplete. Clear password state on dismissal/unmount.
- Keep transient recovery bookmarks in memory by default. Do not persist credentials or sensitive payloads in browser storage. Cross-reload persistence is a separate product decision, not implied by same-tab recovery.
- If an item has expired, been removed or become unauthorized, explain that state and provide a safe parent view; do not silently pretend the exact view was restored.
- Resizing during sign-in, including below the hard floor and back, **Must not** reset navigation. Section 3's gate still applies.

## 16. Activity strip (optional)

In flow under the global bar, **32px** tall (`--activity-strip-height`). Primary-subtle background; 11px text; named stages + indeterminate spinner — never fake percent. It is part of `--shell-offset`. The fixed rail, backdrop, and drawers start below it. **Must not** overlay Panel 2/3 content. The 600px gate does not grow to make room for the strip; the workspace gets the remaining height.

---

## 17. State, motion, layering

### Component states

Default, hover, focus-visible, active, selected, disabled, loading, empty, error, partial/stale — all without layout shift. Hover alone **Must not** be the only way to discover an action.

### Information density

Show information that supports a decision or navigation. Routine success labels,
“attempt 1” and singular record counts **Should** be omitted when they add no
information; surface retries, failures, partial evidence and unusual states clearly.
Do not suppress a success state where it is necessary to understand completion.
Missing measurements **May** be blank, never fabricated zero. Necessary caveats
belong near the affected result or in contextual help; avoid repeated explanatory
paragraphs above everyday operational views. Do not remove material warnings just
to make a screen quieter.

### Motion

| Item | Spec |
|---|---|
| Color / border | ~120ms |
| Panel width | 150ms `cubic-bezier(0.4, 0, 0.2, 1)` |
| Overlay open | ≤180ms |
| Reduced motion | Under `prefers-reduced-motion: reduce`, color, width, and overlay transitions are **0ms** |

**Must not** animate border thickness, selection geometry, or text width for decoration.

Keyboard: `/` focuses search; Escape closes the overlay or modal; arrows move the master-row selection. With the overlay closed, Tab runs Panel 1 → Panel 2 → Panel 3. With the overlay open, Tab stays in the drawer and the menu toggle (Section 5).

### Z-index

Menus, popovers, and toasts are portaled to the shell root. A `z-index` on the global bar creates a stacking context, and a menu left inside that context paints under the rail at 850.

| Layer | Z |
|---|---:|
| Panels | 0 |
| Splitters | 5 |
| Global bar | 10–20 |
| Compact nav rail | 850 |
| Transparent nav backdrop | **890** |
| Open nav flyout | **900** |
| Menus, popovers, tooltips | **960** |
| Toasts | **970** |
| Modal overlay | 999 |
| Modal dialog | ≥1000 |

Shadows only on flyout edge and modals — never decorative panel chrome.

---

## 18. Accessibility

Landmarks; visible focus; keyboard nav and selection; `aria-selected` / `aria-expanded`; dialog focus trap; accessible splitters; live regions for counts and errors. Touch targets do not rely on hover.

**Targets.** Full-width disclosure headers are at least **44px** tall at every pointer type. On `(pointer: fine)`, other controls use the visual sizes in this guide: nav rows 34px, icon buttons 28×28, and the Panel 2 header stack as specified. On `(pointer: coarse)`:

- Nav rows, the Panel 2 context header, the panel search row, the filter-chip bar, and any toolbar that holds an icon button are at least **44px** tall
- Each icon-button layout slot is at least **44×44**. The glyph stays 28×28. Slots do not overlap
- Filter chips stay 20px visually. Each chip’s hit box is at least 44×44 inside the 44px bar, with a gap so the hit boxes do not overlap
- Stream rows are already at least 44px

The global bar is 48px, so its targets have vertical room. Their horizontal slots are still at least 44px on a coarse pointer and do not overlap.

**Contrast.**

- Informational text, including 10px labels, is at least **4.5:1** against the surface it is drawn on, including canvas, hover, selected, and washes
- Disabled text is exempt and stays distinguishable from the background
- A border that identifies an input, a button, or a focus ring is at least **3:1** against the adjacent surface
- A decorative hairline is exempt from 3:1 and uses a different color from the surface it divides
- Success and the accent are both blue, so a status has a text label or a distinct icon as well as color

---

## 19. Greenfield and brownfield

### Greenfield order

0. Define the user journey, object hierarchy, action scope and recovery states before backend/UI implementation.
1. Tokens + Inter + reset + `data-theme`
2. Viewport gate 900×600
3. Shell + splitters
4. Compact overlay nav
5. Primitives
6. Auth (username)
7. Destination views
8. Parity tests
9. Browser matrix

### Brownfield waves

1. **A — correctness:** gate; overlay; transparent backdrop; collapse-on-nav; Escape
2. **B — affordance:** global Menu; Lucide 15/18; fix contradictory docs
3. **C — hygiene:** Export in the Panel 2 trailing slot (before Refresh when Refresh exists); remove novelty footers; icon sweep
4. **D — interaction continuity:** coherent drill-down; filter/reset; visible-data copy/export; auth/resize restoration; scroll and touch acceptance

Prefer additive classes (`nav-compact`, `drawer-open`). Do not port product-specific chrome (SAM KPI index, Telemetry metrics strip contents, etc.) as “design system.”

---

## 20. Verification

### Automated

- `MIN_SUPPORTED_VIEWPORT_WIDTH/HEIGHT = 900/600`
- No `width > height` landscape gate
- `width < 900` narrow; `width >= 900 && width < 1440` compact; `width >= 1440` wide. Exactly 900 is compact and exactly 1440 is wide
- `NAV_DRAWER_MAX_WIDTH` is that 900 bound, not the 220px drawer width
- At 900px compact, displayed Panel 2 is inside **360–364** and `56 + displayedPanel2 + 480 <= 900`. A saved width of 600 displays as **364**
- Shell width is `100%`, not `100vw`
- Transparent backdrop CSS; no dim/blur on nav catcher
- Overlay close on destination / Escape, and Panel 2/3 are `inert` while it is open
- Frontend build + `git diff --check`

### Browser

| Viewport | Expect |
|---|---|
| 1440×900 | In-flow nav |
| 900×600 | Compact rail; Panel 2 at least 360px; Panel 3 at least 480px; no page-level horizontal scroll |
| 1280×800 | 56px rail; overlay expand; undimmed P2; collapse on choice; Tab stays in the drawer |
| 1275×1301 | Loads |
| 899×700 | Hard gate only |
| 1024×768 | Supported backstop UAT (not the floor) |

Light + dark; focus rings not clipped. Include `900×600`, `1024×599` and
`320×900`, not only the examples in the table. Test desktop and touch-enabled tablet
viewports; distinguish browser emulation from physical-tablet verification.

### Interaction acceptance (required for affected flows)

1. Select → drill down → inspect related content → return: selection, context and scroll are preserved.
2. Copy/export: clipboard display strings and workbook types come from the same filtered row set. A string that starts with `=` is text in the workbook and a plain string on the clipboard. Verify filenames, scope in the accessible name, cancellation, and that hidden fields are absent.
3. Filter: the search field applies as typed; a dropdown does not change that query; empty Apply is safe; invalid input explains itself; reset clears search and filters; stale responses cannot replace newer results.
4. Expire a session at a nested detail: protected content hides; same-account sign-in restores place; a different account clears it; no mutations/exports are replayed.
5. Resize while the login dialog is open: supported → below width floor → back; below height floor → back; both below → back. The dialog returns with an empty password, the same selected object, and the same preferred pane sizes.
6. Repeat resize/reauthentication cycles to detect accumulated scroll drift. Save Panel 2 at 600px, shrink to 900px, and assert the displayed width is 364 and the saved width is still 600. Grow the window and assert 600 returns.
7. Reach the last record/control using wheel, scrollbar and touch, independently of Ctrl+End, in each scroll region.
8. Check computed typography, aligned actions, 44px disclosure targets, toast dismissal, keyboard focus and non-overlapping tablet targets.

Use synthetic fixtures for automated acceptance; do not require private production
payloads or credentials. Record exactly which journeys, themes, devices and sizes
were tested. Source-string assertions and a successful build do not establish
rendered interaction acceptance. Existing products must document V2 gaps rather
than claim adoption from a documentation update alone.

---

## 21. Prohibited deviations

- Dual UI guides with conflicting floors or backdrop rules
- 1024×768 as the **hard** minimum (it is UAT only)
- Dimmed/blurred nav backdrops
- 68px mandatory three-line stream rows
- 57% / aspect-ratio auto-collapse engines
- Competing primary buttons in one toolbar
- Selection that changes row size
- Nested card stacks in Panel 3
- Stale Panel 3 after filter/delete
- Reauthentication that silently returns to the list or discards the user's place
- Copy/export output with hidden raw fields substituted for the displayed table
- Permanent inline utility feedback, ambiguous icon clusters or overlapping touch targets
- Clipped pane bottoms reachable only by keyboard tricks
- Automatic text shrinking, fractional font sizes or UI text below 10px
- Panel 2 narrower than 360px, or adding the 5px splitter hit area to the shell sum
- A shell width of `100vw`
- Panel 2 or Panel 3 remaining focusable while the compact drawer is open
- A 16px shell icon, or a dark-mode primary button filled with the text-accent token

---

## 22. Definition of done

1. Hard gate **900×600**, no landscape-only block
2. Compact **&lt;1440** overlay with **transparent** backdrop; collapses on choice
3. Global nav toggle in compact mode
4. Lucide **15 / 18 / 14** on the shell, from the icon table
5. Username sign-in
6. Panel 2 Export in the trailing slot, immediately before Refresh when Refresh is shown; no novelty footers
7. **Two-line** stream rows at 44/56
8. Tokens + Inter + density match this guide
9. Parity tests + browser matrix pass
10. Coherent drill-down and explicit action scope; shared presentation model for table copy/export
11. Complete filter/reset behavior, transient feedback and accessible utility icons
12. Auth recovery and resize round-trips preserve place; different-user recovery clears it
13. Pane bottoms reachable by wheel, scrollbar and touch; no restoration drift
14. Product-specific contracts and any remaining V2 adoption gaps documented

### Agent prompt

```text
Align UI to docs/frontend-ui-design-guide-v2.md (current single source of truth).

Must: viewport 900×600 (no landscape-only); compact is width < 1440 and wide is
width >= 1440; overlay with a transparent backdrop, inert panels behind it, and
collapse-on-destination; Lucide 15/18/14; username login; Panel 2 Export in the
trailing slot (before Refresh when Refresh exists); two-line 44/56 stream rows;
Inter + semantic tokens; Outlook shell. Splitter hit areas overlay the seam.
At 900px, Panel 2 stays inside 360–364 and Panel 3 stays at least 480. Do not
use 100vw. Primary buttons use --intent-primary-solid.

Greenfield: define the journey, then build the shell. Brownfield: waves A→B→C→D. No product-chrome cargo-cult.
Preserve place through auth/resize; use scoped utility icons, transient toasts,
one presentation model for copy/export, immediate search, and 44px coarse-pointer
slots that do not overlap. Verify affected journeys, both themes and viewport
boundaries, including 900×600 and below-floor round-trips. Record adoption gaps;
do not claim runtime acceptance from builds or doc updates. Keep product entities
and business rules in product docs.
```

---

*V2 canonical contract: existing shared shell plus owner-approved interaction and recovery requirements, 18 October 2026. V1 remains historical. No deployment or runtime conformity is implied by publication.*
