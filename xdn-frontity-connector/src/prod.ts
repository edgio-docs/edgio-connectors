/* istanbul ignore file */
const { createServer } = require('http')
const { join } = require('path')

export default function prod(port: number) {
  const server = require(join(process.cwd(), 'build', 'server.js')).default
  return new Promise<void>(resolve => createServer(server).listen(port, resolve))
}
