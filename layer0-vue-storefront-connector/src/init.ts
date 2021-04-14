import nuxtInit from '@layer0/nuxt/init'
import { copySync, readJSONSync, writeJSONSync } from 'fs-extra'
import { join } from 'path'
import { sync as spawnSync } from 'cross-spawn'

const nuxtTransform = join(__dirname, './mods/nuxt-config.js')
const jscodeshiftExecutable = require.resolve('.bin/jscodeshift')

function codemod(transform: string, path: string) {
  spawnSync(jscodeshiftExecutable, ['-t', transform, path], {
    stdio: 'inherit',
  })
}

async function init(args: any) {
  // Adds Layer0 directory with:
  // - createProductURL helper for prefetching
  // - createCategoryURL helperfor prefetching
  // - createHttpLink alias for transforming Apollo requests to GET
  copySync(join(__dirname, './helpers'), join(process.cwd(), 'layer0'))

  // Apply transformations to the nuxt config required by Layer0
  // Please look in ../mods/nuxt-config.js for more details on
  // the transformations
  codemod(nuxtTransform, 'nuxt.config.js')

  // Apply the @layer0/nuxt initialization
  await nuxtInit()

  // Copy over Layer0 configuration files with predefined properties for VSF
  copySync(
    join(__dirname, './predefined/layer0.config.js'),
    join(process.cwd(), 'layer0.config.js')
  )
  copySync(join(__dirname, './predefined/routes.ts'), join(process.cwd(), 'routes.ts'))

  // NOTE: Modify build script for now... should not need to always do this
  const packageFile = join(process.cwd(), 'package.json')
  const packageConfig = readJSONSync(packageFile)
  packageConfig.scripts['layer0:build'] = 'YALC=true layer0 build'
  writeJSONSync(packageFile, packageConfig, { spaces: 2 })
}

module.exports = init
