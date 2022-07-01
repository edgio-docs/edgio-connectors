import { copySync } from 'fs-extra'
import { join } from 'path'
import chalk from 'chalk'
import ora from 'ora'
import { transformNuxtConfig } from './utils/transformNuxtConfig'
import { DeploymentBuilder } from '@layer0/core/deploy'
import checkForCustomFramework from '@layer0/nuxt/utils/checkForCustomFramework'
import installDeps from '@layer0/nuxt/utils/install'
import updateDependencies from './utils/updateDependencies'

async function init(args: any) {
  // Adds Layer0 directory with:
  // - createProductURL helper for prefetching
  // - createCategoryURL helperfor prefetching
  // - createHttpLink alias for transforming Apollo requests to GET
  copySync(join(__dirname, './helpers'), join(process.cwd(), 'layer0'))

  // Codemod for transforming the nuxt config
  transformNuxtConfig()

  // Initialization
  const builder = new DeploymentBuilder(process.cwd())
  const spinner = ora(`${chalk.green('Updating dependencies...')}`).start()
  checkForCustomFramework(builder)
  await updateDependencies()
  await installDeps(spinner)

  // Add commands to package.json and default-app folder files
  builder.addDefaultAppResources(join(__dirname, 'default-app')).addDefaultLayer0Scripts()
}

module.exports = init
