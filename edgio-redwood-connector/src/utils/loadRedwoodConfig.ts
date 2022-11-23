import fs from 'fs'
import path from 'path'
import { parse as parseTOML } from '@iarna/toml'
import chalk from 'chalk'

export default function loadRedwoodConfig(configPath?: string) {
  try {
    return parseTOML(
      fs.readFileSync(configPath || path.join(process.cwd(), 'redwood.toml'), 'utf8')
    )
  } catch (e) {
    console.log(
      chalk.red.bold(
        'Error: Unable to parse "redwood.toml". Please validate this file exists and try again.'
      )
    )
    // We signal to the next process in chain that there was an error.
    process.exit(1)
  }
}
