const path = require('path')
const fs = require('fs')
// const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const frameworkEntrypoints = {}

// We need to build all of the framework configuration, as they might containg LIGHT imports.
// This is done as we need to import them during spinup / router registration.
fs.readdirSync('./src/frameworks').forEach(fileName => {
  const isFolder = fileName.indexOf('.ts') === -1
  // Warning: the key defines nested path in the dist folder!
  frameworkEntrypoints['frameworks/' + fileName.split('.')[0] + (isFolder ? '/index' : '')] =
    './src/frameworks/' + (isFolder ? fileName + '/index.ts' : fileName)
})

console.log('Webpack framework entrypoints detected:', frameworkEntrypoints)

module.exports = {
  target: 'node',
  entry: {
    prod: './src/prod.ts',
    ...frameworkEntrypoints,
  },
  mode: 'production',
  optimization: {
    // We need to skip this, as the framework connectors might be used in dev mode.
    // If enabled, webpack will replace process.env.NODE_ENV with "production" (or "development") at compile time.
    nodeEnv: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@edgio/core': path.resolve(__dirname, '..', 'core', 'dist'), // using the same approach as everywhere else, stating that files are missing
      '@edgio/cli': '@edgio/cli/dist/',
    },
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd',
  },
  plugins: [
    // Uncommenting will show website with bundle sizes per connector
    // new BundleAnalyzerPlugin()
  ],
}
