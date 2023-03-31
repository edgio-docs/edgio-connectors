import { read } from '@edgio/core/utils/packageUtils'

/**
 * Gets the build output directory for Astro
 */
export default function getAstroConfig() {
  // Set defaults for astro config
  let astroConfig = { outDir: './dist', output: 'static', edgio_SW: false, appPath: null }

  try {
    // Load the astro config
    let config = read('astro.config.json')

    // If output in the outDir exists, assign it to the astroConfig
    if (config?.outDir) {
      astroConfig.outDir = config.outDir
    }

    // If output in the config exists, assign it to the astroConfig
    if (config?.output) {
      astroConfig.output = config.output
    }

    // If edgio_SW in the config exists, assign it to the astroConfig
    if (config?.edgio_SW) {
      astroConfig.edgio_SW = config.edgio_SW
    }

    // If appPath in the config exists, assign it to the astroConfig
    if (config?.appPath) {
      astroConfig.appPath = config.appPath
    }
  } catch (e) {
    // will get here if no astro config file is present
  }

  // remove the ./ prefix that's part of the outDir syntax
  astroConfig.outDir = astroConfig.outDir.replace('./', '')

  return astroConfig
}
