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
    typeof edgioConfig.customConnector!.devReadyMessageOrTimeout === 'number'
      ? edgioConfig.customConnector!.devReadyMessageOrTimeout
      : [new RegExp(edgioConfig.customConnector!.devReadyMessageOrTimeout!)]

  return createDevServer({
    label: 'CustomConnector',
    command: port => edgioConfig.customConnector!.devCommand!,
    ready,
  })
}
