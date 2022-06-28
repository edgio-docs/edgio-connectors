/* istanbul ignore file */
import logo from '@layer0/core/utils/logo'
import spawn from 'cross-spawn'

const ora = require('ora')
const { join } = require('path')
const { DeploymentBuilder } = require('@layer0/core/deploy')
const nextTransform = join(__dirname, 'mods', 'next-config.js')
const jscodeshiftExecutable = require.resolve('.bin/jscodeshift')

async function codemod(transform: string, path: string) {
  return new Promise<string>((resolve, reject) => {
    const p = spawn(
      jscodeshiftExecutable,
      ['--fail-on-error', '--run-in-band', '-t', transform, path],
      {
        stdio: 'pipe',
      }
    )

    let output = ''

    p.stdout?.on('data', data => (output += data))
    p.stderr?.on('data', data => (output += data))

    p.on('close', code => {
      if (code === 0) {
        resolve(output)
      } else {
        reject(new Error(output))
      }
    })
  })
}

/**
 * Adds all required dependencies and files to the user's app by copying them
 * over from src/default-app.
 */
export default async function init() {
  const builder = new DeploymentBuilder(process.cwd()).addDefaultAppResources(
    join(__dirname, 'default-app')
  )

  const message = `Adding ${logo} plugins to next.config.js...`
  let spinner = ora(message).start()

  try {
    await codemod(nextTransform, 'next.config.js')
    spinner.succeed(message + ' done.')
  } catch (e) {
    spinner.fail(message)
    console.error(e.message)
  }

  builder.addDefaultLayer0Scripts()
}
