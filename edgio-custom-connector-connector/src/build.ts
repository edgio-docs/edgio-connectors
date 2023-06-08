import { resolve } from 'path'
import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import { getConfig } from '@edgio/core/config'

const appDir = process.cwd()
const SW_SOURCE = resolve(appDir, 'sw', 'service-worker.js')
const SW_DEST = resolve(appDir, '.edgio', 's3', 'service-worker.js')

module.exports = async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  const edgioConfig = getConfig()

  if (edgioConfig.customConnector?.buildCommand && !options.skipFramework) {
    try {
      await builder.exec(edgioConfig.customConnector.buildCommand)
    } catch (e) {
      throw new FrameworkBuildError('CustomConnector', edgioConfig.customConnector.buildCommand, e)
    }
  }

  if (edgioConfig.customConnector?.buildFolder) {
    builder.copySync(edgioConfig.customConnector.buildFolder, builder.jsDir)
  }

  if (edgioConfig.customConnector?.entryFile) {
    builder.addJSAsset(edgioConfig.customConnector.entryFile)
  }

  if (edgioConfig.customConnector?.buildFolder) {
    await builder.buildServiceWorker({
      swSrc: SW_SOURCE,
      swDest: SW_DEST,
      globDirectory: edgioConfig.customConnector.buildFolder,
    })
  }

  await builder.build()
}
