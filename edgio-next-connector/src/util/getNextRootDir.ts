import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { NEXT_ROOT_DIR_FILE } from '../constants'

/**
 * Returns the path relative to current working directory
 * where the next project or build is located.
 *
 * In most cases this path is the same as the current working directory (./).
 * However, when the project is built in NPM/YARN workspaces, the path is relative to the workspace root.
 */
export default function getNextRootDir(): string {
  if (!existsSync(resolve(NEXT_ROOT_DIR_FILE))) return './'
  return readFileSync(resolve(NEXT_ROOT_DIR_FILE), 'utf8')
}
