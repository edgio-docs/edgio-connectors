import fs from './fs'
import { join } from 'path'

export const FILENAME = 'BUILD_ID'

export default function getBuildVersion() {
  const path = join(process.cwd(), FILENAME)
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : 'development'
}
