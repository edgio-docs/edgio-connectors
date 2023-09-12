import { resolve } from 'path'
import { existsSync } from 'fs'

export default async function prod(port: number) {
  const appFilePath = resolve('.output', 'server', 'index.mjs')
  // If .output/server/index.mjs exist, run it
  if (existsSync(appFilePath)) {
    // Set the NITRO_PORT per
    // https://github.com/nuxt/framework/discussions/4972#:~:text=the%20PORT%20or-,NITRO_PORT,-environment%20variables
    process.env.NITRO_PORT = port.toString()
    // @ts-ignore
    return await import(/* webpackIgnore: true */ appFilePath)
  }
}
