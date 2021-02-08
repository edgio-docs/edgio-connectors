const path = require('path')

module.exports = {
  target: 'node',
  entry: {
    prod: './src/prod.js',
  },
  mode: 'production',
  resolve: {
    extensions: ['.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd',
  },
}
