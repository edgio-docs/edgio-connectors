import { existsSync } from 'fs'
import { join, resolve } from 'path'

/**
 * Attempts to find the express app entrypoint by looking for common files.
 */
export function findDefaultAppPath() {
  return [
    join('src', 'server.js'),
    join('src', 'server.ts'),
    join('src', 'app.ts'),
    join('src', 'app.js'),
    join('src', 'index.js'),
    join('src', 'index.ts'),
    join('server.js'),
    join('app.js'),
    join('index.js'),
  ].find(path => existsSync(resolve(path)))
}
