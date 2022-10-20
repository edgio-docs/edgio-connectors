import { join } from 'path'
import { readAsset } from './assets'

/**
 * Gets the build output directory for Astro
 */
export default function getAstroConfig() {
  // Set defaults for astro config
  let astroConfig = { outDir: './dist', output: 'static' }

  // Load the astro config
  const astroConfigFile = join(process.cwd(), 'astro.config.json')

  try {
    let config = JSON.parse(readAsset(astroConfigFile))

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
