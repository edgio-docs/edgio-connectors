/* istanbul ignore file */
import { join } from 'path'

export default function getNextConfig(appDir: string) {
  const nextConfigPath = join(appDir, 'next.config.js')
  return require(nextConfigPath)
}
