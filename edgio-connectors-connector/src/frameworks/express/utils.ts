import { existsSync } from 'fs'
import { join, resolve } from 'path'
import { isPortBound } from '@edgio/core/utils/portUtils'
import chalk from 'chalk' // chalk will be BUNDLED into the prod file, which is NOT IDEAL, but dont want to inject too much

/**
 * Attempts to find the express app entrypoint by looking for common files.
 */
export function findDefaultAppPath() {
  return [
    join('src', 'server.js'),
    join('src', 'server.ts'),
    join('src', 'app.ts'),
    join('src', 'app.js'),
    join('src', 'index.js'),
    join('src', 'index.ts'),
    join('server.js'),
    join('app.js'),
    join('index.js'),
  ].find(path => existsSync(resolve(path)))
}

/**
 * Outputs a warning if the express server module has not claimed the desired port
 * after one second.
 * @param port The port that express should claim
 * @param appPath The path to the express server module
 */
export function warnIfPortUnbound(port: number, appPath: string) {
  setTimeout(async () => {
    const portBound = await isPortBound(port)

    if (!portBound) {
      console.warn(
        `> ${chalk.bold(chalk.yellow('Warning:'))} Express server module loaded from ${chalk.cyan(
          appPath
        )} did not bind to the desired port: ${chalk.cyan(
          port
        )}. Your server should either export an Express app or bind one to the port specified by ${chalk.cyan(
          'process.env.PORT'
        )}.`
      )
    }
  }, 1000)
}

export function warnExpressServerNotFound() {
  console.warn(
    `> ${chalk.yellow(
      'Warning:'
    )} Your Express server module could not be found. Add the following to ${chalk.cyan(
      'edgio.config.js'
    )} to specify the path to your Express server module:`
  )
  console.log('')
  console.log('  express: {')
  console.log("    appPath: './path/to/server.js'")
  console.log('  }')
  console.log('')
}

export function getTemplateConfig() {
  return [
    'express: {',
    '  // The main entry point for your app, which exports an instance of express app.',
    '  // This file and its dependencies will be bundled into a single file for serverless deployment.',
    '  //',
    '  // If omitted, Edgio will try to find your app in one of the following files:',
    '  // - ./src/server.ts',
    '  // - ./src/server.js',
    '  // - ./src/app.ts',
    '  // - ./src/app.js',
    '  // - ./src/index.ts',
    '  // - ./src/index.js',
    '  // - ./server.js',
    '  // - ./app.js',
    '  // - ./index.js',
    '  //',
    '  // Uncomment the line below to specify the path to the app:',
    "  // appPath: './src/app.js',",
    '  // Uncomment the line below to bundle your express app using @vercel/nft to reduce the bundle size and cold start times',
    '  // nft (Node file trace) produces an exploded, tree-shaken bundle with a node_modules directory containing only those modules',
    '  // used by your app.',
    "  // bundler: '@vercel/nft',",
    '  // Uncomment the line below to bundle your express app using @vercel/ncc to reduce the bundle size and cold start times',
    '  // NCC produces an a single-file, tree-shaken bundle containing only those modules used by your app.',
    "  // bundler: '@vercel/ncc',",
    '}',
  ].join('\n')
}
