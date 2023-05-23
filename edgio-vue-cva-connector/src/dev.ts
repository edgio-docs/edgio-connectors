/* istanbul ignore file */
import { resolve } from 'path'
import { createDevServer } from '@edgio/core/dev'
import { getProjectType } from './utils'
import { PROJECT_TYPES } from './types'
import { DeploymentBuilder } from '@edgio/core/deploy'

const appDir = process.cwd()
const SW_SOURCE = resolve(appDir, 'sw', 'service-worker.js')

export default async function () {
  const projectType = getProjectType()
  await new DeploymentBuilder().watchServiceWorker(SW_SOURCE)

  return createDevServer({
    label: 'Vue 3',
    command: port => {
      // Project with vite builder
      if (projectType === PROJECT_TYPES.vite) return `npx vite dev --port ${port}`
      // Project with vue-cli-service builder
      return `npx vue-cli-service serve --port ${port} --host localhost`
    },
    ready: [/(localhost|127.0.0.1):/i],
    filterOutput: line =>
      !/App running at:|Note that the development build is not optimized.|localhost:3001|\n/i.test(
        line
      ),
  })
}
