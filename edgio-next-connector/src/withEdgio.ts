/*
  Only node build-in modules and connector imports are allowed. All other imports have to be dynamic.
*/
import { resolve } from 'path'
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'
import { isCloud, isProductionBuild } from '@edgio/core/environment'

export = function withEdgio(_nextConfig: any) {
  // We just return received config when we run in production mode and app is running in cloud,
  // because the plugins were already applied during the build of next.config.js file.
  if (isProductionBuild() && isCloud()) return _nextConfig

  // This code is executed only during the build of next.config.js file and when app is running in development mode.
  // Do not change this dynamic import to static one.
  //
  // NOTE: webpackIgnore: true works only with import func, not with require, and this function can't be async.
  // Webpack config option 'external' still moves this import to the top of the file, so it's not dynamic anymore.
  // That's why we use nonWebpackRequire here.
  const { default: applyPlugins } = nonWebpackRequire(resolve(__dirname, 'plugins', 'applyPlugins'))
  return applyPlugins(_nextConfig)
}
