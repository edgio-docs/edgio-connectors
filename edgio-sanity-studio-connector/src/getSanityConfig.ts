import { join } from 'path'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'

/**
 * Gets the contents of sanity.json as an object
 */
export function getSanityConfig() {
  const sanityConfigPath = join(process.cwd(), 'sanity.json')
  return nonWebpackRequire(sanityConfigPath)
}
