/* istanbul ignore file */
import { BuildOptions, DeploymentBuilder } from '@edgio/core/deploy'
import FrameworkBuildError from '@edgio/core/errors/FrameworkBuildError'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import bundleWithNft from '@edgio/core/deploy/bundle-nft'
import globby from 'globby'
import { PRERENDERED_PAGES_FOLDER } from './constants'

const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)

export default async function build(options: BuildOptions) {
  const { skipFramework } = options

  builder.clearPreviousBuildOutput()

  if (!skipFramework) {
    const command = 'npx vite build'
    // run the Sveltekit build
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Sveltekit', command, e)
    }
  }

  if (!existsSync(builder.jsAppDir)) {
    mkdirSync(builder.jsAppDir, {
      recursive: true,
    })
  }

  const outputPath = join('.svelte-kit', 'output')
  const serverPath = join(outputPath, 'server')
  const serverEntrypoint = join(serverPath, 'server.mjs')

  // Add sveltekit/files/server.mjs file from this package to the .svelte-kit output directory.
  builder.copySync(join(__dirname, 'files', 'server.mjs'), serverEntrypoint, {
    overwrite: true,
  })

  // Copy the whole folder with Sveltekit server files to Edgio output directory
  builder.addJSAsset(serverPath)

  // Trace and copy required node_modules
  await bundleWithNft(serverEntrypoint, builder.jsAppDir, serverEntrypoint)

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
      const destFile = !file.match(/index\.(html)$/) ? file.replace(/\.html$/, '/index.html') : file

      // We put all prerendered pages to ".edgio/tmp/prerendered_pages" folder
      // and later in SvelteKitRoutes.ts we serve them from S3.
      const dest = join(builder.tempDir, PRERENDERED_PAGES_FOLDER, destFile)

      builder.copySync(src, dest)
    })

  await builder.build()
}
