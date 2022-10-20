import chalk from 'chalk'
const { loadNuxtConfig } = require('nuxt')

/**
 * Ensures that nuxt.config.js exists and has mode: 'universal' (or undefined).
 * @param {String} appDir The path to Edgio app's root directory
 */
export default async function validateNuxtConfig(appDir: string) {
  const nuxtConfig = await loadNuxtConfig({ rootDir: appDir })

  if (nuxtConfig.mode && nuxtConfig.mode !== 'universal') {
    console.log(
      chalk.red.bold(
        'Error: You must set mode: "universal" in nuxt.config.js. Please update this file and try again.'
      )
    )
    // We signal to the next process in chain that there was an error.
    process.exit(1)
  }
}
