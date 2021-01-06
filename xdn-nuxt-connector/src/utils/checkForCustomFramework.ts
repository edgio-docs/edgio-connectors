import chalk from 'chalk'
import terminalLink from 'terminal-link'
import intersection from 'lodash/intersection'
import { join } from 'path'
import { DeploymentBuilder } from '@xdn/core/deploy'

const customFrameworks = [
  '@adonisjs/framework',
  'express',
  'fastify',
  '@feathersjs/express',
  '@hapi/hapi',
  'koa',
  'micro',
]

/**
 * Checks for any of the custom frameworks that can be installed from create-nuxt-app
 * and warns the user on how to handle them if they are installed.
 * @param builder
 */
export default function checkForCustomFramework(builder: DeploymentBuilder) {
  const file = join(process.cwd(), 'package.json')
  let packageContents = JSON.parse(builder.readFileSync(file))

  const detectedFrameworks = intersection(
    Object.keys(packageContents.dependencies),
    customFrameworks
  )

  if (detectedFrameworks.length > 0) {
    console.warn(
      `${chalk.bgRed('WARNING:')} ${chalk.red(
        `It looks like you are using a custom framework:\n${detectedFrameworks
          .map((f: string) => ` - ${f}`)
          .join('\n')}\nThis will probably cause errors when running XDN. See the ${terminalLink(
          'XDN Nuxt docs',
          'https://developer.moovweb.com/guides/nuxt'
        )} to learn more.`
      )}`
    )
  }
}
