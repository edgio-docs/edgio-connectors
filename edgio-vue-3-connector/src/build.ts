/* istanbul ignore file */
import path from 'path'
import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

const { resolveConfig } = require('vite')

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  try {
    const viteUserConfig = await resolveConfig({ mode: 'production' }, 'build', 'production')
    const viteConfig = {
      outDir: viteUserConfig?.build?.outDir ?? path.join(process.cwd(), 'dist'),
    }
    viteConfig['outDir'] = path.relative(process.cwd(), viteConfig['outDir'])
    builder.writeFileSync(path.join(builder.jsDir, 'vite.config.json'), JSON.stringify(viteConfig))
  } catch (e) {
    console.log('> Tried loading vite config via resolveConfig method.\n')
    console.log(e)
  }

  if (!options.skipFramework) {
    const command = process.env.PACKAGE_JSON_BUILD ? 'npm run build' : 'npx vite build'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Vue 3', command, e)
    }
  }

  await builder.build()
}
