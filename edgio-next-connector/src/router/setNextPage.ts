import { RouteHelper } from '@edgio/core/router'
import { NEXT_PAGE_HEADER } from '../constants'

/**
 * Instructs Next.js in serverless mode which page to render.
 * The page may differ from the requested path.
 * Page names can be found in pages-manifest.json or app-paths-manifest.json files.
 * @param pageName
 * @param routeHelper
 */
export default function setNextPage(pageName: string, routeHelper: RouteHelper) {
  pageName = pageName.startsWith('/') ? pageName.slice(1) : pageName
  pageName = !pageName.length ? 'index' : pageName
  routeHelper.setRequestHeader(NEXT_PAGE_HEADER, pageName)
}
