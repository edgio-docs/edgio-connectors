import getRenderMode from '../util/getRenderMode'
import setNextPage from './setNextPage'
import { SERVERLESS_ORIGIN_NAME } from '@edgio/core/origins'
import { RENDER_MODES } from '../types'
import { RouteHelper } from '@edgio/core/router'
import getNextConfig from '../getNextConfig'

// When Next 12 users that have opted into `server` target use this function they
// get a deprecation message.
export function renderNextPage(pageName: string, routeHelper: RouteHelper) {
  const nextConfig = getNextConfig()
  const renderMode = getRenderMode(nextConfig)
  if (renderMode === RENDER_MODES.server) {
    throw new Error(
      'The use of `renderNextPage` is retired for use with a server target build. Use `renderWithApp()` instead.\n' +
        'More information: https://docs.edg.io/guides/next#section_next_js_version_12_and_next_js_middleware__beta_'
    )
  }

  setNextPage(pageName, routeHelper)
  routeHelper.setOrigin(SERVERLESS_ORIGIN_NAME)
}
