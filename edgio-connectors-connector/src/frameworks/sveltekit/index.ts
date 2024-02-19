import { join } from 'path'
import ConnectorBuilder from '../../utils/ConnectorBuilder'
import fs, { existsSync } from 'fs'
import globby from 'globby'
import { BundlerType } from '../../utils/types'
import { PRERENDERED_PAGES_FOLDER } from './constants'
import { transformConfigFile } from './utils'
import SvelteKitRoutes from './SvelteKitRoutes'

const appDir = process.cwd()

export default new ConnectorBuilder('sveltekit')
  .setInit(() => {
    // we copy service-worker manually, as the approach is different from other frameworks, and requires it to be in the src folder
    fs.copyFileSync(
      join(__dirname, '../../default-apps/service-worker/all/sw/service-worker.js'),
      join(appDir, 'src', 'service-worker.js')
    )
    // we transform config file so it uses edgio adapter
    transformConfigFile()
  })
  .setBuild(() => {
    const outputPath = join('.svelte-kit', 'output')
    const serverPath = join(outputPath, 'server')
    const serverEntrypoint = join(serverPath, 'server.mjs')

    return {
      command: 'npx vite build',
      bundler: BundlerType.NFT,
      entryFile: serverEntrypoint,
      addAssets: async builder => {
        if (!existsSync(outputPath)) {
          throw new Error(
            `Couldn't find the '.svelte-kit/output' folder. Make sure that you're using the @edgio/sveltekit/adapter in 'svelte.config.js'.`
          )
        }

        // Add sveltekit/files/server.mjs file from this package to the .svelte-kit output directory.
        builder.copySync(join(__dirname, 'assets', 'server.mjs'), serverEntrypoint, {
          overwrite: true,
        })

        // Copy the whole folder with Sveltekit server files to Edgio output directory
        builder.addJSAsset(serverPath)

        // We need to transform .html files to directories with index.html inside,
        // which can be served from S3 as static pages.
        // Example: /about.html => /about/index.html
        const prerenderedPagesPath = join(outputPath, 'prerendered', 'pages')
        globby
          .sync('**/*.html', {
            onlyFiles: true,
            cwd: prerenderedPagesPath,
          })
          .forEach((file: string) => {
            const src = join(prerenderedPagesPath, file)

            // For non-index HTML files, create a directory with the same name as the file
            // and index inside it. Index files are a special case.
            // The path "/" should map to "/index.html", not "/index/index.html"
            const destFile = !file.match(/index\.(html)$/)
              ? file.replace(/\.html$/, '/index.html')
              : file

            // We put all prerendered pages to ".edgio/tmp/prerendered_pages" folder
            // and later in SvelteKitRoutes.ts we serve them from S3.
            const dest = join(builder.tempDir, PRERENDERED_PAGES_FOLDER, destFile)

            builder.copySync(src, dest)
          })
      },
    }
  })
  .setProd({ serverPath: join('.svelte-kit', 'output', 'server', 'server.mjs') })
  .setDev({
    command: port => `npx vite dev --port ${port}`,
    ready: [/ready in/i],
  })
  .setOnRegister(router => router.use(new SvelteKitRoutes()))
  .withServerless()
  .toConnector()
