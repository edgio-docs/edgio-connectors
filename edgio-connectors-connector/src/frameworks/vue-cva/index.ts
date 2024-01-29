import { join, resolve } from 'path'
import ConnectorBuilder from '../../utils/ConnectorBuilder'
import { getOutputDir, getProjectType } from './utils'
import { PROJECT_TYPES, SERIALIZED_CONFIG_FILE } from './types'
import VueRoutes from './VueRoutes'

export default new ConnectorBuilder('vue-cva')
  .setBuild(async (_, builder) => {
    const appDir = process.cwd()

    const projectType = getProjectType()
    const outputDir = await getOutputDir()

    // We need to add assets before we build, as the router depends on built vue config file.
    const SERIALIZED_CONFIG_DEST = resolve(appDir, '.edgio', SERIALIZED_CONFIG_FILE)
    builder.addStaticAsset(join(appDir, outputDir))

    // We create serialized version of the config file with outputDir.
    // The file relative location is same in both project root and lambda folder
    builder.writeFileSync(SERIALIZED_CONFIG_DEST, JSON.stringify({ outputDir }))
    builder.addJSAsset(SERIALIZED_CONFIG_DEST)

    return {
      command: projectType === PROJECT_TYPES.vite ? 'npx vite build' : 'npx vue-cli-service build',
      buildFolder: outputDir,
    }
  })
  .setDev(() => {
    const projectType = getProjectType()
    return {
      label: 'Vue', // can be 2, can be 3, therefore not specifying
      command: port => {
        // Project with vite builder
        if (projectType === PROJECT_TYPES.vite)
          return `npx vite dev --port ${port} --host 127.0.0.1`
        // Project with vue-cli-service builder
        return `npx vue-cli-service serve --port ${port} --host 127.0.0.1`
      },
      ready: [/(localhost|127.0.0.1):/i],
      filterOutput: line =>
        !/App running at:|Note that the development build is not optimized.|localhost:3001|\n/i.test(
          line
        ),
    }
  })
  .setOnRegister(router => router.use(new VueRoutes()))
  .withServiceWorker(true)
  .toConnector()
