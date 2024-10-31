import { readFileSync, existsSync } from 'fs'
import { NEXT_ROOT_DIR_FILE } from '../constants'
import { EdgioRuntimeGlobal } from '@edgio/core/lambda/global.helpers'
import { join, resolve } from 'path'
import { JS_APP_DIR } from '@edgio/core/deploy/paths'

/**
 * Returns the path relative to current working directory
 * where the next project or build is located.
 * However, when the project is built in NPM/YARN workspaces, the path is relative to the workspace root.
 */
export default function getNextRootDir(): string {
  const edgioAppDir = EdgioRuntimeGlobal.runtimeOptions?.fs.edgio.lambda.app.value || JS_APP_DIR

  const nextRootDirFilePath = join(edgioAppDir, NEXT_ROOT_DIR_FILE)
  if (existsSync(nextRootDirFilePath)) {
    return resolve(edgioAppDir, readFileSync(nextRootDirFilePath, 'utf-8'))
  }

  return process.cwd()
}
