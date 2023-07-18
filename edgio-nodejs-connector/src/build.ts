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

  if (edgioConfig.nodejsConnector?.buildCommand && !options.skipFramework) {
    try {
      await builder.exec(edgioConfig.nodejsConnector.buildCommand)
    } catch (e) {
      throw new FrameworkBuildError('NodejsConnector', edgioConfig.nodejsConnector.buildCommand, e)
    }
  }

  if (edgioConfig.nodejsConnector?.buildFolder) {
    builder.copySync(edgioConfig.nodejsConnector.buildFolder, builder.jsDir)
  }

  if (edgioConfig.nodejsConnector?.entryFile) {
    builder.addJSAsset(edgioConfig.nodejsConnector.entryFile)
  }

  if (edgioConfig.nodejsConnector?.buildFolder) {
    await builder.buildServiceWorker({
      swSrc: SW_SOURCE,
      swDest: SW_DEST,
      globDirectory: edgioConfig.nodejsConnector.buildFolder,
    })
  }

  await builder.build()
}
