import { join } from 'path'
import { existsSync } from 'fs'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'

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

export function getEdgioConfig() {
  let edgioConfig = {}

  const configAbsPath = [
    join(process.cwd(), 'edgio.config.js'),
    join(process.cwd(), 'edgio.config.ts'),
    join(process.cwd(), 'edgio.config.cjs'),
  ].find(existsSync)

  if (configAbsPath) {
    try {
      edgioConfig = nonWebpackRequire(configAbsPath)
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }

  return edgioConfig
}
