import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import { join } from 'path'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import { nodeFileTrace } from '@vercel/nft'
import globby from 'globby'

interface BuilderOptions {
  apiDistDir: string
  webDistDir: string
  /**
   * The command to use to build the RedwoodJS app
   */
  buildCommand: string
}

/**
 * Creates a build entrypoint for a connector
 * @param param0
 */
export default function createBuildEntryPoint({
  apiDistDir,
  webDistDir,
  buildCommand,
}: BuilderOptions) {
  const builder = new DeploymentBuilder(process.cwd())
  const apiDistDirAbsolute = join(process.cwd(), apiDistDir)
  const webDistDirAbsolute = join(process.cwd(), webDistDir)

  return async function build(options: BuildOptions) {
    const { skipFramework } = options
    builder.clearPreviousBuildOutput()

    if (!skipFramework) {
      // clear api and web dist directories
      builder.emptyDirSync(apiDistDirAbsolute)
      builder.emptyDirSync(webDistDirAbsolute)

      try {
        // run the Redwood build
        await builder.exec(buildCommand)
      } catch (e) {
        throw new FrameworkBuildError('RedwoodJS', buildCommand, e)
      }
    }

    builder.addJSAsset(join(process.cwd(), 'redwood.toml'))
    builder.addJSAsset(join(process.cwd(), '.redwood'))

    await builder.build()

    // web dist resources
    builder.addJSAsset(webDistDir)

    // api dist functions and dependencies
    const functionsDir = join(apiDistDirAbsolute, 'functions')
    const filesToBePacked = globby
      .sync('**/*.js', {
        onlyFiles: true,
        cwd: functionsDir,
      })
      .map(path => join(functionsDir, path))

    const { fileList } = await nodeFileTrace(filesToBePacked)
    fileList.unshift('.env.defaults')

    fileList.forEach(file => builder.copySync(file, join(builder.edgioDir, 'lambda', file)))
  }
}
