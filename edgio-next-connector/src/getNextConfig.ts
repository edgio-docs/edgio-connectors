/* istanbul ignore file */
import { resolve } from 'path'
import { existsSync } from 'fs'
import { JS_APP_DIR } from '@edgio/core/deploy/paths'
import { nonWebpackRequire } from '@edgio/core/utils'

/**
 * Gets the data in next.config.js
 * @param nextRootDir The root directory of the app, defaults to the current working directory
 * @param filename The name of the next.config.js file, defaults to 'next.config.js'
 * @returns
 */
export default function getNextConfig(nextRootDir = './', filename = 'next.config.js'): any {
  const configFile = [
    // Try to use next.config.js file from the app directory first if it's available.
    // For example:
    // ./next.config.js
    resolve(nextRootDir, filename),
    resolve(nextRootDir, filename.replace('.js', '.cjs')),
    // If no compatible next.config.js|cjs file is found in the app directory,
    // use built next.config.js file from the .edgio/app directory.
    // This file is re-build by NextConfigBuilder on each edgio dev/build command call.
    // We'll get here if project uses TypeScript/ESM with next.config.ts/mjs file
    // and we cannot load the file directly or in sync way.
    // For example:
    // .edgio/lambda/app/next.config.js
    // .edgio/lambda/app/project/packages/next/next.config.js
    resolve(JS_APP_DIR, nextRootDir, filename),
    resolve(JS_APP_DIR, nextRootDir, filename.replace('.js', '.cjs')),
  ].find(existsSync)

  if (!configFile) {
    return {}
  }

  try {
    const module = nonWebpackRequire(configFile)
    const config = module.default || module

    if (typeof config === 'function') {
      return config('phase-production-build', {})
    }

    return config
  } catch (e: any) {
    // Dummy way to detect that the error is caused by importing ESM module inside CJS project,
    // so we can give user better error message WITH instructions how to fix it.
    if (
      e.message.includes('Cannot use import statement outside a module') ||
      e.message.includes("Unexpected token 'export'")
    ) {
      throw new Error(
        `Edgio failed to load '${configFile}' file. \r\nThe loading of ESM module in CommonJS context is not supported. ` +
          `Please rename your next.config.cjs|js file to next.config.mjs if you want to use ESM module ` +
          `or convert the file to CJS module by using module.exports = {...} syntax.`
      )
    }
    // Re-throw everything else
    throw e
  }
}
