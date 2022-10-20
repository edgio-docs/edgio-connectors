const webpack = require('webpack')
const { join } = require('path')

module.exports = {
  target: 'node',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: join(__dirname, 'service-worker.js'),
  resolve: { extensions: ['.js', '.ts'] },
  output: {
    path: join(__dirname, '..', 'dist', '__edgio__'),
    filename: 'service-worker.js',
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      EDGIO_PREFETCH_CACHE_NAME: 'prefetch',
      EDGIO_PREFETCH_HEADER_VALUE: '1',
      NODE_ENV: 'production',
    }),
  ],
}
