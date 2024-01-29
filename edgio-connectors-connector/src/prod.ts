import { resolve } from 'path'
import ConnectorFactory from './utils/ConnectorFactory'
import { existsSync } from 'fs'
import { getConfig } from '@edgio/core/config'

export default async function prod(port: number) {
  const config = getConfig()
  const connector = ConnectorFactory.get()

  if (!connector.prodCommand) {
    // If connector doesn't support prod, we expect it to be fully static
    return
  }

  // Command in a handler form serves as an option to do any ASYNC handling before the server spinup, eg. set ports, etc.
  const command =
    typeof connector.prodCommand === 'function'
      ? await connector.prodCommand(config, port)
      : connector.prodCommand

  process.env.PORT = port.toString()

  if (!command.serverPath) {
    return
  }

  const appFilePath = resolve(command.serverPath)

  // If serverPath exist, run it
  if (existsSync(appFilePath)) {
    // @ts-ignore
    // We need to use 'import()' with 'file://' prefix here as a workaround for Windows systems.
    const module = await import(/* webpackIgnore: true */ `file://${appFilePath}`)
    command.run && (await command.run(module?.default?.default || module?.default || module))
    return module
  }
}
