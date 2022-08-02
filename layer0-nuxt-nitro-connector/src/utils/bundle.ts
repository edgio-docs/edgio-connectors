import { build, BuildOptions } from 'esbuild'

// Note: this is copied from core, we should consider
// adding another package for common tooling

export async function bundle(options: BuildOptions = {}) {
  // Always exclude fsevents as it cannot be bundled - it's binary.
  const external = ['fsevents']


  const esBuildDefaults: BuildOptions = {
    bundle: true,
    minify: true,
    platform: 'browser',
    target: 'es2016',
    sourcemap: false,
    external,
  }

  await build({
    ...esBuildDefaults,
    ...options,
  })
}
