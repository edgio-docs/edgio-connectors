/* istanbul ignore file */
import createDevServer from '@layer0/core/dev/createDevServer'
import { infoLogLabel } from '@layer0/core/utils/logo'
import bundle from './bundle'

export default async function dev() {
  await bundle({
    onRebuild(error: any) {
      if (!error) {
        console.log(`${infoLogLabel} browser bundle compiled successfully.`)
      }
    },
  })

  return createDevServer()
}
