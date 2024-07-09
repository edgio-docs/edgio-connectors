import { resolve } from 'path'
import { existsSync } from 'fs'
import { EdgioRuntimeGlobal } from '@edgio/core/lambda/global.helpers'

export default async function prod(port: number) {
  const appFilePath = resolve(
    EdgioRuntimeGlobal.runtimeOptions!.fs.edgio.lambda.app.value,
    '.output',
    'server',
    'index.mjs'
  )

  // If .output/server/index.mjs exist, run it
  if (existsSync(appFilePath)) {
    // Set the NITRO_PORT per
    // https://github.com/nuxt/framework/discussions/4972#:~:text=the%20PORT%20or-,NITRO_PORT,-environment%20variables
    process.env.NITRO_PORT = port.toString()
    // We need to use 'import()' with 'file://' prefix here as a workaround for Windows systems.
    // @ts-ignore
    return import(/* webpackIgnore: true */ `file://${appFilePath}`)
  }
}
