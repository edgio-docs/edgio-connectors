import { join } from 'path'
import { DeploymentBuilder } from '@xdn/core/deploy'
import checkForCustomFramework from './utils/checkForCustomFramework'
import updateDependencies from './utils/updateDependencies'
import installDeps from './utils/install'
import chalk from 'chalk'
import ora from 'ora'

/**
 * Adds all required dependencies and files to the user's app by copying them
 * over from src/default-app.
 */
export default async function init() {
  const builder = new DeploymentBuilder(process.cwd())
  const spinner = ora(`${chalk.green('Updating dependencies...')}`).start()
  checkForCustomFramework(builder)
  await updateDependencies()
  await installDeps(spinner)
  builder.addDefaultAppResources(join(__dirname, 'default-app')).addDefaultXdnScripts()
}
