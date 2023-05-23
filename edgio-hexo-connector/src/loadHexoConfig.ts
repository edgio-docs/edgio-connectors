import fs from 'fs'
import YAML from 'yaml'
import { join } from 'path'

export default function loadHexoConfig() {
  try {
    return YAML.parse(fs.readFileSync(join(process.cwd(), '_config.yml'), 'utf8'))
  } catch (e) {
    return null
  }
}
