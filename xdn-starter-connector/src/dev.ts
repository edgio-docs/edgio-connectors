/* istanbul ignore file */
import createDevServer from '@xdn/core/dev/createDevServer'
import createWebpackConfig from './createWebpackConfig'

export default function dev() {
  return createDevServer({
    webpackConfig: createWebpackConfig(),
  })
}
