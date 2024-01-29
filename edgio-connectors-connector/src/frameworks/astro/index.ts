import ConnectorBuilder from '../../utils/ConnectorBuilder'
import AstroRoutes from './AstroRoutes'
import { BundlerType } from '../../utils/types'
import { ExtendedConfig } from './types'
import { createAstroBuiltConfig } from './configUtils'

const appDir = process.cwd()

export default new ConnectorBuilder('astro')
  .setTemplateConfig(
    [
      'astro: {',
      '  // The path of the standalone server that runs Astro SSR',
      '  // The dependencies for this file are automatically bundled',
      "  // appPath: join('dist', 'server', 'entry.mjs')",
      '},',
    ].join('\n')
  )
  .setBuild(async (edgioConfig: ExtendedConfig, builder) => {
    // Create astro.config.json file that can
    // be later load synchronously using getAstroBuiltConfig function.
    await createAstroBuiltConfig(appDir)

    return {
      command: 'npx astro build',
      bundler: BundlerType.NFT,
      entryFile: edgioConfig?.astro?.appPath,
    }
  })
  .setProd(async (edgioConfig, _port) => {
    const appPath = edgioConfig?.astro?.appPath

    // If appPath is set inside edgio.config.js, then use that
    // to start the server.
    if (appPath) {
      return { serverPath: appPath }
    }

    // If the output is set to 'static', then we'll
    // just return undefined as we don't need to start a server.
    return { serverPath: undefined }
  })
  .setDev({
    command: port => `npx astro dev --port ${port} --host`,
    ready: [/Local/i],
  })
  .setOnRegister(router => router.use(new AstroRoutes()))
  .withServiceWorker()
  .toConnector()
