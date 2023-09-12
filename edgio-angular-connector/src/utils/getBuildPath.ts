import { join } from 'path'
import { readFileSync } from 'fs'

/**
 * Gets the contents of angular.json as an object
 */
export function getAngularConfig() {
  return JSON.parse(readFileSync(join(process.cwd(), 'angular.json')).toString())
}

/**
 * Returns the config for the defaultProject in angularConfig.json,
 * or the config for env.ANGULAR_PROJECT if defined
 */
export function getAngularProject() {
  const angularConfig = getAngularConfig()
  // If there's no ANGULAR_PROJECT env variable and there's no defaultProject inside the angularConfig
  if (!process.env.ANGULAR_PROJECT && angularConfig && angularConfig.projects) {
    if (Object.keys(angularConfig.projects).length > 0) {
      if (!angularConfig.defaultProject) {
        console.log('> Falling back to the first project in the angular.json projects key.')
        return Object.keys(angularConfig.projects)[0]
      }
    }
  }
  const projectName = process.env.ANGULAR_PROJECT || angularConfig.defaultProject
  console.log('> Angular Project name:', projectName, 'is being used.')
  return projectName!
}

/**
 * Gets the outputPath prop from angular.json for the given project and type under
 * /projects/<angular-project>/architect/<type>/options
 */
export function getOutputPath(type: 'build' | 'server') {
  const angularConfig = getAngularConfig()
  const angularProject = getAngularProject()

  return angularConfig.projects[angularProject].architect[type]?.options?.outputPath
}

export const getBuildPath = () => getOutputPath('build')
