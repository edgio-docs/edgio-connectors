import { existsSync } from 'fs'
import { createServer } from 'http'
import { getConfig } from '@edgio/core/config'

export default function prod(port: number) {
  const edgioConfig = getConfig()

  if (
    edgioConfig.customConnector?.entryFile &&
    existsSync(edgioConfig.customConnector?.entryFile!)
  ) {
    process.env[edgioConfig.customConnector!.envPort!] = port.toString()
    process.env.PORT = port.toString()
    const server = require(edgioConfig.customConnector?.entryFile).default
    return new Promise<void>(resolve => createServer(server).listen(port, resolve))
  }
}
