/* istanbul ignore file */
import { resolve } from 'path'

export default async function prod(port: number) {
  // @ts-ignore
  let server = await import(/* webpackIgnore: true */ resolve('./build/server.js'))

  // Try to get the default export
  server = server?.default?.default || server?.default || server

  return new Promise<void>((resolve, reject) => {
    try {
      // Razzle is using express by default to serve the app
      // but depending how that server is exported we need to
      // handle it differently, so we try to close it and then
      // start it again, as some implementation will export
      // server that is already started, and some will export
      // just the server instance
      server.close()
    } catch {
      // ignore
    }

    try {
      server.listen(port, (err: Error) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}
