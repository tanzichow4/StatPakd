import axe from 'axe-core'

/**
 * Runs axe against `root` and returns the serious and critical violations.
 * The `color-contrast` rule is disabled because jsdom cannot compute colours; contrast is covered
 * by the token contrast unit test (AC18) and by browser QA (AC19).
 */
export async function seriousViolations(root: Element | Document): Promise<axe.Result[]> {
  const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } })
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}
