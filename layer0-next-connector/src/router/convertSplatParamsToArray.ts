import Params from './Params'

/**
 * Converts path params captured by [...varName] from a single string (the format returned by Layer0's router)
 * to arrays split by "/" (the format that Next.js provides).
 * @param {String} page The page route path
 * @param {Object} params The params captured by Layer0 router
 * @return {Object} A new params object
 */
export function convertSplatParamsToArray(page: string, params: Params) {
  if (!params) return params

  const changes: { [key: string]: string | string[] } = {}
  const splatPattern = /\[\.\.\.([^\]]+)\]/g

  let match

  while ((match = splatPattern.exec(page))) {
    const name = match[1]
    const value = params[name]

    /* istanbul ignore else */
    if (typeof value === 'string') {
      changes[name] = value.split('/')
    }
  }

  return { ...params, ...changes }
}
