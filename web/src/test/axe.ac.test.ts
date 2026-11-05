import { afterEach, describe, expect, it } from 'vitest'
import { seriousViolations } from './axe'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AC17: axe helper wiring', () => {
  it('AC17: returns no violations for a well-formed snippet', async () => {
    document.body.innerHTML = '<main><h1>Title</h1><button type="button">Go</button></main>'
    expect(await seriousViolations(document.body)).toEqual([])
  }, 30000)

  it('AC17: reports a critical button-name violation for an unnamed button', async () => {
    document.body.innerHTML = '<main><h1>Title</h1><button type="button"></button></main>'
    const v = await seriousViolations(document.body)
    expect(v.find((x) => x.id === 'button-name')?.impact).toBe('critical')
  }, 30000)

  it('AC17: reports an unlabelled form control', async () => {
    document.body.innerHTML = '<main><h1>T</h1><input type="text" /></main>'
    const v = await seriousViolations(document.body)
    expect(v.map((x) => x.id)).toContain('label')
  }, 30000)

  it('AC17: only serious and critical violations are returned', async () => {
    document.body.innerHTML = '<div><p>Hello</p><button type="button"></button></div>'
    const v = await seriousViolations(document.body)
    expect(v.length).toBeGreaterThan(0)
    for (const x of v) expect(['serious', 'critical']).toContain(x.impact)
  }, 30000)

  it('AC17: color-contrast is disabled because jsdom cannot compute it', async () => {
    document.body.innerHTML =
      '<main><h1>T</h1><p style="color:#eee;background:#fff">faint text</p></main>'
    const v = await seriousViolations(document.body)
    expect(v.map((x) => x.id)).not.toContain('color-contrast')
  }, 30000)
})
