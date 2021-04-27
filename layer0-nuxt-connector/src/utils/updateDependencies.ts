/* istanbul ignore file */
import { loadNuxtConfig } from '@nuxt/config'
import { read as readPkg, write as writePkg } from '@layer0/core/utils/packageUtils'
import chalk from 'chalk'

const NUXT_CORE_DEPENDENCY = '@nuxt/core'

/**
 * Ensures that package.json has the correct Nuxt dependencies defined
 */
export async function validateDependencies() {
  const packageContents = readPkg()
  const { dependencies } = packageContents

  if (!dependencies[NUXT_CORE_DEPENDENCY]) {
    console.log(
      chalk.red.bold(
        `Error: You must add "${NUXT_CORE_DEPENDENCY}" as a dependency in package.json. ` +
          'Please update this file or run `layer0 init` and try again.'
      )
    )
    // We signal to the next process in chain that there was an error.
    process.exit(1)
  }
}

/**
 * Optimizes the dependencies and devDependencies in package.json so that
 * the serverless build is as small as possible.
 */
export default async function updateDependencies() {
  const config = await loadNuxtConfig()
  const packageContents = JSON.parse(JSON.stringify(readPkg())) // don't clone original ref
  const { dependencies, devDependencies } = packageContents

  // move all dependencies not listed in modules to devDependencies to reduce bundle size
  /* istanbul ignore next  */
  for (let pkg in dependencies) {
    if (!config.modules.includes(pkg)) {
      devDependencies[pkg] = dependencies[pkg]
      delete dependencies[pkg]
    }
  }

  // use the same version of @nuxt/core as nuxt
  const { nuxt } = devDependencies

  dependencies[NUXT_CORE_DEPENDENCY] = nuxt
  delete devDependencies[NUXT_CORE_DEPENDENCY]

  writePkg(JSON.stringify(packageContents, null, 2))
}
