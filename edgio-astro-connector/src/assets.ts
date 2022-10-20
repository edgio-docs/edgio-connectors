/* istanbul ignore file */
import fs from 'fs'

/**
 * Read an asset from the file system in a way that's easy to mock in tests
 * @param path The path to the file to read
 * @return the file contents
 */
export function readAsset(path: string) {
  return fs.readFileSync(path, 'utf8')
}
