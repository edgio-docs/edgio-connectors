/*
  Only node build-in modules and connector imports are allowed. All other imports have to be dynamic.
*/
import nextRuntimeConfigExists from './util/nextRuntimeConfigExists'

export = function withEdgio(_nextConfig: any) {
  // We just return received config when the runtime version of next.config.js file already exists
  if (nextRuntimeConfigExists()) return _nextConfig

  // This code is executed only during the build of next.config.js file and when app is running in development mode.
  // Do not change this dynamic import to static one.
  const { default: applyPlugins } = require('./plugins/applyPlugins')
  return applyPlugins(_nextConfig)
}
