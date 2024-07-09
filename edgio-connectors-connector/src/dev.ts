import createDevServer from '@edgio/core/dev/createDevServer'
import ConnectorFactory from './utils/ConnectorFactory'
import { resolve } from 'path'
import { DeploymentBuilder } from '@edgio/core/deploy'
import { getConfig } from '@edgio/core'

const appDir = process.cwd()
const SW_SOURCE = resolve(appDir, 'sw', 'service-worker.js')

export default async function dev() {
  const config = getConfig()
  const connector = ConnectorFactory.get()

  if (!connector.devCommand) {
    throw new Error(`Connector '${connector.name}' doesn't support 'dev' command.`)
  }

  connector.withServiceWorker && (await new DeploymentBuilder().watchServiceWorker(SW_SOURCE))

  const options =
    typeof connector.devCommand === 'function'
      ? await connector.devCommand(config)
      : connector.devCommand

  return createDevServer({
    ...options,
    label: options.label ?? connector.name[0].toUpperCase() + connector.name.substring(1),
    ready: options.ready ?? [/localhost:/i],
  })
}
