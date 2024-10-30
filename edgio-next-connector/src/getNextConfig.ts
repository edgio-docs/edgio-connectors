/* istanbul ignore file */
import { resolve } from 'path'
import { existsSync } from 'fs'
import { JS_APP_DIR } from '@edgio/core/deploy/paths'
import { nonWebpackRequire } from '@edgio/core/utils'

/**
 * Gets the data in next.config.js
 * @param appDir The root directory of the app, defaults to the current working directory
 * @param filename The name of the next.config.js file, defaults to 'next.config.js'
 * @returns
 */
export default function getNextConfig(appDir = process.cwd(), filename = 'next.config.js'): any {
  const configFile = [
    // Try to use next.config.js file from the app directory first if it's available.
    resolve(appDir, filename),
    resolve(appDir, filename.replace('.js', '.cjs')),
    // If no compatible next.config.js|cjs file is found in the app directory,
    // use built next.config.js file from the .edgio/app directory.
    // This file is re-build by NextConfigBuilder on each edgio dev/build command call.
    // We'll get here if project uses TypeScript/ESM with next.config.ts/mjs file
    // and we cannot load the file directly or in sync way.
    resolve(JS_APP_DIR, filename),
    resolve(JS_APP_DIR, filename.replace('.js', '.cjs')),
  ].find(existsSync)

  if (!configFile) {
    return {}
  }

  const module = nonWebpackRequire(configFile)
  const config = module.default || module

  if (typeof config === 'function') {
    return config('phase-production-build', {})
  }

  return config
}
