import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import ConnectorFactory from './utils/ConnectorFactory'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import { join, resolve } from 'path'
import { bundle } from '@edgio/core/deploy/bundle-esbuild'
import bundleWithNft from '@edgio/core/deploy/bundle-nft'
import bundleWithNcc from '@edgio/core/deploy/bundle-ncc'
import { BundlerType } from './utils/types'
import { getConfig } from '@edgio/core'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import chalk from 'chalk'

const appDir = process.cwd()
const SW_SOURCE = resolve(appDir, 'sw', 'service-worker.js')
const SW_DEST = resolve(appDir, '.edgio', 's3', 'service-worker.js')

export default async function build(options: BuildOptions) {
  const connector = ConnectorFactory.get()
  const edgioConfig = getConfig()

  if (!connector.buildCommand) {
    throw new Error(`Connector '@edgio/${connector.name}' doesn't support 'build' command.`)
  }

  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()
  mkdirSync(builder.jsAppDir, {
    recursive: true,
  })

  const buildCommand =
    typeof connector.buildCommand === 'function'
      ? await connector.buildCommand(getConfig(), builder)
      : connector.buildCommand

  if (!options.skipFramework && buildCommand.command) {
    try {
      await builder.exec(buildCommand.command)
    } catch (e) {
      throw new FrameworkBuildError(connector.name, buildCommand.command, e)
    }
  }

  // We need to copy the connector source, as we're importing it dynamically.
  // We do this in order to be able to decide the framework at runtime, not build time,
  // and consequently not have to define additional exports/switch statements.
  let frameworkFileName = connector.name + '.js'
  let frameworkSource = join(__dirname, 'frameworks', frameworkFileName)
  if (!existsSync(frameworkSource)) {
    frameworkFileName = join(connector.name, '/index.js')
    frameworkSource = join(__dirname, 'frameworks', frameworkFileName)
  }

  // We need to specify the target directory, otherwise it SOMETIMES copies the .yalc folder instead of node_modules - therefore we force the proper format.
  const frameworkTarget = join(
    'node_modules',
    '@edgio',
    'connectors',
    'frameworks',
    frameworkFileName
  )
  builder.addInternalJSAsset(frameworkSource, frameworkTarget)

  // We copy build folder
  buildCommand.buildFolder && builder.copySync(buildCommand.buildFolder, builder.jsAppDir)

  // If connector uses service-worker, we build it
  connector.withServiceWorker &&
    (await builder.buildServiceWorker({
      swSrc: SW_SOURCE,
      swDest: SW_DEST,
      ...(connector.withServiceWorker.withGlob
        ? {
            globDirectory: buildCommand.buildFolder,
            globPatterns: ['*.*'],
          }
        : {}),
    }))

  // We add connector-defined assets.
  // NOTE: This needs to be called after the build command.
  await buildCommand.addAssets?.(builder)

  // We add generic assets,
  // build routes.js and collect static assets for serveStatic.
  // NOTE: This needs to be called after addAssets,
  // so we can later use them in serveStatic.
  // For example: Pre-rendered pages in SvelteKit.
  await builder.build()

  const static404Error =
    typeof connector.static404Error === 'function'
      ? connector.static404Error(edgioConfig)
      : connector.static404Error
  const staticFolder =
    typeof connector.staticFolder === 'function'
      ? connector.staticFolder(edgioConfig)
      : connector.staticFolder

  // If specified static 404 error file doesn't exist,
  // we'll create new one to not show ugly error page from S3
  if (static404Error && staticFolder) {
    const static404ErrorPath = resolve(staticFolder, static404Error)
    if (!existsSync(static404ErrorPath)) {
      console.log(`[Edgio] INFO: Static error file not found: ${static404ErrorPath}`)
      console.log(`[Edgio] INFO: Creating new one...`)
      writeFileSync(static404ErrorPath, 'ERROR: 404 - Not Found')
    }
  }

  // If entry file is set, we bundle it so it can be used in serverless
  if (buildCommand.entryFile) {
    // If build folder is specified, we need to resolve entry file relative to build folder,
    // otherwise we resolve it relative to lambda root as build folder would be empty
    const entryFileSrc = resolve(buildCommand.buildFolder ?? '', buildCommand.entryFile)
    const entryFileDest = resolve(builder.jsAppDir, buildCommand.entryFile)

    // If entry file is set but doesn't exist, we throw an error
    if (!existsSync(entryFileSrc)) {
      throw new Error(
        `The file '${buildCommand.entryFile}' configured in 'edgio.config.js' doesn't exist.`
      )
    }

    switch (buildCommand.bundler) {
      case BundlerType.ESBUILD:
        try {
          // We need to print it out here, as esbuild is used in other places, eg. router bunding. Should ideally be improved in the future.
          process.stdout.write('> Bundling your app with esbuild...')
          await bundle({ entryPoints: [entryFileSrc], outfile: entryFileDest })
          process.stdout.write(' done.\n')
        } catch (e: any) {
          if (
            e?.errors?.find((error: any) =>
              error?.text?.startsWith('Top-level await is currently not supported')
            )
          ) {
            console.warn(
              chalk.yellow(
                `WARNING: The '${BundlerType.ESBUILD}' bundler cannot be used with your project, because it doesn't support top-level await. Falling back to '${BundlerType.NFT}' bundler.\r\n`
              )
            )
            await bundleWithNft(entryFileSrc, builder.jsAppDir, entryFileDest)
          } else {
            throw e
          }
        }
        break
      case BundlerType.NFT:
        await bundleWithNft(entryFileSrc, builder.jsAppDir, entryFileDest)
        break
      case BundlerType.NCC:
        await bundleWithNcc(entryFileSrc, builder.jsAppDir, entryFileDest)
        break
      default:
        builder.copySync(entryFileSrc, entryFileDest)
    }
  }
}
