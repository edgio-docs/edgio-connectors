import PluginBase from '@xdn/core/plugins/PluginBase'
import path from 'path'
import { isProductionBuild } from '@xdn/core/environment'
import { BACKENDS } from '@xdn/core/constants'
import renderNuxtPage from './renderNuxtPage'
import { readFileSync, watch } from 'fs'
import { Router, ResponseWriter } from '@xdn/core/router'
import RouteGroup from '@xdn/core/router/RouteGroup'

/**
 * A TTL for assets that never change.  10 years in seconds.
 */
const FAR_FUTURE_TTL = 60 * 60 * 24 * 365 * 10

const FAR_FUTURE_CACHE_CONFIG = {
  browser: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}

const PUBLIC_CACHE_CONFIG = {
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}

const TYPE = 'NuxtRoutes'

export default class NuxtRoutes extends PluginBase {
  private readonly nuxtRouteGroupName = 'nuxt_routes_group'
  private router?: Router
  private readonly routesJsonPath: string
  readonly type = TYPE

  /**
   * Provides nuxt registered routes to router
   */
  constructor() {
    super()
    this.routesJsonPath = path.join(process.cwd(), '.nuxt', 'routes.json')

    if (!isProductionBuild()) {
      watch(this.routesJsonPath, eventType => {
        if (eventType === 'change' && this.loadNuxtRoutes()) {
          this.updateRoutes()
        }
      })
    }
  }

  /**
   * Updates the XDN router to include all routes from Nuxt (.nuxt/routes.json)
   */
  loadNuxtRoutes() {
    const contents = readFileSync(this.routesJsonPath, 'utf8')

    if (contents.length) {
      // Note that this is sometimes empty because Nuxt clears this file before it updates it.
      return JSON.parse(contents)
    }
  }

  /**
   * Returns true if the specified plugin is an instance of NuxtRoutes
   * @param plugin
   */
  static is(plugin: PluginBase) {
    return plugin != null && plugin.type === TYPE
  }

  /**
   * Called when plugin is registered. Creates a route group and add all nuxt routes into it.
   * @param {Router} router
   */
  onRegister(router: Router) {
    this.router = router
    this.loadNuxtRoutes()
    this.router.group(this.nuxtRouteGroupName, group => this.addNuxtRoutesToGroup(group))
  }

  /**
   * Update routes
   */
  private updateRoutes() {
    /* istanbul ignore next */
    const routeGroup = this.router?.routeGroups?.findByName(this.nuxtRouteGroupName)

    /* istanbul ignore else */
    if (routeGroup) {
      routeGroup.clear()
      this.addNuxtRoutesToGroup(routeGroup)
    }
  }

  /**
   * Adds nuxt routes to route group
   * @param {RouteGroup} group
   */
  private addNuxtRoutesToGroup(group: RouteGroup) {
    this.addStaticRoutes(group)
    this.addDynamicRoutes(group)
  }

  /**
   * Adds routes for vue components
   * @param group
   */
  private addDynamicRoutes(group: RouteGroup) {
    for (let route of this.loadNuxtRoutes()) {
      const pattern = toXDNRoute(route.path)
      group.match(pattern, renderNuxtPage)
    }
  }

  /**
   * Adds routes for static assets, including /static and /.nuxt/static
   * @param group
   */
  private addStaticRoutes(group: RouteGroup) {
    /* istanbul ignore next */
    group.static('static', { handler: file => res => res.cache(PUBLIC_CACHE_CONFIG) })

    // webpack hot loader
    if (!isProductionBuild()) {
      const streamHandler = (res: ResponseWriter) => res.stream(BACKENDS.js)
      group.match('/__webpack_hmr/:path*', streamHandler)
      group.match('/_nuxt/:hash.hot-update.json', streamHandler)
    }

    // browser js
    group.match('/_nuxt/:path*', async ({ proxy, serveStatic, cache }) => {
      if (isProductionBuild()) {
        cache(FAR_FUTURE_CACHE_CONFIG)
        serveStatic('.nuxt/dist/client/:path*')
      } else {
        // since Nuxt doesn't add a hash to asset file names in dev, we need to prevent caching,
        // otherwise Nuxt is prone to getting stuck in a browser refresh loop after making changes due to assets
        // failing to load without error.
        cache({ browser: false })
        proxy(BACKENDS.js)
      }
    })
  }
}

function toXDNRoute(nuxtRoutePath: string) {
  // e.g: pages/_lang/_.js will be /:lang?/* in routes.json, which becomes /:lang?/(.*) in the XDN router
  return nuxtRoutePath.replace(/:([^/]+)\?/g, ':$1').replace(/\*/g, '(.*)')
}
