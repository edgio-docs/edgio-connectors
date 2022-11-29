import { join } from 'path'
import { existsSync } from 'fs'
import { createServer } from 'http'

export default function prod(port: number) {
  const serverFilePath = join(process.cwd(), 'build', 'server.js')
  if (existsSync(serverFilePath)) {
    process.env.PORT = port.toString()
    const server = require(serverFilePath).default
    return new Promise<void>(resolve => createServer(server).listen(port, resolve))
  }
}
