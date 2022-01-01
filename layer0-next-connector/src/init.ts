/* istanbul ignore file */
const { join } = require('path')
const { DeploymentBuilder } = require('@layer0/core/deploy')
import { sync as spawnSync } from 'cross-spawn'

const nextTransform = join(__dirname, 'mods', 'next-config.js')
const jscodeshiftExecutable = require.resolve('.bin/jscodeshift')

function codemod(transform: string, path: string) {
  spawnSync(jscodeshiftExecutable, ['-t', transform, path], {
    stdio: 'inherit',
  })
}

/**
 * Adds all required dependencies and files to the user's app by copying them
 * over from src/default-app.
 */
export default function init() {
  new DeploymentBuilder(process.cwd())
    .addDefaultAppResources(join(__dirname, 'default-app'))
    .addDefaultLayer0Scripts()

  codemod(nextTransform, 'next.config.js')
}
