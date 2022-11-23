import { join } from 'path'
import { readAsset } from './assets'

/**
 * Gets the build output directory for Vite
 */
export default function getViteConfig() {
  // Set defaults for vite config
  let viteConfig = { outDir: 'dist' }

  // Load the Vite config
  const viteConfigFile = join(process.cwd(), 'vite.config.json')

  try {
    let config = JSON.parse(readAsset(viteConfigFile))

    // If output in the outDir exists, assign it to the viteConfig
    if (config?.outDir) {
      viteConfig.outDir = config.outDir
    }
  } catch (e) {
    // will get here if no vite config file is present
  }

  // remove the ./ prefix that's part of the outDir syntax
  viteConfig.outDir = viteConfig.outDir.replace('./', '')

  return viteConfig
}
