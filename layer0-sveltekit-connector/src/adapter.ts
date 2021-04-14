/* istanbul ignore file */
import { renameSync } from 'fs'
import { resolve, join } from 'path'

export = function createAdapter() {
  const adapter = {
    name: '@sveltejs/adapter-layer0',

    async adapt(utils: any) {
      const outputDir = resolve('.layer0')
      const jsDir = join(outputDir, 'lambda')
      const staticDir = join(outputDir, 's3-permanent')
      const serverDir = join(jsDir, '__backends__')

      utils.log.minor('Writing client application...')
      utils.copy_static_files(staticDir)
      utils.copy_client_files(staticDir)

      utils.log.minor('Building lambda...')
      utils.copy_server_files(serverDir)
      renameSync(join(serverDir, 'app.js'), join(serverDir, 'app.mjs'))
      utils.copy(join(__dirname, 'files'), jsDir)

      utils.log.minor('Prerendering static pages...')
      await utils.prerender({ dest: staticDir })
    },
  }

  return adapter
}
