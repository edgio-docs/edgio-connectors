import { existsSync } from 'fs'
import { join } from 'path'

/**
 * Attempts to find the express app entrypoint by looking for common files.
 */
export function findDefaultAppPath() {
  return [
    join(process.cwd(), 'src', 'server.js'),
    join(process.cwd(), 'src', 'server.ts'),
    join(process.cwd(), 'src', 'app.ts'),
    join(process.cwd(), 'src', 'app.js'),
    join(process.cwd(), 'src', 'index.js'),
    join(process.cwd(), 'src', 'index.ts'),
    join(process.cwd(), 'server.js'),
    join(process.cwd(), 'app.js'),
    join(process.cwd(), 'index.js'),
  ].find(existsSync)
}
