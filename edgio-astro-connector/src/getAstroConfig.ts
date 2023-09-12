import { resolve } from 'path'
import { readAsset } from './assets'
import { isCloud } from '@edgio/core/environment'
import { JS_APP_DIR } from '@edgio/core/deploy/paths'

/**
 * Gets the build output directory for Astro
 */
export default function getAstroConfig() {
  // Set defaults for astro config
  let astroConfig = { outDir: './dist', output: 'static' }

  // Load the astro config
  try {
    const configFilename = 'astro.config.json'
    const configFilePath = isCloud() ? resolve(configFilename) : resolve(JS_APP_DIR, configFilename)
    const config = JSON.parse(readAsset(configFilePath))

    // If output in the outDir exists, assign it to the astroConfig
    if (config?.outDir) {
      astroConfig.outDir = config.outDir
    }

    // If output in the config exists, assign it to the astroConfig
    if (config?.output) {
      astroConfig.output = config.output
    }
  } catch (e) {
    // will get here if no astro config file is present
  }

  // remove the ./ prefix that's part of the outDir syntax
  astroConfig.outDir = astroConfig.outDir.replace('./', '')

  return astroConfig
}
