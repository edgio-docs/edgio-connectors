import { build, WatchMode } from 'esbuild'
import { esbuildPluginBrowserslist } from 'esbuild-plugin-browserslist'
import browserslist from 'browserslist'
import { join, resolve } from 'path'

export const OUTPUT_DIR = resolve(process.cwd(), 'dist')

export default async function bundle(watch?: WatchMode) {
  await build({
    entryPoints: [join('src', 'browser.ts'), join('src', 'service-worker.ts')],
    bundle: true,
    minify: process.env.NODE_ENV === 'production',
    outdir: OUTPUT_DIR,
    watch,
    define: {
      process: JSON.stringify({
        env: {
          NODE_ENV: process.env.NODE_ENV || 'development',
        },
      }),
    },
    plugins: [esbuildPluginBrowserslist(browserslist(), { printUnknownTargets: false })],
  })
}
