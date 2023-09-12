/* istanbul ignore file */
import { resolve } from 'path'

export default async function prod(port: number) {
  process.env.PORT = port.toString()
  // NOTE: This is where we call our server from sveltekit/files/server.mjs
  const serverPath = resolve(resolve('.svelte-kit', 'output', 'server', 'server.mjs'))
  return import(/* webpackIgnore: true */ serverPath)
}
