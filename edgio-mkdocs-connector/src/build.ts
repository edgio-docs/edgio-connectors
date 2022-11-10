import { DeploymentBuilder, BuildOptions } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'

export default async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  if (!options.skipFramework) {
    const command = 'mkdocs build'
    try {
      await builder.exec(command)
    } catch (e) {
      console.log('> Encountered the following error with `mkdocs build`.')
      console.log(e)
      try {
        console.log('\n> Attempting to building the app with `python -m mkdocs build`.')
        await builder.exec(`python -m ${command}`)
      } catch (e2) {
        console.log('> Encountered the following error with `python -m mkdocs build`.')
        console.log(e2)
        try {
          console.log('\n> Attempting to building the app with `python3 -m mkdocs build`.')
          await builder.exec(`python3 -m ${command}`)
        } catch (e3) {
          throw new FrameworkBuildError('MkDocs', command, e3)
        }
      }
    }
  }

  await builder.build()
}
