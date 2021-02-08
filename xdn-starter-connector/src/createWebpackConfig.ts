import webpack from 'webpack'
import { resolve } from 'path'

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
    entry: {
      browser: './src/browser.ts',
      'service-worker': './src/service-worker.ts',
    },
    mode: 'development',
    module: {
      rules: [
        {
          test: /\.ts?$/,
          use: 'ts-loader',
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
    ...overrides,
  }
}
