import PluginBase from '@layer0/core/plugins/PluginBase'
import path from 'path'
import pathToRouteSyntax from './pathToRouteSyntax'
import { isCloud, isProductionBuild } from '@layer0/core/environment'
import { BACKENDS } from '@layer0/core/constants'
import Router from '@layer0/core/router/Router'
import RouteGroup from '@layer0/core/router/RouteGroup'
import ResponseWriter from '@layer0/core/router/ResponseWriter'
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

const TYPE = 'SvelteKitRoutes'

/**
 * An Layer0 middleware that automatically adds all standard SvelteKit routes to Layer0 router.
 * These include pages in src/routes and static assets in the static directory.
 */
export default class SvelteKitRoutes extends PluginBase {
  private svelteRouteGroupName = 'svelte_routes_group'
  private svelteRootDir: string
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
    this.svelteRootDir = process.cwd()
    this.pagesDirRelative = path.join('src', 'routes')
    this.pagesDir = path.join(this.svelteRootDir, this.pagesDirRelative)

    if (!isProductionBuild()) {
      watch(this.pagesDir, { recursive: true }, () => this.updateRoutes())
    }
  }

  /**
   * Returns true if the specified plugin is an instance of SvelteKitRoutes
   * @param plugin
   */
  static is(plugin: any) {
    // Note that for some reason plugin instanceof SvelteKitRoutes doesn't work reliably, so we compare the type string instead.
    return plugin.type === TYPE
  }

  /**
   * Called when plugin is registered
   * @param router
   */
  onRegister(router: Router) {
    this.router = router
    /* create route group and add all svelte routes into it */
    this.router.group(this.svelteRouteGroupName, group => this.addSvelteKitRoutesToGroup(group))
  }

  /**
   * Update routes
   */
  updateRoutes() {
    /* istanbul ignore next */
    const routeGroup = <RouteGroup>this.router?.routeGroups?.findByName(this.svelteRouteGroupName)
    /* istanbul ignore next */
    routeGroup?.clear()
    this.addSvelteKitRoutesToGroup(routeGroup)
  }

  /**
   * Adds all files in src/routes to Layer0 router group
   * @param {RouteGroup} group
   */
  addSvelteKitRoutesToGroup(group: RouteGroup) {
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
      paths: (file: string) => [pathToRouteSyntax(file)],
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
    if (process.env.NODE_ENV === 'production') {
      /*
        From the sveltekit docs: https://kit.svelte.dev/docs#modules-service-worker
        Because it needs to be bundled (since browsers don't yet support import in this context), 
        and depends on the client-side app's build manifest, service workers only work in the 
        production build, not in development.
      */
      group.match('/service-worker.js', ({ serviceWorker }) => {
        serviceWorker(`.svelte/output/client/service-worker.js`)
      })
    }

    /* istanbul ignore next */
    group.static('static', { handler: () => res => res.cache(PUBLIC_CACHE_CONFIG) })

    // webpack hot loader
    if (!isCloud()) {
      group.match('/_app', ({ stream }) => stream('__js__'))
    }

    // browser js
    group.match('/_app/:path*', ({ cache, proxy }) => {
      if (process.env.NODE_ENV === 'production') {
        cache(FAR_FUTURE_CACHE_CONFIG)
      }
      proxy(isCloud() ? BACKENDS.permanentStatic : BACKENDS.js)
    })
  }
}
