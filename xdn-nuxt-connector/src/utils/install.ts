import { join } from 'path'
import { existsSync } from 'fs'
import { spawn } from 'cross-spawn'
import chalk from 'chalk'

/**
 * Installs packages if they are not already installed.
 * @param spinner an ora spinner
 * @return {Promise}
 */
export default async function install(spinner: any) {
  let command
  const commandArgs = []

  if (existsSync(join(process.cwd(), 'yarn.lock'))) {
    command = 'yarn'
  } else {
    command = 'npm'
    commandArgs.push('install')
  }

  try {
    await run(command, commandArgs)
    spinner.succeed()
  } catch (e) {
    spinner.fail()
    console.error(chalk.red.bold(e.message))
    process.exit(1)
  }
}

const run = (command: string, args: string[]) => {
  return new Promise((resolve, reject) => {
    const cmd = spawn(command, args)

    cmd.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error('Process exited with code ' + code))
      }
    })

    cmd.on('error', e => reject(e))
  })
}
