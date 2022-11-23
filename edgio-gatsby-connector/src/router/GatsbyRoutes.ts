import { getConfig } from '../getConfig'
import { notFoundPageHTML } from '../404'
import { Router } from '@edgio/core/router'
import { BACKENDS } from '@edgio/core/constants'
import RouteGroup from '@edgio/core/router/RouteGroup'
import PluginBase from '@edgio/core/plugins/PluginBase'
import { isProductionBuild } from '@edgio/core/environment'

export default class GatsbyRoutes extends PluginBase {
  private router?: Router
  private readonly routeGroupName = 'gatsby_routes_group'

  /**
   * Called when plugin is registered
   * @param {Router} router
   */

  onRegister(router: Router) {
    this.router = router
    if (isProductionBuild()) {
      this.router.group(this.routeGroupName, group => this.addRoutesToGroup(group))
    } else {
      // Stream webpack changes
      this.router.match('/__webpack_hmr', ({ stream }) => stream(BACKENDS.js))
      // Proxy everything else from the gatsby devServer
      this.router.fallback(({ renderWithApp }) => {
        renderWithApp()
      })
    }
  }

  private addRoutesToGroup(group: RouteGroup) {
    const edgioConfig = getConfig()
    const gatsbyConfig = getConfig('gatsby.config.json')
    // Create empty prefix
    let routePrefix = ''
    // Add gatsby path prefix if gatsby.pathPrefix
    // is set to true inside the edgio config
    if (edgioConfig?.gatsby?.pathPrefix && gatsbyConfig?.pathPrefix) {
      routePrefix += gatsbyConfig.pathPrefix
    }
    // Load the public folder files paths
    gatsbyConfig.edgioRoutes.forEach((i: string) => {
      // Specifically handle index.html for pathPrefixes
      if (i === 'index.html') {
        if (routePrefix.length) {
          group.match(routePrefix, ({ serveStatic }) => {
            serveStatic(`public/${i}`)
          })
        } else {
          group.match('/', ({ serveStatic }) => {
            serveStatic(`public/${i}`)
          })
        }
      } else {
        // Create routes by replacing the /index.html
        // this takes care of pages other than homepage
        let path = `/${i.replace('/index.html', '')}`
        // Serve the path created but the file remains as identified from the config
        group.match(`${routePrefix}${path}`, ({ serveStatic }) => {
          serveStatic(`public/${i}`)
        })
      }
    })
    // Add fallback routes that serve 404 page
    this.addFallback()
  }

  /**
   * Forwards all unmatched requests to the Gatsby app for processing.
   */
  addFallback() {
    // Serve the custom 404 in case 404.html is not found in the public directory
    this.router?.fallback(res =>
      res.serveStatic(`public/404.html`, {
        statusCode: 404,
        onNotFound: async () => {
          res.send(notFoundPageHTML, 404, 'Not Found')
        },
      })
    )
  }
}
