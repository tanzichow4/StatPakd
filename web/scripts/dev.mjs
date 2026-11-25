// `npm run dev`: starts the data API and then the web dev server, and stops both together.
// Arguments are passed to Vite, for example `npm run dev -- --port 3000`.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findPython, planApi } from './devPlan.mjs'

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.resolve(web, '..')
const START_LIMIT_MS = 60_000

const say = (text) => console.log(`[api] ${text}`)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function answers(url) {
  try {
    const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) })
    return response.ok && (await response.json()).status === 'ok'
  } catch {
    return false
  }
}

let api = null
let stopping = false

/** Stops the API this script started, including any process it started in turn. */
function stopApi() {
  stopping = true
  if (!api || api.exitCode !== null || api.pid === undefined) return
  // On Windows the venv's python.exe runs the real Python as a child, so end the whole tree.
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(api.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    api.kill('SIGTERM')
  }
}

async function startApi({ port, url }) {
  if (await answers(url)) {
    say(`already running at ${url}, so it is used as it is`)
    return
  }
  const python = findPython(root, process.platform, existsSync)
  say(`starting with ${python}`)
  let ended = false
  api = spawn(python, ['-m', 'statpakd'], {
    cwd: root,
    // The address is fixed here so that it matches where the web app looks.
    env: {
      ...process.env,
      STATPAKD_HOST: '127.0.0.1',
      STATPAKD_PORT: String(port),
      PYTHONUNBUFFERED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  for (const stream of [api.stdout, api.stderr]) {
    createInterface({ input: stream }).on('line', say)
  }
  const failed = (why) => {
    ended = true
    if (stopping) return
    say(`${why}. The app cannot load data until the API runs.`)
    say('Check that its packages are installed: pip install -e ".[dev]"')
  }
  api.on('error', (error) => failed(`could not start (${error.message})`))
  api.on('exit', (code) => failed(`stopped with code ${code}`))

  // Waiting here means the page does not ask for data before the API can answer.
  const limit = Date.now() + START_LIMIT_MS
  while (!ended && Date.now() < limit) {
    if (await answers(url)) return
    await wait(200)
  }
  if (!ended) say('is taking a long time to start; the web app is starting anyway')
}

process.on('exit', stopApi)
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => process.exit(0))
}

const plan = planApi(process.env)
if (plan.start) await startApi(plan)
else say(`not started: ${plan.reason}`)

const vite = spawn(
  process.execPath,
  [path.join(web, 'node_modules', 'vite', 'bin', 'vite.js'), ...process.argv.slice(2)],
  {
    cwd: web,
    env: plan.start ? { ...process.env, STATPAKD_API: plan.url } : process.env,
    stdio: 'inherit',
  },
)
vite.on('error', (error) => {
  console.error(`Could not start the web server: ${error.message}`)
  process.exit(1)
})
vite.on('exit', (code) => process.exit(code ?? 0))
