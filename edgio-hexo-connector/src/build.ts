import { join } from 'path'
import { existsSync } from 'fs'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import loadHexoConfig from './loadHexoConfig'

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  if (!options.skipFramework) {
    const command = 'npx hexo generate'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Hexo', command, e)
    }
  }

  const configPath = join(process.cwd(), '_config.yml')
  if (existsSync(configPath)) {
    builder.addJSAsset(configPath)
  } else {
    console.warn(
      `> _config.yml not found in the project's root directory.\n> _config.yml is used by Edgio to support hexo's 'public_dir' config.`
    )
  }

  const publicDir = loadHexoConfig()?.public_dir ?? 'public'
  // Copy 404 error page from this connector by default
  builder.copySync(
    join(__dirname, 'default-app', '404.html'),
    join(process.cwd(), publicDir, '404.html')
  )

  await builder.build()
}
