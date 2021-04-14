import webpack from 'webpack'
import { InjectManifest } from 'workbox-webpack-plugin'
import { join, resolve } from 'path'
import globby from 'globby'

export const OUTPUT_DIR = resolve(process.cwd(), 'dist')

/**
 * Creates the webpack config for browser.js and service-worker.js
 * @param overrides
 */
export default function createWebpackConfig(
  overrides: Partial<webpack.Configuration> = {}
): webpack.Configuration {
  return {
    stats: 'errors-warnings',
    mode: 'development',
    module: {
      rules: [
        {
          test: /\.js?$/,
          use: 'babel-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      filename: '[name].js',
      path: OUTPUT_DIR,
    },
    plugins: [
      new InjectManifest({
        swSrc: resolve(process.cwd(), 'sw', 'service-worker.js'),
        swDest: 'service-worker.js',
        include: [join('build', 'static')],
        additionalManifestEntries: globby
          .sync(join('**', '*'), { cwd: join('dist', 'assets') })
          .map(file => {
            const url = `/assets/${file}`
            const revision = file.split(/\./).reverse()[1]
            return { url, revision }
          }),
      }),
    ],
    ...overrides,
  }
}
