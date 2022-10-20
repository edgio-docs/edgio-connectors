import ShopifyHydrogenRoutes from './ShopifyHydrogenRoutes'

/**
 * Adds all routes from your Shopify Hydrogen app to Edgio router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@edgio/core/router'
 * import { shopifyHydrogenRoutes } from '@edgio/shopify-hydrogen'
 *
 * export default new Router().use(shopifyHydrogenRoutes)
 * ```
 */
export const shopifyHydrogenRoutes = new ShopifyHydrogenRoutes()
