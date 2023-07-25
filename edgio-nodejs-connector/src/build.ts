import { basename, resolve } from 'path'
import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import { getConfig } from '@edgio/core/config'
import { bundle } from '@edgio/core/deploy/bundle-esbuild'

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

  const buildFolder = edgioConfig.nodejsConnector?.buildFolder ?? ''
  const entryFile = edgioConfig.nodejsConnector?.entryFile ?? ''

  if (buildFolder !== '') {
    builder.copySync(buildFolder, builder.jsDir)

    await builder.buildServiceWorker({
      swSrc: SW_SOURCE,
      swDest: SW_DEST,
      globDirectory: buildFolder,
    })
  }

  if (entryFile !== '') {
    // If build folder is specified, we need to resolve entry file
    // relative to build folder, otherwise we resolve it relative to lambda root
    // as build folder would be empty
    const entryFileSrc = resolve(buildFolder, entryFile)
    const entryFileDest = resolve(builder.jsDir, basename(entryFile))

    if (edgioConfig.nodejsConnector?.bundleEntryFile === true) {
      await bundle({ entryPoints: [entryFileSrc], outfile: entryFileDest })
    } else {
      builder.copySync(entryFileSrc, entryFileDest)
    }
  }

  await builder.build()
}
