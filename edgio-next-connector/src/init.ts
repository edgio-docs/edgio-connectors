/* istanbul ignore file */
import logo from '@edgio/core/utils/logo'
import spawn from 'cross-spawn'
import { existsSync } from 'fs'

const ora = require('ora')
const { join } = require('path')
const { DeploymentBuilder } = require('@edgio/core/deploy')
const nextTransform = join(__dirname, 'mods', 'next-config.js')
const jscodeshiftExecutable = require.resolve('.bin/jscodeshift')

export async function runCodemod(transform: string, path: string) {
  return new Promise<string>((resolve, reject) => {
    const p = spawn(
      jscodeshiftExecutable,
      ['--fail-on-error', '--run-in-band', '--parser=ts', '-t', transform, path],
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

  const nextConfigName = [
    'next.config.ts',
    'next.config.mjs',
    'next.config.cjs',
    'next.config.js',
  ].find(name => existsSync(join(process.cwd(), name)))

  if (!nextConfigName) {
    return console.error('ERROR: No next.config file found.')
  }

  const message = `Adding ${logo} plugins to ${nextConfigName}...`
  let spinner = ora(message).start()

  try {
    await runCodemod(nextTransform, nextConfigName)
    spinner.succeed(message + ' done.')
  } catch (e: unknown) {
    if (e instanceof Error) {
      spinner.fail(message)
      return console.error(e.message)
    }
    spinner.fail(message)
  }

  builder.addDefaultEdgioScripts()
}
