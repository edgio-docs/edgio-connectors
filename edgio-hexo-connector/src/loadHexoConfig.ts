import fs from 'fs'
import YAML from 'yaml'
import { join } from 'path'

export default function loadHexoConfig() {
  try {
    return YAML.parse(fs.readFileSync(join(process.cwd(), '_config.yml'), 'utf8'))
  } catch (e) {
    console.log(`> No _config.yml found, switching to default value public for public_dir config.`)
    console.log('\n', e, '\n')
    return {
      public_dir: 'public',
    }
  }
}
