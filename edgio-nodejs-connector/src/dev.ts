import { resolve } from 'path'
import { createDevServer } from '@edgio/core/dev'
import { DeploymentBuilder } from '@edgio/core/deploy'
import { getConfig } from '@edgio/core/config'

const appDir = process.cwd()
const SW_SOURCE = resolve(appDir, 'sw', 'service-worker.js')

export default async function () {
  await new DeploymentBuilder().watchServiceWorker(SW_SOURCE)

  const edgioConfig = getConfig()
  const ready =
    typeof edgioConfig.nodejsConnector!.devReadyMessageOrTimeout === 'number'
      ? edgioConfig.nodejsConnector!.devReadyMessageOrTimeout
      : [new RegExp(edgioConfig.nodejsConnector!.devReadyMessageOrTimeout!)]

  return createDevServer({
    label: 'NodejsConnector',
    command:
      edgioConfig.nodejsConnector!.devCommand === ''
        ? undefined
        : port => {
            process.env[edgioConfig.nodejsConnector!.envPort!] = port.toString()
            return edgioConfig.nodejsConnector!.devCommand!
          },
    ready,
  })
}
