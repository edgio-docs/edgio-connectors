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
      fallback: {
        process: 'process/browser',
      },
    },
    output: {
      filename: '[name].js',
      path: OUTPUT_DIR,
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      }),
    ],
    ...overrides,
  }
}
