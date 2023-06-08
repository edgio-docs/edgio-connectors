import { join } from 'path'
import { existsSync } from 'fs'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'

/**
 * Gets the contents of sanity.json as an object
 */
export function getSanityConfig() {
  const appDir = process.cwd()
  const oldSanityPath = join(appDir, 'sanity.json')
  if (existsSync(oldSanityPath)) {
    return nonWebpackRequire(oldSanityPath)
  }
  return {}
}
