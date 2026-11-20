# Enterprise Three-Panel UI/UX Agent Playbook

**Audience:** coding agents and engineers adopting this UI system in **greenfield** or **brownfield** products.  
**Status:** Canonical shell + visual contract shared by Telemetry, SAM (`sam-new`), and HAM (2026 parity).  
**Companion:** Visual token and geometry detail remains in [`frontend-ui-design-guide.md`](./frontend-ui-design-guide.md). This playbook is the **behavioral + adoption** contract agents must follow first.

---

## 0. How to use this document

| Clause | Meaning |
|---|---|
| **Must** | Required for compatibility. Fail review if violated. |
| **Should** | Default; deviate only with a documented product reason. |
| **May** | Optional. |
| **Must not** | Forbidden patterns (even if “prettier”). |

**Before writing UI code**, complete §1 Product mapping.  
**Greenfield:** implement §2–§12 in order.  
**Brownfield:** run §13 gap audit, then apply waves in §14.  
**Done means:** §15 verification matrix passes (not “looks fine in one screenshot”).

Reference implementations (read for patterns, do not copy product chrome):

| Repo | Shell entrypoints |
|---|---|
| Telemetry | `dashboard/src/App.jsx`, `SupportedViewportGate.jsx`, `dashboard/src/index.css` |
| SAM | `sam-new/frontend/src/App.jsx`, `Sidebar.jsx`, `Header.jsx`, `ScreenResolutionNotice.jsx` |
| HAM | `src/App.jsx`, `SupportedViewportGate.jsx`, `src/index.css` |

---

## 1. Product mapping (fill before coding)

Map product concepts into the fixed roles. Do **not** invent a fourth competing shell.

| Design role | Product supplies | Notes |
|---|---|---|
| Global bar (48px) | Brand name, version, optional search, theme, account/sign-out | Metrics/status OK; avoid burying nav toggle |
| Panel 1 | Top-level destinations + counts | Destinations only — not item detail |
| Panel 2 | Searchable/filterable list for active destination | One selected item drives Panel 3 |
| Panel 3 | Selected-item detail + primary actions | Tabs/toolbars live here |
| Auth gate | Corporate directory sign-in | Outside the three-panel workspace |
| Viewport gate | Hard unsupported notice | Outside workspace; no dismissible bypass |

If the product has **no meaningful selectable list**, do not force three panels. Use a single workspace under the global bar, still using the same tokens, density, and controls.

---

## 2. Design intent (non-negotiable)

This is an **Outlook-inspired enterprise desktop** UI:

- Compact, flat, information-dense
- Hairline borders and selection washes — not card sprawl
- One restrained blue accent; status color is rare and desaturated
- Integer px typography only
- Geometry stable across hover / focus / selected / disabled / loading

**Must not** ship:

- Purple-on-white / indigo gradient “AI” themes
- Warm cream + terracotta “editorial” landing looks
- Glassmorphism, multi-layer glow shadows, emoji decoration
- Mobile-first stacked cards replacing the three-panel shell
- Full-bleed marketing heroes inside the app shell
- Rounded-full pill clusters for ordinary actions
- Default Inter-on-white with no token discipline (Inter is required, but via tokens)

---

## 3. Viewport gate (hard)

### Contract

| Rule | Value |
|---|---|
| Min width | **900px** |
| Min height | **600px** |
| Landscape-only? | **No** — do **not** require `width > height` |
| Tall windows | Allowed (e.g. 1275×1301) when both floors are met |
| Unsupported behavior | **Hard gate** — workspace must not mount; no “continue anyway” |

### Copy pattern

- Title: `{Product} requires a larger screen`
- Show current `width × height`
- State minimum `{900} × {600}`
- Direct user to maximize or move to a larger display

### Must not

- Block solely because orientation is portrait
- Use blur-heavy full-screen overlays as a soft warning with dismiss
- Mount authenticated fleet/admin chrome behind the notice

### Tests agents must add

- Allow: `900×600`, `1024×768`, `1275×1301`
- Block: `899×700`, `1024×599`, `320×900`

---

## 4. Application frame

```
┌──────────────────────────── global bar 48px ────────────────────────────┐
├─ Panel 1 ─┬─ 5px ─┬─ Panel 2 ──────────┬─ 5px ─┬─ Panel 3 ─────────────┤
│ 220 / 56  │ split │ list / filters     │ split │ detail / actions      │
└───────────┴───────┴────────────────────┴───────┴───────────────────────┘
```

### Must

- Root: `100vw × 100vh`, `overflow: hidden`, no page scroll
- Vertical flex: global bar → workspace
- Horizontal flex workspace: P1 → splitter → P2 → splitter → P3
- Each panel owns its own scroll region (`min-height: 0` on flex children)
- Truncating text: `min-width: 0` + ellipsis

### Geometry constants

| Token / rule | Value |
|---|---|
| `--topbar-height` / header | **48px** |
| Panel 1 expanded | **220px** default |
| Panel 1 collapsed | **56px** exact |
| Panel 1 resize max | **320px** |
| Panel 2 min / max | **360px / 600px** (product may clamp stream with `clamp(360px, 25vw, 480px)`) |
| Panel 3 min | **480px** (or product-documented ≥500px floor) |
| Splitter | **5px** hit target |

---

## 5. Compact overlay navigation (shell parity)

This is the **canonical responsive nav** (Telemetry / SAM / HAM aligned). Prefer it over any older “57% detail share” or aspect-ratio collapse engines.

### Breakpoints

| Viewport width | Mode |
|---|---|
| `< 900` | Viewport gate blocks (workspace unmounted) |
| `900–1439` | **Compact:** 56px in-flow spacer + fixed rail; expand = **overlay** |
| `≥ 1440` | **Wide:** in-flow Panel 1; manual collapse/resize OK |

Constants:

```text
NAV_DRAWER_MAX_WIDTH = 900
NAV_AUTO_COLLAPSE_MAX_WIDTH = 1440
```

### Compact expand behavior (**Must**)

1. Keep a **56px spacer** in the flex flow so Panel 2 does not jump.
2. Panel 1 is `position: fixed` under the top bar.
3. Collapsed: width **56px**. Expanded: width **220px**, higher z-index, light edge shadow only.
4. Expanding **slides over Panel 2** — does **not** push Panel 2/3.
5. Backdrop is a **transparent click-catcher** — **no grey dim, no blur**.
6. **Escape** closes overlay.
7. **Choosing a Panel 1 destination** closes overlay (back to 56px rail).
8. Global bar **Must** expose a Menu / close toggle when overlay modes apply (`aria-expanded` correct).

### CSS sketch (adapt class names)

```css
.nav-compact-spacer { width: 56px; min-width: 56px; flex-shrink: 0; }

.panel-1.nav-compact {
  position: fixed;
  top: var(--topbar-height);
  left: 0; bottom: 0;
  height: calc(100vh - var(--topbar-height));
  z-index: 850;
}

.panel-1.nav-compact.p1-collapsed { width: 56px; }
.panel-1.nav-compact.drawer-open {
  width: 220px;
  z-index: 900;
  box-shadow: 6px 0 28px rgba(0, 0, 0, 0.22);
}

.p1-drawer-backdrop {
  position: fixed;
  top: var(--topbar-height);
  left: 0; right: 0; bottom: 0;
  background: transparent; /* never rgba dim / backdrop-filter */
  z-index: 890;
}
```

### Must not

- Grey/blur dimming of Panel 2/3 when nav opens
- Push layout on compact expand
- Leave overlay open after destination click
- Reintroduce aspect-ratio / 57%-detail auto-collapse as the primary rule without product re-approval

---

## 6. Global bar UX

| Element | Spec |
|---|---|
| Height | 48px, base surface, 1px bottom border |
| Left | Nav toggle (compact/wide), brand icon **18px**, product name **13px/700**, version badge **10–12px** |
| Center | Optional search ≤380px, control height 32px, `/` focuses search |
| Right | Theme (Sun/Moon **15px**), account/status; metrics badges OK if non-interactive |

**Must:** nav toggle visible in compact mode (do not bury expand only inside a collapsed rail).

---

## 7. Panel 1 — navigation rail

| State | Spec |
|---|---|
| Surface | `--surface-muted` |
| Row height | **34px** |
| Left accent | Always reserve **3px** border; selected → primary |
| Section labels | ~10–12px uppercase, weight 700, muted, `letter-spacing: 0.04em` |
| Icons | **Lucide**, explicit **`size={15}`** |
| Counts | Tabular nums, right-aligned badge |
| Collapsed | Hide labels/counts/footer; center icons; tooltips required |

**Must:** destination click updates route/view **and** closes overlay when `navUsesOverlay`.

---

## 8. Panel 2 — master list

| Element | Spec |
|---|---|
| Header row | ~36px; title + **actions** |
| Primary actions | **Export beside Refresh** in the header action group |
| Search row | ~38px muted strip |
| Filter chips | Compact; selected uses primary-subtle |
| Rows | Compact 44px or relaxed 56px; 2-line title/meta; hairline dividers |
| Selection | Selected wash + primary cue; no layout shift |

### Panel 2 action hygiene (**Must**)

- Put list-scoped **Export** next to **Refresh** in the Panel 2 header.
- **Must not** invent nonstandard footers such as “Executive Actions”, telemetry contracts, or marketing blurbs under the list.
- Detail-scoped export (single item / query result) **May** remain in Panel 3.

---

## 9. Panel 3 — detail

| Element | Spec |
|---|---|
| Toolbar | Title left; status/actions right |
| Tab strip | Fixed; content scrolls |
| Empty | Clear empty state when no selection / no matches |
| Loading | Stable widths; no empty flash that looks like “no data” |

One dominant primary action per local context. Secondary actions are ghost/secondary buttons or icon buttons.

---

## 10. Icons

| Context | Size | Notes |
|---|---|---|
| Panel 1 nav | **15px** | Always pass `size={15}` (do not rely on CSS alone) |
| Global Menu / brand | **18px** | Header toggle and brand mark |
| Theme toggle | **15px** | |
| Dense toolbar icons | **13–14px** | Refresh, download in headers |
| Stroke | **2** | Lucide default |

**Library:** `lucide-react` (direct components).  
**Should not:** introduce MUI icon wrappers unless the brownfield app is already MUI-deep; if wrapping, default sizes must still resolve to 15/16/18, not MUI’s 20/24/35.

---

## 11. Typography & density

### Font

- Family: **`Inter`**, then system UI sans (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, sans-serif)
- Weights: **400, 500, 600, 700**
- Load with `display=swap` (Google fonts or self-host)
- Emails and UI copy use Inter — **not** monospace for ordinary text
- Tabular numerals for counts, IDs, metrics, viewport readouts

### Type scale (integer px)

| Role | Size |
|---|---|
| Micro / badge | 10–12px |
| Body / table cell | **12px** default body |
| Row title / control | 13–14px |
| Section | 14px |
| Page / dossier title | 16px |
| Modal title | 16–18px |

Line height ~**1.4**. Antialiased. No fractional font sizes.

### Controls

| Token | Value |
|---|---|
| `--control-height-sm` | 26px |
| `--control-height-md` | 32px |
| `--control-height-lg` | 38px |
| `--radius-xs` | 2px |
| `--radius-sm` | 4px |
| `--radius-md` | 6px |
| Spacing | 4px grid (`4/8/12/16/20/24`) |

Pills/`border-radius: 9999px` only for genuine status chips — not ordinary buttons.

---

## 12. Color tokens (semantic)

Agents **Must** use CSS variables — never scatter raw hex in feature components.

### Light (normative names)

Use the Telemetry guide set as the portable baseline (`--surface-*`, `--text-*`, `--border-*`, `--intent-*`). SAM/HAM may use Fluent-leaning primary blues (`#0f6cbd`) as a product skin **only if** they map through the same semantic names (`--intent-primary`, etc.).

Rules:

- **One** primary accent
- Success/warning/danger are **desaturated** and rare
- Dark mode = token swap via `data-theme="dark"` — **same geometry**

Full tables: [`frontend-ui-design-guide.md`](./frontend-ui-design-guide.md) § Exact design tokens.

### Shadows

- Default UI: **no** decorative shadows
- Allowed: compact nav flyout edge shadow; modal elevation only
- **Must not:** multi-layer glow, neon focus rings beyond `--border-focus`

---

## 13. Auth / sign-in UX

| Rule | Spec |
|---|---|
| Identity field | **Username** (or “email or username”) — `type="text"`, `autocomplete="username"` |
| Domain forcing | **Must not** use `type="email"` if bare directory usernames are valid |
| Backend | Accept bare username **and** full email/UPN |
| States | Distinct: checking, anonymous, invalid credentials, not authorized, directory unavailable, lockout/retry later, session expired |
| Placement | Centered auth card on canvas; **must not** flash protected data behind login |

---

## 14. Greenfield vs brownfield

### Greenfield checklist (build order)

1. Tokens + Inter + reset + `data-theme`
2. Viewport gate (900×600, no landscape-only)
3. App shell: global bar + three panels + splitters
4. Compact overlay nav (`1440` / transparent backdrop / collapse-on-choice)
5. Shared primitives: button, icon button, input, badge, tabs, modal, empty/error
6. Auth gate with username field
7. Destination views composing Panel 2/3 patterns
8. Source parity tests (gate + shell classes)
9. Build + browser matrix (§15)

### Brownfield checklist (do not boil the ocean)

1. **Inventory** current shell vs this playbook (gate, collapse, backdrop, icons, auth field, Panel 2 footers).
2. **Wave A — correctness:** viewport gate; compact overlay; clear backdrop; collapse-on-nav; Escape/outside.
3. **Wave B — affordance:** global Menu toggle; Lucide 15/18; update product docs that contradict this contract.
4. **Wave C — hygiene:** Panel 2 Export beside Refresh; remove nonstandard list footers; icon size sweep.
5. **Leave alone:** domain business views’ data model; unrelated design systems on marketing sites; MUI deep forms unless touching shell.
6. Prefer **additive** CSS classes (`nav-compact`, `drawer-open`) over rewriting every screen.

### Brownfield anti-goals

- Do not port product-specific chrome (SAM Executive KPI Index, HAM role switcher demos, Telemetry Vanna metrics) as if they were design-system requirements.
- Do not replace a working three-panel shell with a dashboard widget grid “to modernize.”
- Do not add a second icon library “just for the nav.”

---

## 15. Verification matrix (agents must run)

### Automated

- Source/contract tests asserting:
  - `MIN_SUPPORTED_VIEWPORT_WIDTH = 900` / `HEIGHT = 600`
  - **No** `width > height` / landscape-only gate
  - `NAV_AUTO_COLLAPSE_MAX_WIDTH = 1440`
  - `nav-compact` / `drawer-open` / transparent backdrop CSS
  - Collapse-on-destination / overlay close handlers exist
- Production frontend build
- `git diff --check`

### Browser UAT

| Viewport | Expect |
|---|---|
| 1440×900 | In-flow nav; manual collapse OK |
| 1280×800 | Auto-collapsed 56px; expand overlays P2; list `left` stays ~56; backdrop undimmed |
| 1275×1301 | App loads (not blocked) |
| 899×700 | Hard gate only |
| Compact + click destination | Overlay closes |
| Compact + Escape / outside click | Overlay closes |

### Visual / a11y spot checks

- Focus-visible not removed by overflow
- Collapsed nav has accessible names/tooltips
- `aria-expanded` on nav toggle
- No layout shift on select/hover
- Light and dark themes preserve geometry

---

## 16. Interaction & motion

| Item | Spec |
|---|---|
| Color transitions | ~120ms |
| Panel width | 150ms `cubic-bezier(0.4, 0, 0.2, 1)` |
| Overlay open | ≤180ms ease |
| Reduced motion | Honor `prefers-reduced-motion: reduce` |
| Must not animate | Border thickness, selection geometry, text width for “juice” |

Keyboard: `/` → search; `Escape` → close overlay/modal; tab order through P1 → P2 → P3.

---

## 17. Component primitives (one implementation each)

Buttons (primary / secondary / ghost), icon button, input, select, badge, filter chip, tab, list row, data table, modal, empty state, error+retry, resize handle, export control.

Screens compose primitives; they **Must not** fork private padding/font/color variants.

---

## 18. Documentation debt rule

If product docs mention:

- landscape-only support,
- blur/dim nav backdrops,
- 57% detail-share / aspect-ratio collapse engines,

…agents **Must** update those docs when implementing this playbook so future agents do not reintroduce obsolete contracts.

---

## 19. Quick “definition of done”

A product has adopted this UI/UX system when:

1. Hard viewport gate is 900×600 without landscape-only blocking.  
2. Compact `<1440` nav overlays Panel 2 with a clear backdrop and collapses on choice.  
3. Global bar exposes nav toggle in compact mode.  
4. Lucide icons use 15/18 (shell) consistently.  
5. Sign-in accepts bare usernames.  
6. Panel 2 list Export sits with Refresh; no novelty footers.  
7. Tokens + Inter + density match this playbook.  
8. Automated parity tests + browser matrix above pass.

---

## 20. Copy-paste agent prompt (optional)

Use when starting work in another repo:

```text
Implement / align this product’s UI to docs/ENTERPRISE_THREE_PANEL_UI_UX_AGENT_PLAYBOOK.md
(or the copy of that playbook in-repo).

Follow Must rules for: viewport gate (900×600, no landscape-only), compact overlay nav
(<1440, transparent backdrop, collapse on destination), Lucide sizes 15/18, username login,
Panel 2 Export beside Refresh, Inter + semantic tokens, Outlook three-panel density.

Greenfield: build shell first. Brownfield: Wave A→B→C. Do not port product-specific chrome.
Verify with parity tests + 1280/1440/1275×1301/899 browser checks. Update contradictory docs.
```

---

*Origin: Telemetry design system + 2026 SAM/HAM/Telemetry shell parity (viewport, overlay nav, icons, auth, Panel 2 hygiene).*
