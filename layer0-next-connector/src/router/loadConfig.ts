import { join } from 'path'
import nonWebpackRequire from '@layer0/core/utils/nonWebpackRequire'

/**
 * Loads the result of next.config.js from the current working directory.
 * @return the next config object
 */
export default function loadConfig() {
  const configFile = join(process.cwd(), 'next.config.js')

  if (moduleExists(configFile)) {
    let config: any = nonWebpackRequire(configFile)

    if (typeof config === 'function') {
      config = config()
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
