/* istanbul ignore file */
import createDevServer from '@edgio/core/dev/createDevServer'
import { infoLogLabel } from '@edgio/core/utils/logo'
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
