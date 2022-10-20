/* istanbul ignore file */
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'

export default function prod(port: number) {
  return new Promise<void>((resolve, reject) => {
    const server = nonWebpackRequire('../build/server').default

    server.listen(port, (err: Error) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
