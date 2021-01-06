import { DeploymentBuilder } from '@xdn/core/deploy'
import { join } from 'path'
import { loadNuxtConfig } from '@nuxt/config'

/**
 * Optimizes the dependencies and devDependencies in package.json so that
 * the serverless build is as small as possible.
 * @param builder
 */
export default async function updateDependencies(builder: DeploymentBuilder) {
  const config = await loadNuxtConfig()
  const file = join(process.cwd(), 'package.json')
  const packageContents = JSON.parse(builder.readFileSync(file))
  const { dependencies, devDependencies } = packageContents
  const { nuxt } = dependencies

  // move all dependencies not listed in modules to devDependencies to reduce bundle size
  for (let pkg in dependencies) {
    if (!config.modules.includes(pkg)) {
      devDependencies[pkg] = dependencies[pkg]
      delete dependencies[pkg]
    }
  }

  // use the same version of @nuxt/core as nuxt
  dependencies['@nuxt/core'] = nuxt

  builder.writeFileSync(file, JSON.stringify(packageContents, null, 2), 'utf8')
}
