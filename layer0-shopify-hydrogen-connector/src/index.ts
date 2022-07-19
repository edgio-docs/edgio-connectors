import ShopifyHydrogenRoutes from './ShopifyHydrogenRoutes'

/**
 * Adds all routes from your Shopify Hydrogen app to Layer0 router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@layer0/core/router'
 * import { shopifyHydrogenRoutes } from '@layer0/shopify-hydrogen'
 *
 * export default new Router().use(shopifyHydrogenRoutes)
 * ```
 */
export const shopifyHydrogenRoutes = new ShopifyHydrogenRoutes()
