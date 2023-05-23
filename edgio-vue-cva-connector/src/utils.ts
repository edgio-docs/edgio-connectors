import { join, relative } from 'path'
import { PROJECT_TYPES, VITE_CONFIG_FILE, VUE_CONFIG_FILE } from './types'
import { existsSync } from 'fs'

/**
 * Returns the output directory of the current project
 * which is relative to the project root.
 * @param projectDir
 */
export async function getOutputDir(projectDir = process.cwd()) {
  const projectType = getProjectType(projectDir)
  const configFile = getProjectConfigFile(projectDir)
  if (!configFile) return null

  if (projectType === PROJECT_TYPES.vite) {
    const resolveConfig = require('vite').resolveConfig
    const config = (await resolveConfig({ mode: 'production' }, 'build', 'production')) ?? {}
    return relative(projectDir, config?.build?.outDir ?? 'dist')
  }

  const config = require(join(projectDir, configFile))
  return config?.outputDir || 'dist'
}

/**
 * Returns the name of found project config file.
 * @param projectDir
 */
export function getProjectConfigFile(projectDir = process.cwd()) {
  const extensions = ['.js', '.cjs', '.mjs', '.ts']
  const viteConfigs = extensions.map(ext => VITE_CONFIG_FILE.replace('.js', ext))
  const vueConfigs = extensions.map(ext => VUE_CONFIG_FILE.replace('.js', ext))

  return (
    viteConfigs.find(file => existsSync(join(projectDir, file))) ||
    vueConfigs.find(file => existsSync(join(projectDir, file)))
  )
}

/**
 * Returns the project type based on used config file.
 * @param projectDir
 */
export function getProjectType(projectDir = process.cwd()) {
  const configFile = getProjectConfigFile(projectDir)
  if (configFile?.startsWith('vite.')) return PROJECT_TYPES.vite
  if (configFile?.startsWith('vue.')) return PROJECT_TYPES.vueCli
  throw new Error(
    "Couldn't detect used CLI tool. Please make sure you are using vue-cli-service (vue.config.js) or vite (vite.config.js) to build the app."
  )
}
