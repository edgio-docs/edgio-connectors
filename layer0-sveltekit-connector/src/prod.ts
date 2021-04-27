/* istanbul ignore file */
import { createServer } from 'http'

export default function prod(port: number) {
  return new Promise<void>(resolve => {
    // @ts-ignore
    const app = __non_webpack_require__('../index.js').default
    createServer(app).listen(port, resolve)
  })
}
