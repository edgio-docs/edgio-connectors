/**
 *  This file is copied to lambda folder
 *  and serves Next config based on used properties.
 *  The final next.config.js file is bundled handler file with buildtime version of next.config.js.
 *
 *  DO NOT replace the filenames by constants,
 *  esbuild will not include the files to bundle then.
 */

let config = require('./next.config.buildtime.js')

if (
  Object.keys(config.serverRuntimeConfig ?? {}).length > 0 ||
  Object.keys(config.publicRuntimeConfig ?? {}).length > 0
) {
  let runtimeConfig = require('./next.config.runtime.js')
  runtimeConfig = typeof runtimeConfig === 'function' ? runtimeConfig() : runtimeConfig
  config = {
    ...config,
    serverRuntimeConfig: runtimeConfig.serverRuntimeConfig ?? {},
    publicRuntimeConfig: runtimeConfig.publicRuntimeConfig ?? {},
  }
}
module.exports = config
