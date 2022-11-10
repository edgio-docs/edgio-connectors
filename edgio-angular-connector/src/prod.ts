import { join } from 'path'
import { existsSync } from 'fs'

/* istanbul ignore file */
export default async function prod(port: number) {
  const serverPath = join(process.cwd(), '__backends__', 'angular-server.js')
  if (!existsSync(serverPath)) {
    return
  }
  return new Promise((resolve, reject) => {
    try {
      require('./angular-server').app().listen(port, resolve)
    } catch (e) {
      reject(e)
    }
  })
}
