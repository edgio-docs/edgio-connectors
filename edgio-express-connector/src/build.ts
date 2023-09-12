import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import { bundle as bundleWithEsBuild } from '@edgio/core/deploy/bundle-esbuild'
import bundleWithNft from '@edgio/core/deploy/bundle-nft'
import bundleWithNcc from '@edgio/core/deploy/bundle-ncc'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { findDefaultAppPath } from './utils'
import { getConfig } from '@edgio/core/config'
import { BUNDLER_TYPES, ExtendedConfig } from './types'
import chalk from 'chalk'

export default async function build(_options: BuildOptions) {
  const edgioConfig = getConfig() as ExtendedConfig
  const builder = new DeploymentBuilder()
  const appPath = edgioConfig?.express?.appPath || findDefaultAppPath()
  let bundler = edgioConfig?.express?.bundler || BUNDLER_TYPES.esbuild
  const outDir = join(builder.jsAppDir)
  const outFile = appPath || 'index.js'

  builder.clearPreviousBuildOutput()
  mkdirSync(builder.jsAppDir, {
    recursive: true,
  })

  if (!appPath) {
    throw new Error(
      "Your express app could not be bundled for deployment because no app entry point was found. Please add the path to your express app's main JS file to the express.appPath array in edgio.config.js. For example:\n\n" +
        'module.exports = {\n' +
        '  express: {\n' +
        "    appPath: './src/app.js'\n" +
        '  }\n' +
        '}'
    )
  }

  if (!existsSync(appPath)) {
    throw new Error(
      `file "${appPath}" referenced in express.appPath config of edgio.config.js does not exist.`
    )
  }

  if (!Object.values(BUNDLER_TYPES).includes(bundler)) {
    throw new Error(
      `The bundler "${bundler}" option in express.bundler config of edgio.config.js is not supported.\r\nPossible values are: ${Object.values(
        BUNDLER_TYPES
      ).join(', ')}`
    )
  }

  if (bundler === 'esbuild') {
    try {
      process.stdout.write('> Bundling your app with esbuild...')

      // When using esbuild, we'll always transpile code to commonjs
      // to avoid issues with dynamic imports of std lib modules.
      await bundleWithEsBuild({ entryPoints: [appPath], outfile: join(outDir, outFile) })

      // We need to override any existing package.json file to one with type: commonjs
      builder.writeFileSync(
        join(builder.jsAppDir, 'package.json'),
        JSON.stringify({
          type: 'commonjs',
        })
      )

      process.stdout.write(' done.\n')
    } catch (e: any) {
      if (
        e?.errors?.find((error: any) =>
          error?.text?.startsWith('Top-level await is currently not supported')
        )
      ) {
        console.warn(
          chalk.yellow(
            `WARNING: The '${BUNDLER_TYPES.esbuild}' bundler cannot be used with your project, because it doesn't support top-level await. Falling back to '${BUNDLER_TYPES.vercelNft}' bundler.\r\n` +
              `Please set express.bundler property to '${BUNDLER_TYPES.vercelNft}' in 'edgio.config.js' file.`
          )
        )
        bundler = BUNDLER_TYPES.vercelNft
      } else {
        throw e
      }
    }
  }
  if (bundler === BUNDLER_TYPES.vercelNft) {
    await bundleWithNft(appPath, outDir, outFile)
  }
  if (bundler === BUNDLER_TYPES.vercelNcc) {
    await bundleWithNcc(appPath, outDir, outFile)
  }

  await builder.build()
}
