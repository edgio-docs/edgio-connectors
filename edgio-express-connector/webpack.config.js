const path = require('path')

module.exports = {
  target: 'node',
  entry: {
    prod: './src/prod.ts',
  },
  mode: 'production',
  optimization: {
    minimize: false,
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
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd',
  },
}
