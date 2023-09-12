import { resolve } from 'path'
import { isPortBound } from '@edgio/core/utils/portUtils'
import { getConfig } from '@edgio/core/config'
import { ExtendedConfig } from './types'
import { findDefaultAppPath } from './utils'

export default async function prod(port: number) {
  try {
    const edgioConfig = getConfig() as ExtendedConfig
    const appPath = edgioConfig?.express?.appPath || findDefaultAppPath() || 'index.js'

    process.env.PORT = port.toString()

    // @ts-ignore
    let app = await import(/* webpackIgnore: true */ resolve(appPath))
    // Find the default export
    app = app?.default?.default || app?.default || app

    // When the port is occupied,
    // we assume the server started by itself in the exported module.
    if (await isPortBound(port)) {
      return
    }

    app?.listen(port)
  } catch (e) {
    return Promise.reject(e)
  }
}
