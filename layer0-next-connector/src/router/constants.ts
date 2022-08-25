/**
 * A TTL for assets that never change.  10 years in seconds.
 */
export const FAR_FUTURE_TTL = 60 * 60 * 24 * 365 * 10

/**
 * @private
 * When NextRoutes sees this value in the Cache-Control header returned from Next.js, it removes the header.
 */
export const REMOVE_HEADER_VALUE = '__edgio_remove__'
