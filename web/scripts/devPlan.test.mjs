import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { findPython, planApi } from './devPlan.mjs'

describe('findPython', () => {
  const root = path.join('repo')

  it.each([
    ['win32', path.join('repo', '.venv', 'Scripts', 'python.exe')],
    ['linux', path.join('repo', '.venv', 'bin', 'python')],
  ])('prefers the virtual environment on %s', (platform, venv) => {
    expect(findPython(root, platform, (p) => p === venv)).toBe(venv)
  })

  it.each([
    ['win32', 'python'],
    ['darwin', 'python3'],
  ])('falls back to the PATH on %s', (platform, name) => {
    expect(findPython(root, platform, () => false)).toBe(name)
  })
})

describe('planApi', () => {
  it('starts the API on port 8000 by default', () => {
    expect(planApi({})).toEqual({ start: true, port: 8000, url: 'http://127.0.0.1:8000' })
  })

  it('uses the chosen port for both the API and the web app', () => {
    expect(planApi({ STATPAKD_PORT: '9001' })).toMatchObject({
      port: 9001,
      url: 'http://127.0.0.1:9001',
    })
  })

  it('starts nothing for the sample data', () => {
    expect(planApi({ VITE_DATA_SOURCE: 'mock' })).toEqual({
      start: false,
      reason: 'using the sample data',
    })
  })

  it.each(['STATPAKD_API', 'VITE_API_URL'])('starts nothing when %s points elsewhere', (name) => {
    expect(planApi({ [name]: 'http://api.test' })).toEqual({
      start: false,
      reason: 'using the API at http://api.test',
    })
  })
})
