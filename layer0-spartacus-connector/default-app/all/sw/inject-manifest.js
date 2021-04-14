// Script that modifies the service-worker.js configuration using workbox-build
// Reference: https://developers.google.com/web/tools/workbox/modules/workbox-build

const { getBuildPath } = require('@layer0/angular/utils/getBuildPath')
const { injectManifest } = require('workbox-build')
const { join } = require('path')
const swSrc = join(__dirname, '..', 'dist', '__layer0__', 'service-worker.js')

injectManifest({
  swSrc,
  swDest: swSrc,
  globDirectory: getBuildPath(),
  globPatterns: ['*.{css,js}'],
  globFollow: true, // follow symlinks
  globStrict: true, // fail the build if anything goes wrong while reading the files
  globIgnores: [`**/*-es5.*.js`],
  dontCacheBustURLsMatching: new RegExp('.+.[a-f0-9]{20}..+'), // Look for a 20 character hex string in the file names. This allows us to avoid using cache busting for Angular files because Angular already takes care of that!
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4Mb
}).then(({ count, size }) => {
  console.log(`Generated service worker, which will precache ${count} files (${size} bytes)`)
})
