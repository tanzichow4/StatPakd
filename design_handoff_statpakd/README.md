# Handoff: StatPakd — Sports Analytics Comparison App

## Overview
StatPakd is a web app for viewing and comparing sports stats. Users pick up to **8 players or teams**, choose stats, and view them as a **Table**, **2D chart** (bars or radar) or **interactive 3D scatter**. Teams also have a **Team breakdown** mode that compares players *within* one team (snap %, touches, TDs, share of production). Launch league is **NFL**, but the architecture must be league-agnostic (NBA/MLB/NHL shown as "Soon").

## About the Design Files
Files in `design/` are **design references built in HTML** — prototypes showing intended look and behavior, not production code. Recreate them in the target codebase's environment. If no codebase exists yet, recommended stack: **React + TypeScript + Vite**, Tailwind or CSS modules, **three.js / react-three-fiber** (or keep the lightweight SVG projection used here) for 3D, and a small chart lib (visx/Recharts) or hand-rolled SVG for bars/radar.

To view: open `design/StatPakd App.dc.html` in a browser (keep `support.js` beside it). All logic lives in the `<script data-dc-script>` block at the bottom of the file — read it for exact data shapes, formatting, normalization and the 3D projection math.

## Fidelity
**High-fidelity.** Colors, type, spacing and interactions are final. Data is **sample/placeholder** — replace with a real stats API.

## Screens / Views

### 1. Global nav (all screens)
- Black bar `#111`, padding `12px 28px`, flex row, gap 24, wraps.
- Logo: wordmark "Stat" (white) + "Pakd" in a white pill (`#fff` bg, `#111` text, radius 5, padding `0 6px 2px`). Geist 700, 20px, letter-spacing −0.03em.
- League tabs: 13px/600. Active `#fff`; inactive `#6A6A66` with "SOON" tag (Geist Mono 10px).
- Right side: Players/Teams segmented control (track `#2A2A28`, radius 8, pad 3; active item white bg/`#111` text, radius 6, padding `6px 14px`) and **Season** select (`#2A2A28` bg, `#3A3A37` border, radius 7, white 13px/600). Options: "2024 Regular Season", 2023, 2022.

### 2. Content container
`max-width: 1360px`, centered, padding `24px 28px 40px`, vertical gap 24.

### 3. Teams mode switch (Teams only)
Segmented control: "Compare teams" | "Team breakdown" (track `#F2F2EF`, radius 9, pad 3; active white + `0 1px 2px rgba(0,0,0,.1)`). Hint text to the right, 13px `#7A7A75`.

### 4. Compare view
**Picker cards row**: CSS grid `repeat(auto-fill, minmax(220px,1fr))`, gap 12.
- Entity card: border `1px #E3E3E0`, **top border 4px in series color**, radius 12, padding `16px 18px`. Big jersey number (`#17`) or team abbr in Geist Mono 40px/600, letter-spacing −0.04em. Name 17px/600, meta 13px `#7A7A75` ("BUF · QB · #17"). Remove: 26px circle `#F2F2EF`, "×".
- Add card (when < 8): dashed `1.5px #CFCFCB`, bg `#FAFAF8`, min-height 124, "+", "Add player", "N of 8 slots open". Hover border `#111`.
- Add popover: 360px wide, white, border `#DEDEDA`, radius 12, shadow `0 12px 32px rgba(0,0,0,.12)`, padding 12. Search input (autofocus, focus border `#111`) + "Done". Players only: position chips All/QB/RB/WR/TE (pill, active black). Results list (max-height 340, scroll): 30px tile with position/abbr (Geist Mono 11px on `#F0F0ED`), name 14/500, meta 12. CTA button: "Add" (black) / "Remove" (white, border `#DADAD6`); disabled when full. Empty: "No matches."

**Body**: flex row, gap 32, wraps.
- **Stat sidebar** (232px): groups (Players: Passing, Rushing, Receiving, Totals; Teams: Offense, Defense, Overall). Group heading 11px/600 uppercase, letter-spacing .08em, `#8A8A85`. **Only selected stats are listed** (16px checkbox, black fill + white ✓). Clicking one deselects it (min 1 must stay). Each group ends with **"+ Add stat"** (dashed box icon, 13px/600 `#7A7A75`) which opens an inline menu of that group's unselected stats; picking one selects it and it appears in the list in canonical order.
- **Main panel**: underline tabs "Table" / "2D chart" / "3D chart" (14px/600; active `#111` with 2px bottom border; inactive `#8A8A85`). When 2D active, a small Bars | Radar segmented control on the right.
  - **Table**: border `#E6E6E3`, radius 12, horizontal scroll if needed (min-width = 190 + 130·n px). Grid `minmax(170px,1.3fr) repeat(n, minmax(0,1fr))`. Header bg `#FAFAF8`: dot + name (switches to short name "J. Allen" & jersey when >4 entities) + meta. Rows: label 14px, "lower is better" note 11px `#9A9A95`. Values Geist Mono 17px/500, right-aligned; **best among selected = black pill (`#111` bg, white text, radius 6, padding `3px 9px`)**. N/A shows "—" in `#B5B5B0` and is excluded from "best". Caption: "Black = best among selected · — = not applicable to position".
  - **2D Bars**: per stat row grid `160px | 1fr`, padding 14 0, bottom border `#F0F0ED`. Inside, one line per entity: **name column on the left (110px, color dot + short name, 12px/600, ellipsis)**, track `#F3F3F0` 16px tall radius 3, fill in series color, width = 5% + 95%·normalized(league range), value 70px right Geist Mono 13px.
  - **2D Radar**: needs ≥3 stats, else "Pick at least 3 stats for the radar." 520×420 viewBox, center (260,210), R=150, 4 rings `#E6E6E2`. Polygons stroke 2px series color, fill-opacity .06, vertex dots r3.5 with white stroke. Labels as HTML overlays (not SVG text). "Lower is better" stats inverted. Legend list at right (3px left border in series color).
  - **3D chart**: X/Y/Z selects (any stat) + "Reset view". SVG 600×460 inside bordered card: unit cube [-1,1]³, floor + back-wall grid `#EDEDE9`, cube edges `#DADAD5`, 3 axes `#111` 1.5px from (−1,−1,−1). Every league entity plotted: selected r7 in series color with name tag; others r4.5 `#C9C9C4`. Dashed drop lines to floor. **Drag to rotate** (yaw += dx·0.01, pitch += dy·0.008 clamped to [−0.2, 1.3]); defaults yaw −0.65, pitch 0.38. Perspective: f = 4.5/(4.5+z), scale 128, center (300,242). Painter-sort by depth. Labels as HTML overlays positioned in %.
  - **Readout** (3D only): 280px aside, "READOUT" heading; a card per entity: color square + name, then 3 cells (X/Y/Z, value Geist Mono 15/600, stat label 10px).

### 5. Team breakdown (Teams → Team breakdown)
- Team chips (Geist Mono 13/600 abbr; active black).
- Team header card: top border 4px `#111`, radius 12, padding `18px 22px`. Abbr Geist Mono 44px, name 22/600, meta "NFC East · 14–3 · 2024". Right: 4 summary stats (Pts/G, Yds/G, Allowed/G, TO Diff) — label 11px uppercase, value Geist Mono 22/600.
- "Share of team production" + Offense/Defense toggle.
  - Offense shares: Touches, Targets, Scrimmage Yds, Touchdowns. Defense: Tackles, Sacks, Takeaways, Passes Defended.
  - Each row grid `150px | 1fr | 150px`: label + total, **100% stacked bar** (30px tall, radius 5, 2px gaps, segment flex-grow = value, % text when ≥9%, tooltip "Name · value (pct%)"), "Leader: Barkley 54%".
  - Legend of roster players with color squares.
- **Roster table** (sortable; click header toggles desc/asc with ↓/↑): Offense cols Snap %, Touches, Targets, Scrim Yds, TD, Yds/Touch. Defense: Snap %, Tackles, Sacks, INT, Pass Def, Forced Fum. Snap % cell includes a 72×4 mini bar (`#111` fill on `#EDEDE9`). Team leader per column = black pill. Caption "Click a column to sort · Black = team leader".

## Interactions & Behavior
- Max 8 entities per kind (players/teams keep separate selections). Add popover auto-closes when full.
- Switching Players/Teams resets search, position filter, popover.
- Season change recomputes all data.
- Normalization for charts uses the **full league pool range** for the current season (not just selected), ignoring nulls.
- Hover: list rows `#F4F4F1`/`#F6F6F3`; remove buttons `#E6E6E2`.
- No animations required; transitions optional (≤150ms ease-out).
- Responsive: body rows wrap (sidebar above main on narrow), tables scroll horizontally.

## State Management
```
kind: 'players' | 'teams'
season: '2024' | '2023' | '2022'
sel: { players: string[], teams: string[] }        // ≤ 8 each, order = color index
stats: { players: string[], teams: string[] }      // selected stat keys, kept in canonical group order
ax: { players: [x,y,z], teams: [x,y,z] }            // 3D axis stat keys
view: 'num' | '2d' | '3d';  chart2: 'bars' | 'radar'
q, pos, addOpen, addStatOpen (group name | null)
yaw, pitch                                          // 3D camera
teamMode: 'compare' | 'inside'; teamId; unit: 'off' | 'def'; tSort: { k, d }
```
Data: replace sample arrays with an API. Suggested league-agnostic model:
```
League { id, name, sport, seasons[], entityTypes: ['players','teams'] }
StatDef { key, label, group, decimals?, lowerIsBetter?, signed?, extra? /* hidden by default */ }
Entity { id, name, shortName, meta, badge /* jersey # or abbr */, position?, teamId?, stats: Record<key, number|null> }
RosterEntry { playerId, unit, role, snapPct, ... }
```
Stat definitions are per league + entity type — never hard-code NFL fields into components.

## Design Tokens
- **Colors**: ink `#111111`; white `#FFFFFF`; surface-subtle `#FAFAF8`; track/segment bg `#F2F2EF` / `#F3F3F0`; hover `#F4F4F1`; borders `#E3E3E0`, `#E6E6E3`, `#E8E8E5`, row divider `#F0F0ED`; input border `#DEDEDA`; checkbox off `#CFCFCB`; muted text `#7A7A75`; label text `#8A8A85`; faint `#9A9A95`; disabled/NA `#B5B5B0`; 3D non-selected `#C9C9C4`; dark-nav secondary `#A5A5A0`, `#6A6A66`, `#2A2A28`, `#3A3A37`.
- **Series colors (in order)**: `#111111`, `#E0472B`, `#2F5FD0`, `#14946A`, `#D9921A`, `#7B4FC9`, `#1A9AA8`, `#D6457F`.
- **Type**: Geist (400/500/600/700) for UI; Geist Mono (400/500/600) for all numbers, badges, tags. Sizes: 10, 11, 12, 13, 14, 15, 17, 18, 20, 22, 40, 44.
- **Radii**: 2–3 (bars/squares), 4 (checkbox), 5–7 (pills/inputs/buttons), 8–9 (segmented), 10–12 (cards), 999 (chips).
- **Spacing**: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32.
- **Shadows**: segmented active `0 1px 2px rgba(0,0,0,.1)`; popover `0 12px 32px rgba(0,0,0,.12)`; menu `0 4px 12px rgba(0,0,0,.06)`. No transparency/glass effects.

## Assets
None — no images or icons. Fonts: Google Fonts Geist + Geist Mono.

## Files
- `design/StatPakd App.dc.html` — **final consolidated design** (implement this).
- `design/explorations/StatPakd Directions.dc.html` — earlier directions 1a/1b/1c, for context only.
- `support.js` — runtime needed only to open the HTML references in a browser.

## Suggested prompt for Claude Code
> Read `design_handoff_statpakd/README.md` and `design/StatPakd App.dc.html`. Scaffold a React + TypeScript app that recreates the StatPakd design pixel-accurately, with a league-agnostic data layer (mock NFL data for now), and implement Compare (Table / 2D Bars+Radar / 3D) and Team breakdown views.
