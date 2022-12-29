import fs from 'fs'
import { join } from 'path'
import { NEXT_RUNTIME_CONFIG_FILE } from '../config/constants'

/**
 * Returns true if the runtime version of next.config.js file already exists
 * @param dir Working directory
 * @returns
 */
export default function nextRuntimeConfigExists(dir: string = process.cwd()): boolean {
  return fs.existsSync(join(process.cwd(), NEXT_RUNTIME_CONFIG_FILE))
}
