export const withEdgio = require('../withEdgio') // we use require here for backwards compatibility since withEdgio has always used `export =` instead of `export default`

// This function was preserved for backwards compatibility
export const withServiceWorker = (_nextConfig: any) => {
  // We want to note somewhere that this function was called from next.config.js
  // and show warning in the build log only once
  process.env.WITH_SERVICE_WORKER_APPLIED = 'true'
  return _nextConfig
}
