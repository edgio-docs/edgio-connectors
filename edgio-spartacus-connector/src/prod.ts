/* istanbul ignore file */
import { resolve } from 'path'
import { existsSync } from '@edgio/core/utils/fs'

export default async function prod(port: number) {
  const serverPath = resolve('angular-server.js')
  if (!existsSync(serverPath)) return

  const { app } = (await import(/* webpackIgnore: true */ serverPath)).default
  return new Promise((resolve, reject) => {
    try {
      app().listen(port, resolve)
    } catch (e) {
      reject(e)
    }
  })
}
