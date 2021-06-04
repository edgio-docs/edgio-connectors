import { read as readPkg } from '@layer0/core/utils/packageUtils'
import chalk from 'chalk'

const NUXT_NITRO_DEPENDENCY = '@nuxt/nitro'

/**
 * Ensures that package.json has the correct Nuxt dependencies defined
 */
export default async function validateDependencies() {
  const packageContents = readPkg()
  const { devDependencies = {}, dependencies = {} } = packageContents

  if (!devDependencies[NUXT_NITRO_DEPENDENCY] && !dependencies[NUXT_NITRO_DEPENDENCY]) {
    console.log(
      chalk.red.bold(
        `Error: You must add "${NUXT_NITRO_DEPENDENCY}" as a devDependency in package.json. ` +
          'Please update this file or run `layer0 init` and try again.'
      )
    )
    // We signal to the next process in chain that there was an error.
    process.exit(1)
  }
}
