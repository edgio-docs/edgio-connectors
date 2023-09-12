import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

/**
 * Gets the contents of sanity.json as an object
 */
export function getSanityConfig() {
  const appDir = process.cwd()
  const oldSanityPath = join(appDir, 'sanity.json')
  if (existsSync(oldSanityPath)) {
    return JSON.parse(readFileSync(oldSanityPath, 'utf8').toString())
  }
  return {}
}
