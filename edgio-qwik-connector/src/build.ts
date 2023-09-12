/* istanbul ignore file */
import { join, resolve } from 'path'
import fs from 'fs'
import { nodeFileTrace } from '@vercel/nft'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

const appDir = process.cwd()

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  if (!options.skipFramework) {
    const command = 'npx qwik build'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Qwik', command, e)
    }
  }

  await builder.build()

  const serverFilePath = resolve(join(appDir, 'server', 'entry.express.js'))

  if (fs.existsSync(serverFilePath)) {
    console.log('> Found server/entry.express.js!')

    // Bundle the server folder per
    // https://qwik.builder.io/integrations/deployments/node/#production-deploy:~:text=The-,server,-folder%20will%20be
    builder.addJSAsset(join(appDir, 'server'))

    console.log('> Bundling dependencies for the appPath:', serverFilePath)

    // Get the node_modules required for running the server on serverless
    const { fileList } = await nodeFileTrace([serverFilePath])
    fileList.forEach((file: string) => builder.copySync(file, join(builder.jsAppDir, file)))

    console.log('> Done...')
  } else {
    console.log(
      "> We recommend you to follow [Qwik's Node Guide](https://qwik.builder.io/integrations/deployments/node/) first."
    )
  }
}
