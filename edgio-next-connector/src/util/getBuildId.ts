import fs from 'fs'
import { join } from 'path'

/**
 * Returns the contents of .next/BUILD_ID
 */
export default function getBuildId(distDirAbsolute: string): string {
  return fs.readFileSync(join(distDirAbsolute, 'BUILD_ID'), 'utf8')
}
