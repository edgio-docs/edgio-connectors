const path = require('path')
const webpack = require('webpack')

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
      {
        test: /.js$/,
        use: 'babel-loader',
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
  plugins: [
    new webpack.DefinePlugin({
      __non_webpack_import__: 'import',
    }),
  ],
}
