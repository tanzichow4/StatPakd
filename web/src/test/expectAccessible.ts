import { expect } from 'vitest'
import { seriousViolations } from './axe'

/** Fails when the page has a serious or critical axe violation. */
export async function expectAccessible(): Promise<void> {
  expect(await seriousViolations(document.body)).toEqual([])
}
