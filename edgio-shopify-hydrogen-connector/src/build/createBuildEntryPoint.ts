import { join } from 'path'
import { nodeFileTrace } from '@vercel/nft'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

interface BuilderOptions {
  /**
   * The command to use to build the Shopify Hydrogen app
   */
  buildCommand: string
}

/**
 * Creates a build entrypoint for a connector
 * @param param0
 */
export default function createBuildEntryPoint({ buildCommand }: BuilderOptions) {
  const appDir = process.cwd()
  const builder = new DeploymentBuilder(appDir)

  return async function build(options: BuildOptions) {
    const { skipFramework } = options
    builder.clearPreviousBuildOutput()

    try {
      if (!skipFramework) {
        await builder.exec(buildCommand)
      }
      builder.addJSAsset(join(appDir, 'dist'))
      await builder.build()
    } catch (e) {
      throw new FrameworkBuildError('Shopify Hydrogen', buildCommand, e)
    }

    const { fileList } = await nodeFileTrace([join(appDir, 'dist', 'node', 'index.js')])

    fileList.forEach((file: string) =>
      builder.copySync(file, join(builder.edgioDir, 'lambda', file))
    )
  }
}
