/**
 * A TTL for assets that never change. 1 year in seconds.
 * Use this value for example for builder.setStaticAssetExpiration which is accepting seconds.
 */
export const FAR_FUTURE_TTL = 60 * 60 * 24 * 365

/**
 * A TTL for assets that never change. 1 year with unit.
 * Use this value for cache features which are accepting units,
 * so they are more user-friendly.
 *
 * DO NOT use: @edgio/core/router/converters/toTimeUnitAbbrev for converting seconds to units here.
 * This function is representing months with 'm' letter but the edge-control is using it for minutes.
 */
export const FAR_FUTURE_TTL_WITH_UNIT = '1y'

/**
 * @private
 * When NextRoutes sees this value in the Cache-Control header returned from Next.js, it removes the header.
 */
export const REMOVE_HEADER_VALUE = '__edgio_remove__'

/**
 * @private
 * Instructs our prod.js in serverless mode which page to render.
 */
export const NEXT_PAGE_HEADER = 'x-next-page'

/**
 * @private
 * The name of the service worker file.
 */
export const SERVICE_WORKER_FILENAME = 'service-worker.js'

/**
 * @private
 * The path to the service worker source file
 */
export const SERVICE_WORKER_SOURCE_PATH = `sw/${SERVICE_WORKER_FILENAME}`

/**
 * @private
 * The name of folder where we put assets of prerendered pages on S3.
 * We are using this folder name, so the serveStatic (globby) is not trying to collect all files from ./ folder
 * when :path param is used.
 */
export const NEXT_PRERENDERED_PAGES_FOLDER = 'next_prerendered_pages'
