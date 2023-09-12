import { resolve } from 'path'
import { existsSync } from 'fs'
import { createServer } from 'http'

export default async function prod(port: number) {
  const serverFilePath = resolve('build', 'server.js')
  if (existsSync(serverFilePath)) {
    process.env.PORT = port.toString()

    let server = await import(serverFilePath)
    // Get the default export
    server = server?.default?.server || server?.default || server

    return new Promise<void>(resolve => createServer(server).listen(port, resolve))
  }
}
