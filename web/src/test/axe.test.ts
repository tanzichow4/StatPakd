import { afterEach, describe, expect, it } from 'vitest'
import { seriousViolations } from './axe'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('axe wiring', () => {
  it('returns no violations for a well-formed snippet', async () => {
    document.body.innerHTML = '<main><h1>Title</h1><button type="button">Go</button></main>'
    expect(await seriousViolations(document.body)).toEqual([])
  }, 30000)

  it('reports an unnamed button as a critical button-name violation', async () => {
    document.body.innerHTML = '<main><h1>Title</h1><button type="button"></button></main>'
    const found = await seriousViolations(document.body)
    expect(found.map((v) => v.id)).toContain('button-name')
  }, 30000)
})
