/* istanbul ignore file */
import nonWebpackRequire from '@edgio/core/utils/nonWebpackRequire'

export default async function prod(port: number) {
  process.env.PORT = port.toString()
  nonWebpackRequire('../__sapper__/build/server/server')
}
