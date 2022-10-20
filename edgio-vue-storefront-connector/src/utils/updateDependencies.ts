import { read as readPkg, write as writePkg } from '@edgio/core/utils/packageUtils'
import { loadNuxtConfig } from '@nuxt/config'

const NUXT_CORE_DEPENDENCY = '@nuxt/core'

// Nuxt composition API is missing in the default storefront template but
// it's necessary for the builded app to run in deployment.
const NUXT_COMPOSITION_API_DEPENDENCY = '@nuxtjs/composition-api'
const NUXT_COMPOSITION_API_DEPENDENCY_VERSION = '^0.32.0'

/**
 * Optimizes the dependencies and devDependencies in package.json so that
 * the serverless build is as small as possible.
 */
export default async function updateDependencies() {
  const config = await loadNuxtConfig()
  const packageContents = JSON.parse(JSON.stringify(readPkg())) // don't clone original ref
  const { dependencies, devDependencies } = packageContents

  // Some modules are necessary to be in dependencies are we need to include the modules with the build
  // includeNodeModules: true,
  const necessaryModules = [
    ...[
      '@vue-storefront/commercetools',
      '@vue-storefront/middleware',
      // Nuxt i18n is a object in the nuxt js config, it would be better to have different solution for this
      'nuxt-i18n',
    ],
    ...config.modules,
  ]

  // Move all dependencies not listed in modules to devDependencies to reduce bundle size
  /* istanbul ignore next  */
  for (let pkg in dependencies) {
    if (!necessaryModules.includes(pkg)) {
      devDependencies[pkg] = dependencies[pkg]
      delete dependencies[pkg]
    }
  }

  // Use the same version of @nuxt/core as nuxt
  const { nuxt } = devDependencies

  dependencies[NUXT_CORE_DEPENDENCY] = nuxt
  delete devDependencies[NUXT_CORE_DEPENDENCY]

  // Add composition-api package if it's missing
  if (!Object.prototype.hasOwnProperty.call(dependencies, NUXT_COMPOSITION_API_DEPENDENCY)) {
    dependencies[NUXT_COMPOSITION_API_DEPENDENCY] = NUXT_COMPOSITION_API_DEPENDENCY_VERSION
  }
  delete devDependencies[NUXT_COMPOSITION_API_DEPENDENCY]

  writePkg(JSON.stringify(packageContents, null, 2))
}
