import { readFileSync, existsSync } from 'fs'
import { NEXT_ROOT_DIR_FILE } from '../constants'
import { EdgioRuntimeGlobal } from '@edgio/core/lambda/global.helpers'
import { join } from 'path'
import * as process from 'process'

/**
 * Returns the path relative to current working directory
 * where the next project or build is located.
 * However, when the project is built in NPM/YARN workspaces, the path is relative to the workspace root.
 */
export default function getNextRootDir(): string {
  const { isProductionBuild } = EdgioRuntimeGlobal.runtimeOptions || {}
  const edgioAppDir = EdgioRuntimeGlobal.runtimeOptions?.fs.edgio.lambda.app.value

  if (isProductionBuild && edgioAppDir) {
    const nextRootDir = join(edgioAppDir, NEXT_ROOT_DIR_FILE)
    return existsSync(nextRootDir)
      ? join(edgioAppDir, readFileSync(nextRootDir, 'utf8'))
      : edgioAppDir
  }

  return process.cwd()
}
