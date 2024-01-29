import { dirname, join, relative, resolve } from 'path'
import { isCloud } from '@edgio/core/environment'
import { JS_APP_DIR } from '@edgio/core/deploy/paths'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import resolvePackagePath from 'resolve-package-path'
import { fileURLToPath } from 'url'

export interface AstroBuiltConfig {
  outDir: string
  srcDir: string
  output: 'server' | 'static' | 'hybrid'
  base?: string
}

export const ASTRO_BUILT_CONFIG_FILENAME = 'astro.config.json'
export const ASTRO_BUILT_CONFIG_PATH = isCloud()
  ? resolve(ASTRO_BUILT_CONFIG_FILENAME)
  : resolve(JS_APP_DIR, ASTRO_BUILT_CONFIG_FILENAME)
export const ASTRO_CONFIG_FILENAME = 'astro.config.js'

export const DEFAULT_ASTRO_CONFIG: AstroBuiltConfig = {
  outDir: './dist',
  srcDir: './src',
  output: 'static',
}

/**
 * Returns the built Astro config from astro.config.json
 * that is created during build by Edgio to get rid of its dependencies,
 * build ENV variables and can be later load synchronously.
 */
export function getAstroBuiltConfig(): AstroBuiltConfig {
  // Return just default config if the file doesn't exist
  if (!existsSync(ASTRO_BUILT_CONFIG_PATH)) {
    return DEFAULT_ASTRO_CONFIG
  }

  // Load the astro config and merge it with defaults
  return {
    ...DEFAULT_ASTRO_CONFIG,
    ...JSON.parse(readFileSync(ASTRO_BUILT_CONFIG_PATH, 'utf8')),
  } as AstroBuiltConfig
}

/**
 * Writes the built Astro config to astro.config.json
 * that can be later load synchronously using getAstroBuiltConfig function.
 * and to remove the need of bundling the dependencies of astro.config.js
 * @param appDir
 */
export async function createAstroBuiltConfig(appDir = process.cwd()): Promise<AstroBuiltConfig> {
  // Get the original Astro config
  const astroConfig = await getAstroConfig()

  // Astro config resolver returns absolute paths in URL format and absolute paths,
  // so we need to convert them common format.
  const normalizePath = (path: string | URL) => {
    path = path.toString()
    path = path.startsWith('file:/') ? fileURLToPath(path) : path
    return relative(appDir, path)
  }

  // We need only these properties from the original Astro config
  const normalizedConfig: AstroBuiltConfig = {
    output: astroConfig.output,
    outDir: normalizePath(astroConfig.outDir),
    srcDir: normalizePath(astroConfig.srcDir),
    base: astroConfig?.base,
  }

  writeFileSync(ASTRO_BUILT_CONFIG_PATH, JSON.stringify(normalizedConfig))

  return normalizedConfig
}

/**
 * Returns the original Astro config from astro.config.mjs
 * loaded by the Astro config resolver.
 * NOTE: This function shouldn't be called in prod.js file.
 * @param appDir
 */
export async function getAstroConfig(appDir = process.cwd()) {
  // Find the astro config file
  // with various extensions
  const astroConfigPath = [
    join(appDir, ASTRO_CONFIG_FILENAME),
    join(appDir, ASTRO_CONFIG_FILENAME.replace('.js', '.mjs')),
    join(appDir, ASTRO_CONFIG_FILENAME.replace('.js', '.cjs')),
    join(appDir, ASTRO_CONFIG_FILENAME.replace('.js', '.ts')),
    join(appDir, ASTRO_CONFIG_FILENAME.replace('.js', '.mts')),
    join(appDir, ASTRO_CONFIG_FILENAME.replace('.js', '.cts')),
  ].find(existsSync)

  if (!astroConfigPath) {
    throw new Error(
      `Edgio couldn't find '${ASTRO_CONFIG_FILENAME}' in the root directory of your project.`
    )
  }

  // Astro config can be js, mjs, cjs, or even ts file,
  // that is in Astro loaded by Vite, and it's transpiled with specific config and module resolution.
  // Just TSC transpilation with project's tsconfig or esbuild bundling is not enough
  // and later can throw errors such as "TypeError [ERR_IMPORT_ASSERTION_TYPE_MISSING]: Module "file:////file.json" needs an import attribute of type "json"".
  // That's why we need to use Astro to dynamically import the config file.
  try {
    // Find the path to the Astro module
    const astroPath = dirname(resolvePackagePath('astro', appDir) || '')

    // The module is not exported from the root of the package,
    // so we need to import the file directly.
    const resolveConfigPath = join(astroPath, 'dist', 'core', 'config', 'config.js')

    const { resolveConfig } = await import(/* webpackIgnore: true */ `file://${resolveConfigPath}`)
    const { astroConfig } = await resolveConfig(astroConfigPath, 'build')
    return astroConfig
  } catch (e) {
    // If this fails because they changed the implementation,
    // we'll try to import the config file directly.
    console.warn(
      `WARNING: Edgio couldn't load '${astroConfigPath}' using Astro's config resolver. Trying to load it directly.`
    )
    const astroConfig = (await import(/* webpackIgnore: true */ `file://${astroConfigPath}`))
      .default
    return { ...DEFAULT_ASTRO_CONFIG, ...astroConfig }
  }
}
