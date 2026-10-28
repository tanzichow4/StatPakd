# T02: Design tokens and UI primitives
**Phase:** 0 · **Size:** M · **Depends on:** T01

## Goal
All design tokens as CSS variables plus the small reusable components every view needs.

## Scope
- `web/src/styles/tokens.css`: colors, series colors (8, ordered), radii, spacing, shadows, type scale (see handoff "Design Tokens").
- Global styles: Geist for UI, Geist Mono for numbers, box-sizing, body background.
- Components (CSS modules, typed props): `SegmentedControl`, `Tabs` (underline), `Checkbox`, `Pill` (best-value black pill), `Chip`, `IconButton` (round remove button), `Select`.
- A throwaway `/dev` page that renders every primitive for visual checking.

## Acceptance criteria
- [ ] Token values match the handoff exactly (spot check 10 values).
- [ ] Primitives are keyboard operable with visible focus and correct roles (`tablist`, `radiogroup`/buttons, `checkbox`).
- [ ] Each primitive has a component test for its main interaction.

## Out of scope
Feature components.
