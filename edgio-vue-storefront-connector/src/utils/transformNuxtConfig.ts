import { sync as spawnSync } from 'cross-spawn'
import { join } from 'path'

const nuxtTransform = join(__dirname, '../mods/nuxt-config.js')
const jscodeshiftExecutable = require.resolve('.bin/jscodeshift')

function codemod(transform: string, path: string) {
  spawnSync(jscodeshiftExecutable, ['-t', transform, path], {
    stdio: 'inherit',
  })
}

const transformNuxtConfig = (pathToNuxtConfig = 'nuxt.config.js') => {
  // Apply transformations to the nuxt config required by Edgio
  // Please look in ../mods/nuxt-config.js for more details on
  // the transformations
  codemod(nuxtTransform, pathToNuxtConfig)
}

export { transformNuxtConfig }
