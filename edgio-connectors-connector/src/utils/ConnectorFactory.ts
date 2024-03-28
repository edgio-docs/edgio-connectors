import { getConfig } from '@edgio/core/config'
import { nonWebpackRequire } from '@edgio/core/utils'
import { join } from 'path'
import { Connector } from './types'

export default class ConnectorFactory {
  public static get(name?: string) {
    // Name can be passed in cases where config is not yet created.
    const connectorName = name ?? getConfig().connector?.split('/')[1]

    if (!connectorName) {
      throw new Error(`Connector '${connectorName}' doesn't exist.`)
    }

    // As routes cant be async (onRegister doesnt support async), we have to
    // use nonWebpackRequire, and copy bundled connector def into lambda folder on build.
    // This approach also allows us to not have to specify connector's name at all,
    // eg. users will just '.use(connectorRoutes)'

    // eslint-disable-line no-eval
    return nonWebpackRequire(join('@edgio/connectors/frameworks', connectorName))
      .default as Connector
  }
}
