import { join } from 'path'
import webpack from 'webpack'

/**
 * Bundles the Razzle server as a single serverless function.
 * @param destDir
 * @returns
 */
export default function bundle(destDir: string) {
  const webpackConfig: webpack.Configuration = {
    stats: 'errors-warnings',
    entry: {
      server: join(process.cwd(), 'build', 'server.js'),
    },
    output: {
      path: destDir,
      libraryTarget: 'umd',
    },
    resolve: {
      extensions: ['.js'],
    },
    target: 'node',
    mode: 'production',
  }

  return new Promise((resolve, reject) => {
    webpack(webpackConfig, (err, stats) => (err ? reject(err) : resolve(stats)))
  })
}
