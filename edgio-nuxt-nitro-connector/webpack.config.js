const path = require('path')

module.exports = {
  target: 'node',
  entry: {
    prod: './src/prod.ts',
  },
  mode: 'production',
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
      '@edgio/core': '@edgio/core/dist/',
      '@edgio/cli': '@edgio/cli/dist/',
    },
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd',
  },
}
