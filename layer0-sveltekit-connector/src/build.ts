/* istanbul ignore file */
import { BuildOptions, DeploymentBuilder } from '@layer0/core/deploy'
import FrameworkBuildError from '@layer0/core/errors/FrameworkBuildError'
import { join } from 'path'
import { writeFileSync, existsSync, mkdirSync } from 'fs'

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

export default async function build(options: BuildOptions) {
  const { skipFramework } = options

  builder.clearPreviousBuildOutput()

  if (!skipFramework) {
    // run the Sveltekit build
    try {
      await builder.exec('npx svelte-kit build')
    } catch (e) {
      throw new FrameworkBuildError('Sveltekit')
    }
  }

  if (!existsSync(builder.jsDir)) {
    mkdirSync(builder.jsDir)
  }

  writeFileSync(join(builder.jsDir, 'package.json'), JSON.stringify({ name: 'app' }), 'utf8')

  await builder.build()
}
