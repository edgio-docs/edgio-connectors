import { join } from 'path'
import nonWebpackRequire from '@xdn/core/utils/nonWebpackRequire'

/**
 * Gets the contents of angular.json as an object
 */
export function getAngularConfig() {
  const angularConfigPath = join(process.cwd(), 'angular.json')
  return nonWebpackRequire(angularConfigPath)
}

/**
 * Returns the config for the defaultProject in angularConfig.json,
 * or the config for env.ANGULAR_PROJECT if defined
 */
export function getAngularProject() {
  const angularConfig = getAngularConfig()
  return process.env.ANGULAR_PROJECT || angularConfig.defaultProject
}

/**
 * Gets the outputPath prop from angular.json for the given project and type under
 * /projects/<angular-project>/architect/<type>/options
 */
export function getOutputPath(type: 'build' | 'server') {
  const angularConfig = getAngularConfig()
  const angularProject = getAngularProject()
  return angularConfig.projects[angularProject].architect[type].options.outputPath
}

export const getBuildPath = () => getOutputPath('build')
