// Decisions made by the dev script, kept apart so they can be tested without starting anything.
import path from 'node:path'

export const DEFAULT_PORT = 8000

/** The Python of the project's virtual environment, or the one on the PATH. */
export function findPython(root, platform, exists) {
  const windows = platform === 'win32'
  const venv = path.join(
    root,
    '.venv',
    ...(windows ? ['Scripts', 'python.exe'] : ['bin', 'python']),
  )
  if (exists(venv)) return venv
  return windows ? 'python' : 'python3'
}

/**
 * Whether `npm run dev` should start the API, and where the web app should look for it.
 * Returns `{ start: false, reason }` when the app does not need a local API.
 */
export function planApi(env) {
  if (env.VITE_DATA_SOURCE === 'mock') return { start: false, reason: 'using the sample data' }
  const elsewhere = env.VITE_API_URL || env.STATPAKD_API
  if (elsewhere) return { start: false, reason: `using the API at ${elsewhere}` }
  const port = Number(env.STATPAKD_PORT) || DEFAULT_PORT
  return { start: true, port, url: `http://127.0.0.1:${port}` }
}
