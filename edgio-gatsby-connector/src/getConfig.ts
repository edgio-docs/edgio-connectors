import { join } from 'path'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'

/**
 * Gets the contents of config as an object
 */
export function getConfig(file = 'edgio.config.js') {
  const configPath = join(process.cwd(), file)
  return nonWebpackRequire(configPath)
}
