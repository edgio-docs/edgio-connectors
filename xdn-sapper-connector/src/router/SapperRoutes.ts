import PluginBase from '@xdn/core/plugins/PluginBase'
import path from 'path'
import sapperPathToRouteSyntax from './sapperPathToRouteSyntax'
import { isCloud, isProductionBuild } from '@xdn/core/environment'
import { BACKENDS } from '@xdn/core/constants'
import Router from '@xdn/core/router/Router'
import RouteGroup from '@xdn/core/router/RouteGroup'
import ResponseWriter from '@xdn/core/router/ResponseWriter'
import { watch } from 'fs'

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

const TYPE = 'SapperRoutes'

/**
 * An XDN middleware that automatically adds all standard Sapper routes to the XDN router.
 * These include pages in src/routes and static assets in the static directory.
 */
export default class SapperRoutes extends PluginBase {
  private sapperRouteGroupName = 'sapper_routes_group'
  private sapperRootDir: string
  private pagesDir: string
  private pagesDirRelative: string
  private router?: Router
  pagesManifest: string[] = []

  type = TYPE

  /**
   * @param {Function} renderFn Next page render function
   */
  constructor() {
    super()
    this.sapperRootDir = process.cwd()
    this.pagesDirRelative = path.join('src', 'routes')
    this.pagesDir = path.join(this.sapperRootDir, this.pagesDirRelative)

    if (!isProductionBuild()) {
      watch(this.pagesDir, { recursive: true }, () => this.updateRoutes())
    }
  }

  /**
   * Returns true if the specified plugin is an instance of SapperRoutes
   * @param plugin
   */
  static is(plugin: any) {
    // Note that for some reason plugin instanceof SapperRoutes doesn't work reliably, so we compare the type string instead.
    return plugin.type === TYPE
  }

  /**
   * Called when plugin is registered
   * @param router
   */
  onRegister(router: Router) {
    this.router = router
    /* create route group and add all sapper routes into it */
    this.router.group(this.sapperRouteGroupName, group => this.addSapperRoutesToGroup(group))
  }

  /**
   * Update routes
   */
  updateRoutes() {
    /* istanbul ignore next */
    const routeGroup = <RouteGroup>this.router?.routeGroups?.findByName(this.sapperRouteGroupName)
    /* istanbul ignore next */
    routeGroup?.clear()
    this.addSapperRoutesToGroup(routeGroup)
  }

  /**
   * Adds all files in src/routes to the XDN router group
   * @param {RouteGroup} group
   */
  addSapperRoutesToGroup(group: RouteGroup) {
    this.addStaticRoutes(group)
    this.addDynamicRoutes(group)
  }

  /**
   * Adds routes for react components and API handlers
   * @param {*} group
   */
  addDynamicRoutes(group: RouteGroup) {
    group.dir(this.pagesDirRelative, {
      glob: '**/*.{ts,js,svelte}',
      ignore: '**/_*',
      paths: (file: string) => [sapperPathToRouteSyntax(file)],
      sort: (files: string[]) => {
        // Sort predefined routes before dynamic routes
        const dynamic = /\[\w+\]/
        const dynamicIndex = (s: string) => (s.match(dynamic) ? 0 : -1)
        files.sort((a, b) => dynamicIndex(a) - dynamicIndex(b))
        return files
      },
      handler: (file: string) => (res: ResponseWriter) => {
        res.proxy(BACKENDS.js)
      },
    })
  }

  /**
   * Adds routes for static assets, including /public and /.next/static
   */
  addStaticRoutes(group: RouteGroup) {
    group.match('/service-worker.js', ({ serviceWorker }) => {
      serviceWorker(
        `__sapper__/${process.env.NODE_ENV === 'production' ? 'build' : 'dev'}/service-worker.js`
      )
    })

    /* istanbul ignore next */
    group.static('static', { handler: () => res => res.cache(PUBLIC_CACHE_CONFIG) })

    // webpack hot loader
    if (!isCloud()) {
      group.match('/__sapper__', ({ stream }) => stream('__js__'))
    }

    // browser js
    group.match('/client/:path*', async ({ proxy, serveStatic, cache }) => {
      if (process.env.NODE_ENV === 'production') {
        cache(FAR_FUTURE_CACHE_CONFIG)
      }

      if (isCloud()) {
        serveStatic('__sapper__/build/client/:path*')
      } else {
        proxy(BACKENDS.js)
      }
    })
  }
}
