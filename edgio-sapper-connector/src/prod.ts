/* istanbul ignore file */
import { resolve } from 'path'

export default async function prod(port: number) {
  process.env.PORT = port.toString()
  // @ts-ignore
  return import(/* webpackIgnore: true */ resolve('__sapper__/build/server/server.js'))
}
