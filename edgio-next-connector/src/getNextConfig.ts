/* istanbul ignore file */
import { nonWebpackRequire } from '@edgio/core/utils'
import { resolve } from 'path'

/**
 * Gets the data in next.config.js
 * @param appDir The root directory of the app, defauts to the current working directory
 * @returns
 */
export default function getNextConfig(appDir = process.cwd()): any {
  const configFile = resolve(appDir, 'next.config.js')

  if (moduleExists(configFile)) {
    let config: any = nonWebpackRequire(configFile)

    if (typeof config === 'function') {
      config = config('phase-production-build')
    }

    return config
  } else {
    return {}
  }
}

/**
 * Returns `true` if a module exists, otherwise `false`.
 * @param mod A module path
 */
function moduleExists(mod: string) {
  try {
    eval('require.resolve')(mod)
    return true
  } catch (e) {
    return false
  }
}
