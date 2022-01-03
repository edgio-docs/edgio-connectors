/* istanbul ignore file */
import { writeFileSync } from 'fs'
import { resolve, join } from 'path'
const esbuild = require('esbuild')

export = function createAdapter() {
  const adapter = {
    name: '@sveltejs/adapter-layer0',

    async adapt({ utils }: { utils: any }) {
      const outputDir = resolve('.layer0')
      const jsDir = join(outputDir, 'lambda')
      const staticDir = join(outputDir, 's3-permanent')
      const files = join(__dirname, 'files')

      utils.copy(join(files, 'entry.js'), '.layer0/entry.js')

      await esbuild.build({
        entryPoints: ['.layer0/entry.js'],
        outfile: join(jsDir, 'index.js'),
        bundle: true,
        inject: [join(files, 'shims.js')],
        platform: 'node',
      })

      writeFileSync(join(jsDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))

      utils.log.minor('Prerendering static pages...')
      await utils.prerender({ dest: staticDir })

      utils.log.minor('Copying assets...')
      utils.copy_static_files(staticDir)
      utils.copy_client_files(staticDir)

      utils.log.minor('Writing routes...')
      utils.copy(join(files, 'routes.json'), join(jsDir, 'config/routes.json'))
    },
  }

  return adapter
}
