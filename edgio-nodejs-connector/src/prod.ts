import { getConfig } from '@edgio/core/config'
import { basename } from 'path'
import { resolve } from 'path'
import { existsSync } from '@edgio/core/utils/fs'

export default async function prod(port: number) {
  const edgioConfig = getConfig()

  // We strip the folder location from entry file name
  // as we always bundle/copy the entry file in the same folder
  const entryFileName = basename(edgioConfig.nodejsConnector?.entryFile!)
  const entryFilePath = resolve(entryFileName)

  if (edgioConfig.nodejsConnector?.entryFile && existsSync(entryFilePath)) {
    process.env[edgioConfig.nodejsConnector!.envPort!] = port.toString()
    process.env.PORT = port.toString()
    // Do not remove webpackIgnore comment in import statement below.
    // it is used to tell webpack to ignore this import and not
    // change it with it's internal logic.
    const server = await import(/* webpackIgnore: true */ entryFilePath)
    return server
  }
}
