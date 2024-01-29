import { join, resolve } from 'path'
import ConnectorBuilder from '../../utils/ConnectorBuilder'
import fs from 'fs'

export default new ConnectorBuilder('qwik')
  .setBuild({
    command: 'npx qwik build',
    addAssets: async builder => {
      const { nodeFileTrace } = await import(/* webpackIgnore: true */ '@vercel/nft')

      const serverFilePath = resolve(join(builder.appDir, 'server', 'entry.express.js'))

      if (fs.existsSync(serverFilePath)) {
        console.log('> Found server/entry.express.js!')

        // Bundle the server folder per
        // https://qwik.builder.io/integrations/deployments/node/#production-deploy:~:text=The-,server,-folder%20will%20be
        builder.addJSAsset(join(builder.appDir, 'server'))

        console.log('> Bundling dependencies for the appPath:', serverFilePath)

        // Get the node_modules required for running the server on serverless
        const { fileList } = await nodeFileTrace([serverFilePath])
        fileList.forEach((file: string) => builder.copySync(file, join(builder.jsAppDir, file)))

        console.log('> Done...')
      } else {
        console.log(
          "> We recommend you to follow [Qwik's Node Guide](https://qwik.builder.io/integrations/deployments/node/) first."
        )
      }
    },
  })
  .setProd({ serverPath: join('server', 'entry.express.js') })
  .setDev({
    command: port => `npx vite --mode ssr --port ${port} --host`,
    ready: 3000,
  })
  .withStaticFolder('dist')
  .withServiceWorker()
  .withServerless()
  .toConnector()
