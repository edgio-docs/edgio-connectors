import { basename, resolve } from 'path'
import ConnectorBuilder from '../../utils/ConnectorBuilder'
import { existsSync } from 'fs'
import { BundlerType } from '../../utils/types'

export default new ConnectorBuilder('nodejs-connector')
  .setBuild(edgioConfig => {
    if (!edgioConfig.nodejsConnector) {
      throw Error('Connector configuration for nodejsConnector not found in edgio.config.js')
    }

    return {
      command: edgioConfig.nodejsConnector.buildCommand,
      buildFolder: edgioConfig.nodejsConnector.buildFolder ?? '',
      entryFile: edgioConfig.nodejsConnector.entryFile ?? '',
      bundler: edgioConfig.nodejsConnector.bundleEntryFile ? BundlerType.ESBUILD : null,
    }
  })
  .setProd(async (edgioConfig, port) => {
    // We strip the folder location from entry file name
    // as we always bundle/copy the entry file in the same folder
    const entryFileName = basename(edgioConfig.nodejsConnector?.entryFile!)
    const serverPath = resolve(entryFileName)

    if (edgioConfig.nodejsConnector?.entryFile && existsSync(serverPath)) {
      process.env[edgioConfig.nodejsConnector!.envPort!] = port.toString()

      return { serverPath }
    } else if (!edgioConfig.nodejsConnector?.entryFile) {
      throw new Error(
        `Connector configuration for nodejsConnector is missing an 'entryFile' value.`
      )
    } else {
      throw new Error(`Server path ${serverPath} doesn't exist.`)
    }
  })
  .setDev(edgioConfig => {
    if (!edgioConfig.nodejsConnector?.devCommand) {
      throw new Error(
        `Connector configuration for nodejsConnector is missing a 'devCommand' value.`
      )
    }
    const ready =
      typeof edgioConfig.nodejsConnector!.devReadyMessageOrTimeout === 'number'
        ? edgioConfig.nodejsConnector!.devReadyMessageOrTimeout
        : [new RegExp(edgioConfig.nodejsConnector!.devReadyMessageOrTimeout!)]

    return {
      command:
        edgioConfig.nodejsConnector!.devCommand === ''
          ? undefined
          : port => {
              process.env[edgioConfig.nodejsConnector!.envPort!] = port.toString()
              return edgioConfig.nodejsConnector!.devCommand!.replace(/\${PORT}/gi, port.toString())
            },
      ready,
    }
  })
  .withStaticFolder(edgioConfig => edgioConfig.nodejsConnector?.staticFolder)
  .withServiceWorker()
  .withServerless()
  .toConnector()
