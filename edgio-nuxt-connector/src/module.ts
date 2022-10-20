/* istanbul ignore file */
import CreateServiceWorkerPlugin from './sw/CreateServiceWorkerPlugin'
import { join } from 'path'
import { existsSync } from 'fs'

export default function edgioNuxtModule(this: any, { edgioSourceMaps = false } = {}) {
  this.extendBuild((config: any, { isClient = false, isServer = false }) => {
    if (isClient) {
      config.plugins.push(new CreateServiceWorkerPlugin())
    }

    if (isServer && edgioSourceMaps && process.env.NODE_ENV === 'production') {
      // Enable sourcemap for meaningful stack trace in Edgio Log Streamer
      // We force the 'source-map' value as this is what we expect to consume on
      // our lambda insfrastructure
      config.devtool = 'source-map'
    }
  })

  this.options.plugins.push({
    src: join(__dirname, 'sw', 'InstallServiceWorkerPlugin.js'),
    ssr: false,
  })

  const devtoolsWidgetInstallScript = join(
    process.cwd(),
    'node_modules',
    '@edgio',
    'devtools',
    'widget',
    'install.js'
  )

  if (existsSync(devtoolsWidgetInstallScript)) {
    this.options.plugins.push({
      src: devtoolsWidgetInstallScript,
      ssr: false,
    })
  }
}
