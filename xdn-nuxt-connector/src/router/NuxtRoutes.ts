import PluginBase from '@xdn/core/plugins/PluginBase'
import { join } from 'path'
import { isLocal, isProductionBuild } from '@xdn/core/environment'
import { BACKENDS } from '@xdn/core/constants'
import renderNuxtPage from './renderNuxtPage'
import { watch, existsSync, writeFileSync, mkdirSync } from 'fs'
import { Router, ResponseWriter } from '@xdn/core/router'
import RouteGroup from '@xdn/core/router/RouteGroup'
import { NuxtConfig } from './NuxtConfig'
import { readAsset } from './assets'

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

export const XDN_NUXT_CONFIG_PATH = 'xdn-nuxt.config.json'

export const browserAssetOpts = {
  permanent: true,
  exclude: ['service-worker.js', 'LICENSES'],
}

export default class NuxtRoutes extends PluginBase {
  private readonly nuxtRouteGroupName = 'nuxt_routes_group'
  private router?: Router
  private readonly routesJsonPath: string
  private readonly config: NuxtConfig

  readonly type = TYPE

  /**
   * Provides nuxt registered routes to router
   */
  constructor() {
    super()
    const nuxtDir = join(process.cwd(), '.nuxt')
    this.routesJsonPath = join(nuxtDir, 'routes.json')

    if (isProductionBuild()) {
      this.config = <NuxtConfig>JSON.parse(readAsset(join(process.cwd(), XDN_NUXT_CONFIG_PATH)))
    } else {
      if (!existsSync(nuxtDir)) {
        mkdirSync(nuxtDir)
      }
      if (!existsSync(this.routesJsonPath)) {
        writeFileSync(this.routesJsonPath, JSON.stringify([]))
      }

      watch(this.routesJsonPath, eventType => {
        if (eventType === 'change' && this.loadNuxtRoutes()) {
          this.updateRoutes()
        }
      })

      this.config = {}
    }
  }

  /**
   * Updates the XDN router to include all routes from Nuxt (.nuxt/routes.json)
   */
  loadNuxtRoutes() {
    const contents = readAsset(this.routesJsonPath)

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
    this.addAssets(group)
    this.addPages(group)
  }

  /**
   * Adds routes for vue components
   * @param group
   */
  private addPages(group: RouteGroup) {
    /* istanbul ignore next */
    const fallback = this.config?.generate?.fallback

    let loadingPage: string | undefined
    let notFoundPage: string | undefined

    // See spec for fallback here: https://nuxtjs.org/docs/2.x/configuration-glossary/configuration-generate/#fallback
    if (fallback === undefined) {
      // show the 200.html loading page and run SSR in the background
      loadingPage = 'dist/200.html'
    } else if (fallback === false) {
      // The Nuxt docs are actually wrong here.  If fallback is false, no fallback page will be generated.
      // Just let serveStatic 404
    } else if (fallback === true) {
      // Display the custom 404 page
      notFoundPage = 'dist/404.html'
    } else {
      // Display the custom loading page and and run SSR in the background
      loadingPage = `dist/${fallback}`
    }

    for (let route of this.loadNuxtRoutes()) {
      const pattern = toXDNRoute(route.path)
      const file = `dist${pattern.replace(/\/$/, '')}/index.html`

      if (this.isStatic(route.path)) {
        /* istanbul ignore if */
        if (isProductionBuild() && isLocal()) {
          console.log('[@xdn/nuxt] static ', `${pattern} => ${file}`)
        }

        group.match(pattern, res => {
          res.serveStatic(file, {
            loadingPage,
            onNotFound: loadingPage
              ? renderNuxtPage
              : notFoundPage
              ? () => this.render404(res, <string>notFoundPage)
              : undefined,
          })
        })
      } else {
        /* istanbul ignore if */
        if (isProductionBuild() && isLocal()) {
          console.log('[@xdn/nuxt] ssr    ', pattern)
        }

        group.match(pattern, renderNuxtPage)
      }
    }
  }

  /**
   * Renders the generated 404 page
   * @param res
   * @param notFoundPage
   */
  private render404(res: ResponseWriter, notFoundPage: string) {
    // static 404
    return res.serveStatic(notFoundPage, { statusCode: 404, statusMessage: 'Not Found' })
  }

  private isStatic(route: string) {
    const target = this.config.target
    const exclude = this.config.generate?.exclude

    if (target !== 'static') {
      return false
    }

    /* istanbul ignore next */
    const isExcluded = exclude?.some(entry => {
      if (entry.type === 'RegExp') {
        return new RegExp(entry.value).test(route)
      } else if (entry.type === 'string') {
        return route === entry.value
      }
    })

    return !isExcluded
  }

  /**
   * Adds routes for static assets, including /static and /.nuxt/static
   * @param group
   */
  private addAssets(group: RouteGroup) {
    /* istanbul ignore next */
    group.static('static', {
      handler: file => res => res.cache(PUBLIC_CACHE_CONFIG),
    })

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
        serveStatic('.nuxt/dist/client/:path*', browserAssetOpts)
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
