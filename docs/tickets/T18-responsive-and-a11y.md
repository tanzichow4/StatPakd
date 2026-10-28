# T18: Responsive and accessibility pass
**Phase:** 4 · **Size:** M · **Depends on:** T10 to T17

## Scope
Check every view at 375px, 768px and 1280px. Fix wrapping, overflow and touch targets (at least 40px for controls). Audit keyboard order, focus visibility, labels, live regions for add/remove, color contrast (muted text `#9A9A95` and `#B5B5B0` on white likely fail; propose accessible alternates and get design sign-off), and non-color encoding of series.

## Acceptance criteria
- [ ] No horizontal page scroll at 375px (tables scroll inside their container).
- [ ] axe (jest-axe or Playwright axe) reports no serious or critical issues on every view.
- [ ] Full flow operable with keyboard only.
- [ ] Contrast exceptions are documented with the decision.
