import { join } from 'path'
import getNextConfig from '../../../src/getNextConfig'
import ManifestParser from '../../../src/router/ManifestParser'
import { getDistDirFromConfig } from '../../../src/util/getDistDir'
import getRenderMode from '../../../src/util/getRenderMode'
import { FALLBACK_TYPES, PAGE_SOURCE_TYPES, PAGE_TYPES } from '../../../src/types'
import { EdgioRuntimeGlobal } from '@edgio/core/lambda/global.helpers'
import { createEdgioFS } from '@edgio/core/edgio.fs'

describe('ManifestParser', () => {
  let manifestParser, nextConfig, renderMode, distDir

  beforeAll(() => {
    jest.isolateModules(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {})
    })
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  describe('in development mode', () => {
    beforeAll(() => {
      const fs = createEdgioFS(join(__dirname, '../../apps/with-localization'))
      EdgioRuntimeGlobal.runtimeOptions = {
        devMode: true,
        isProductionBuild: false,
        isCacheEnabled: false,
        origins: [],
        entryFile: '',
        fs,
      }

      nextConfig = getNextConfig(fs.edgio.lambda.app.value)
      distDir = getDistDirFromConfig(nextConfig)
      renderMode = getRenderMode(nextConfig)
      manifestParser = new ManifestParser(fs.edgio.lambda.app.value, distDir, renderMode)
    })

    it('should not throw error and return empty array for redirects', () => {
      expect(manifestParser.getRedirects()).toEqual([])
    })
    it('should not throw error and return empty array for pages', () => {
      expect(manifestParser.getPages(true)).toEqual([])
    })
  })

  describe('in production mode', () => {
    describe('without localization', () => {
      beforeAll(() => {
        const fs = createEdgioFS(join(__dirname, '../../apps/default'))
        EdgioRuntimeGlobal.runtimeOptions = {
          devMode: false,
          isProductionBuild: true,
          isCacheEnabled: false,
          origins: [],
          entryFile: '',
          fs,
        }

        nextConfig = getNextConfig(fs.edgio.lambda.app.value)
        distDir = getDistDirFromConfig(nextConfig)
        renderMode = getRenderMode(nextConfig)
        manifestParser = new ManifestParser(fs.edgio.lambda.app.value, distDir, renderMode)
      })

      it('should extract redirects from routes-manifest.json', () => {
        expect(manifestParser.getRedirects()).toEqual([
          {
            source: '/:path+/',
            destination: '/:path+',
            statusCode: 308,
            regex: '^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))/$',
          },
          {
            source: '/temp-redirects/:id',
            destination: '/p/:id',
            statusCode: 307,
          },
          {
            source: '/perm-redirects/:id',
            destination: '/p/:id',
            statusCode: 308,
          },
        ])
      })

      it('should return PreviewModeId', () => {
        expect(manifestParser.getPreviewModeId()).toBe('15da6cc8a984bb9e0bcd4d9739e6b8f4')
      })

      describe('pages', () => {
        let pages, pagesMap

        beforeAll(() => {
          pages = manifestParser.getPages(true)
          pagesMap = Object.fromEntries(pages.map(page => [page.name, page]))
        })

        it('should return pages from pages-manifest.json', () => {
          expect(pages.length).toEqual(21)
        })

        describe('type', () => {
          it('should return correct type of page: TEMPLATE', () => {
            expect(pagesMap['/_app'].type).toBe(PAGE_TYPES.template)
          })

          it('should return correct type of page: API', () => {
            expect(pagesMap['/api/dynamic/[id]'].type).toBe(PAGE_TYPES.api)
          })

          it('should return correct type of page: SSG', () => {
            expect(pagesMap['/dynamic/ssg/[id]'].type).toBe(PAGE_TYPES.ssg)
          })

          it('should return correct type of page: SSR', () => {
            expect(pagesMap['/dynamic/ssr/[id]'].type).toBe(PAGE_TYPES.ssr)
          })

          it('should return correct type of page: ISG', () => {
            expect(pagesMap['/dynamic/fallback_true/[id]'].type).toBe(PAGE_TYPES.isg)
          })

          it('should return correct type of page: ISR', () => {
            expect(pagesMap['/dynamic/fallback_true_revalidate/[id]'].type).toBe(PAGE_TYPES.isr)
          })
        })

        describe('isDynamic', () => {
          it('should return isDynamic: true for pages with dynamic route', () => {
            expect(pagesMap['/api/dynamic/[id]'].isDynamic).toBe(true)
            expect(pagesMap['/dynamic/ssg/[id]'].isDynamic).toBe(true)
            expect(pagesMap['/dynamic/ssr/[id]'].isDynamic).toBe(true)
            expect(pagesMap['/dynamic/fallback_true/[id]'].isDynamic).toBe(true)
            expect(pagesMap['/dynamic/fallback_true_revalidate/[id]'].isDynamic).toBe(true)
          })
          it('should return isDynamic: false for pages with static route', () => {
            expect(pagesMap['/_app'].isDynamic).toBe(false)
            expect(pagesMap['/static'].isDynamic).toBe(false)
            expect(pagesMap['/ssg'].isDynamic).toBe(false)
          })
        })

        describe('isPrerendered', () => {
          it('should return isPrerendered: true for pages which are in prerender-manifest.json', () => {
            expect(pagesMap['/dynamic/ssg/[id]'].isPrerendered).toBe(true)
            expect(pagesMap['/dynamic/fallback_true/[id]'].isPrerendered).toBe(true)
            expect(pagesMap['/dynamic/fallback_true_revalidate/[id]'].isPrerendered).toBe(true)
            expect(pagesMap['/ssg'].isPrerendered).toBe(true)
            expect(pagesMap['/static'].isPrerendered).toBe(true)
          })
          it('should return isPrerendered: false for pages which are not in prerender-manifest.json', () => {
            expect(pagesMap['/api/dynamic/[id]'].isPrerendered).toBe(false)
            expect(pagesMap['/dynamic/ssr/[id]'].isPrerendered).toBe(false)
            expect(pagesMap['/_app'].isPrerendered).toBe(false)
          })
        })

        describe('prerenderedRoutes', () => {
          it('should return prerendered routes of dynamic SSG page with no data route', () => {
            expect(pagesMap['/dynamic/ssg/[id]'].prerenderedRoutes).toEqual([
              {
                nextRoute: '/dynamic/ssg/[id]',
                route: '/dynamic/ssg/:id',
                dataRoute: undefined,
              },
            ])
          })

          it('should return prerendered routes of dynamic ISG page with data route and fallback:true', () => {
            expect(pagesMap['/dynamic/fallback_true/[id]'].prerenderedRoutes).toEqual([
              {
                dataRoute: '/_next/data/buildId/dynamic/fallback_true/1.json',
                initialRevalidateSeconds: false,
                nextRoute: '/dynamic/fallback_true/1',
                route: '/dynamic/fallback_true/1',
              },
              {
                dataRoute: '/_next/data/buildId/dynamic/fallback_true/2.json',
                initialRevalidateSeconds: false,
                nextRoute: '/dynamic/fallback_true/2',
                route: '/dynamic/fallback_true/2',
              },
            ])
          })

          it('should return prerendered routes of dynamic ISR page with fallback:true', () => {
            expect(pagesMap['/dynamic/fallback_true_revalidate/[id]'].prerenderedRoutes).toEqual([
              {
                dataRoute: '/_next/data/buildId/dynamic/fallback_true_revalidate/1.json',
                initialRevalidateSeconds: 360,
                nextRoute: '/dynamic/fallback_true_revalidate/1',
                route: '/dynamic/fallback_true_revalidate/1',
              },
              {
                dataRoute: '/_next/data/buildId/dynamic/fallback_true_revalidate/2.json',
                initialRevalidateSeconds: 360,
                nextRoute: '/dynamic/fallback_true_revalidate/2',
                route: '/dynamic/fallback_true_revalidate/2',
              },
            ])
          })

          it('should return prerendered routes of static SSG page without getStaticProps', () => {
            expect(pagesMap['/ssg'].prerenderedRoutes).toEqual([
              {
                dataRoute: undefined,
                initialRevalidateSeconds: undefined,
                nextRoute: '/ssg',
                route: '/ssg',
              },
            ])
          })

          it('should return prerendered routes of static SSG page with getStaticProps', () => {
            expect(pagesMap['/static'].prerenderedRoutes).toEqual([
              {
                dataRoute: '/_next/data/buildId/static.json',
                initialRevalidateSeconds: false,
                nextRoute: '/static',
                route: '/static',
              },
            ])
          })
        })

        describe('initialRevalidateSeconds', () => {
          it('should return initialRevalidateSeconds for pages with revalidation', () => {
            pagesMap['/dynamic/revalidate']?.prerenderedRoutes?.forEach(
              ({ initialRevalidateSeconds }) => {
                expect(initialRevalidateSeconds).toBe(10)
              }
            )
            pagesMap['/dynamic/fallback_true_revalidate/[id]']?.prerenderedRoutes?.forEach(
              ({ initialRevalidateSeconds }) => {
                expect(initialRevalidateSeconds).toBe(360)
              }
            )
          })
        })

        describe('fallback', () => {
          it('should return fallback type for prerendered pages with dynamic route', () => {
            expect(pagesMap['/dynamic/fallback_true/[id]'].fallback).toBe(FALLBACK_TYPES.true)
            expect(pagesMap['/dynamic/fallback_false/[id]'].fallback).toBe(FALLBACK_TYPES.false)
            expect(pagesMap['/dynamic/fallback_blocking/[id]'].fallback).toBe(
              FALLBACK_TYPES.blocking
            )
          })
          it('should return fallback HTML page for pages with fallbackType:true', () => {
            expect(pagesMap['/dynamic/fallback_true/[id]'].fallbackPage).toBe(
              '/dynamic/fallback_true/[id].html'
            )
          })
        })

        describe('page source', () => {
          it('should return page source (pages or app folder', () => {
            expect(pagesMap['/static'].pageSource).toBe(PAGE_SOURCE_TYPES.pages)
            expect(pagesMap['/app-folder-page'].pageSource).toBe(PAGE_SOURCE_TYPES.app)
          })
        })
      })

      describe('sorting pages', () => {
        beforeAll(() => {
          const fs = createEdgioFS(join(__dirname, '../../apps/sorting'))
          EdgioRuntimeGlobal.runtimeOptions = {
            devMode: false,
            isProductionBuild: true,
            isCacheEnabled: false,
            origins: [],
            entryFile: '',
            fs,
          }

          nextConfig = getNextConfig(fs.edgio.lambda.app.value)
          distDir = getDistDirFromConfig(nextConfig)
          renderMode = getRenderMode(nextConfig)
          manifestParser = new ManifestParser(fs.edgio.lambda.app.value, distDir, renderMode)
        })

        it('should sort pages from most dynamic to least dynamic', () => {
          const unsortedPages = [
            {
              name: '/api/hello',
              isDynamic: false,
            },
            {
              name: '/ssg/my-ssg-page',
              isDynamic: false,
            },
            {
              name: '/ssg/my-ssg-page/[...slug]',
              isDynamic: true,
            },
            {
              name: '/api/[id]',
              isDynamic: true,
            },
            {
              name: '/[..slug]',
              isDynamic: true,
            },
          ]
          const sortedPages = [
            {
              isDynamic: true,
              name: '/[..slug]',
            },
            {
              isDynamic: true,
              name: '/api/[id]',
            },
            {
              isDynamic: true,
              name: '/ssg/my-ssg-page/[...slug]',
            },
            {
              isDynamic: false,
              name: '/api/hello',
            },
            {
              isDynamic: false,
              name: '/ssg/my-ssg-page',
            },
          ]
          const s = manifestParser.sortPages(unsortedPages)
          expect(s).toEqual(sortedPages)
        })
      })
    })

    describe('with localization', () => {
      beforeAll(() => {
        const fs = createEdgioFS(join(__dirname, '../../apps/with-localization'))
        EdgioRuntimeGlobal.runtimeOptions = {
          devMode: false,
          isProductionBuild: true,
          isCacheEnabled: false,
          origins: [],
          entryFile: '',
          fs,
        }

        nextConfig = getNextConfig(fs.edgio.lambda.app.value)
        distDir = getDistDirFromConfig(nextConfig)
        renderMode = getRenderMode(nextConfig)
        manifestParser = new ManifestParser(fs.edgio.lambda.app.value, distDir, renderMode)
      })

      it('should return locales from routes-manifest.json', () => {
        expect(manifestParser.getLocales()).toEqual(['en-US', 'fr', 'nl-NL'])
      })

      it('should return default locale from routes-manifest.json', () => {
        expect(manifestParser.getDefaultLocale()).toBe('en-US')
      })

      describe('pages', () => {
        let pages, pagesMap

        beforeAll(() => {
          pages = manifestParser.getPages(true)
          pagesMap = Object.fromEntries(pages.map(page => [page.name, page]))
        })

        it('should return pages from pages-manifest.json', () => {
          expect(pages.length).toEqual(32)
        })

        describe('type', () => {
          it('should return correct type of page: TEMPLATE', () => {
            expect(pagesMap['/_app'].type).toBe(PAGE_TYPES.template)
          })

          it('should return correct type of page: API', () => {
            expect(pagesMap['/api/dynamic/[id]'].type).toBe(PAGE_TYPES.api)
          })

          it('should return correct type of page: SSG', () => {
            expect(pagesMap['/en-US/dynamic/ssg/[id]'].type).toBe(PAGE_TYPES.ssg)
            expect(pagesMap['/fr/dynamic/ssg/[id]'].type).toBe(PAGE_TYPES.ssg)
            expect(pagesMap['/nl-NL/dynamic/ssg/[id]'].type).toBe(PAGE_TYPES.ssg)
          })

          it('should return correct type of page: SSR', () => {
            expect(pagesMap['/dynamic/ssr/[id]'].type).toBe(PAGE_TYPES.ssr)
          })

          it('should return correct type of page: ISG', () => {
            expect(pagesMap['/dynamic/fallback_true/[id]'].type).toBe(PAGE_TYPES.isg)
          })

          it('should return correct type of page: ISR', () => {
            expect(pagesMap['/dynamic/fallback_true_revalidate/[id]'].type).toBe(PAGE_TYPES.isr)
          })
        })

        describe('isDynamic', () => {
          it('should return isDynamic: true for pages with dynamic route', () => {
            expect(pagesMap['/api/dynamic/[id]'].isDynamic).toBe(true)
            expect(pagesMap['/en-US/dynamic/ssg/[id]'].isDynamic).toBe(true)
            expect(pagesMap['/fr/dynamic/ssg/[id]'].isDynamic).toBe(true)
            expect(pagesMap['/nl-NL/dynamic/ssg/[id]'].isDynamic).toBe(true)
            expect(pagesMap['/dynamic/ssr/[id]'].isDynamic).toBe(true)
            expect(pagesMap['/dynamic/fallback_true/[id]'].isDynamic).toBe(true)
            expect(pagesMap['/dynamic/fallback_true_revalidate/[id]'].isDynamic).toBe(true)
          })
          it('should return isDynamic: false for pages with static route', () => {
            expect(pagesMap['/_app'].isDynamic).toBe(false)
            expect(pagesMap['/static'].isDynamic).toBe(false)
            expect(pagesMap['/en-US/ssg'].isDynamic).toBe(false)
            expect(pagesMap['/fr/ssg'].isDynamic).toBe(false)
            expect(pagesMap['/nl-NL/ssg'].isDynamic).toBe(false)
          })
        })

        describe('isPrerendered', () => {
          it('should return isPrerendered: true for pages which are in prerender-manifest.json', () => {
            expect(pagesMap['/dynamic/fallback_true/[id]'].isPrerendered).toBe(true)
            expect(pagesMap['/dynamic/fallback_true_revalidate/[id]'].isPrerendered).toBe(true)
            expect(pagesMap['/en-US/ssg'].isPrerendered).toBe(true)
            expect(pagesMap['/fr/ssg'].isPrerendered).toBe(true)
            expect(pagesMap['/nl-NL/ssg'].isPrerendered).toBe(true)
            expect(pagesMap['/static'].isPrerendered).toBe(true)
            expect(pagesMap['/en-US/dynamic/ssg/[id]'].isPrerendered).toBe(true)
            expect(pagesMap['/fr/dynamic/ssg/[id]'].isPrerendered).toBe(true)
            expect(pagesMap['/nl-NL/dynamic/ssg/[id]'].isPrerendered).toBe(true)
          })
          it('should return isPrerendered: false for pages which are not in prerender-manifest.json', () => {
            expect(pagesMap['/api/dynamic/[id]'].isPrerendered).toBe(false)
            expect(pagesMap['/dynamic/ssr/[id]'].isPrerendered).toBe(false)
            expect(pagesMap['/_app'].isPrerendered).toBe(false)
          })
        })

        describe('prerenderedRoutes', () => {
          it('should return prerendered routes of dynamic SSG page with no data route', () => {
            expect(pagesMap['/en-US/dynamic/ssg/[id]'].prerenderedRoutes).toEqual([
              {
                dataRoute: undefined,
                initialRevalidateSeconds: undefined,
                nextRoute: '/en-US/dynamic/ssg/[id]',
                route: '/en-US/dynamic/ssg/:id',
              },
              {
                dataRoute: undefined,
                initialRevalidateSeconds: undefined,
                nextRoute: '/dynamic/ssg/[id]',
                route: '/dynamic/ssg/:id',
              },
            ])
            expect(pagesMap['/fr/dynamic/ssg/[id]'].prerenderedRoutes).toEqual([
              {
                dataRoute: undefined,
                initialRevalidateSeconds: undefined,
                nextRoute: '/fr/dynamic/ssg/[id]',
                route: '/fr/dynamic/ssg/:id',
              },
            ])
            expect(pagesMap['/nl-NL/dynamic/ssg/[id]'].prerenderedRoutes).toEqual([
              {
                dataRoute: undefined,
                initialRevalidateSeconds: undefined,
                nextRoute: '/nl-NL/dynamic/ssg/[id]',
                route: '/nl-NL/dynamic/ssg/:id',
              },
            ])
          })

          it('should return prerendered routes of dynamic ISG page and fallback:true', () => {
            expect(pagesMap['/dynamic/fallback_true/[id]'].prerenderedRoutes).toEqual([
              {
                dataRoute: '/_next/data/buildId/en-US/dynamic/fallback_true/1.json',
                initialRevalidateSeconds: false,
                nextRoute: '/en-US/dynamic/fallback_true/1',
                route: '/en-US/dynamic/fallback_true/1',
              },
              {
                dataRoute: '/_next/data/buildId/dynamic/fallback_true/1.json',
                initialRevalidateSeconds: false,
                nextRoute: '/dynamic/fallback_true/1',
                route: '/dynamic/fallback_true/1',
              },
              {
                dataRoute: '/_next/data/buildId/en-US/dynamic/fallback_true/2.json',
                initialRevalidateSeconds: false,
                nextRoute: '/en-US/dynamic/fallback_true/2',
                route: '/en-US/dynamic/fallback_true/2',
              },
              {
                dataRoute: '/_next/data/buildId/dynamic/fallback_true/2.json',
                initialRevalidateSeconds: false,
                nextRoute: '/dynamic/fallback_true/2',
                route: '/dynamic/fallback_true/2',
              },
            ])
          })

          it('should return prerendered routes of dynamic ISR page with fallback:true', () => {
            expect(pagesMap['/dynamic/fallback_true_revalidate/[id]'].prerenderedRoutes).toEqual([
              {
                dataRoute: '/_next/data/buildId/en-US/dynamic/fallback_true_revalidate/1.json',
                initialRevalidateSeconds: 360,
                nextRoute: '/en-US/dynamic/fallback_true_revalidate/1',
                route: '/en-US/dynamic/fallback_true_revalidate/1',
              },
              {
                dataRoute: '/_next/data/buildId/dynamic/fallback_true_revalidate/1.json',
                initialRevalidateSeconds: 360,
                nextRoute: '/dynamic/fallback_true_revalidate/1',
                route: '/dynamic/fallback_true_revalidate/1',
              },
              {
                dataRoute: '/_next/data/buildId/en-US/dynamic/fallback_true_revalidate/2.json',
                initialRevalidateSeconds: 360,
                nextRoute: '/en-US/dynamic/fallback_true_revalidate/2',
                route: '/en-US/dynamic/fallback_true_revalidate/2',
              },
              {
                dataRoute: '/_next/data/buildId/dynamic/fallback_true_revalidate/2.json',
                initialRevalidateSeconds: 360,
                nextRoute: '/dynamic/fallback_true_revalidate/2',
                route: '/dynamic/fallback_true_revalidate/2',
              },
            ])
          })

          it('should return prerendered routes of static SSG page without getStaticProps', () => {
            expect(pagesMap['/en-US/ssg'].prerenderedRoutes).toEqual([
              {
                dataRoute: undefined,
                initialRevalidateSeconds: undefined,
                nextRoute: '/en-US/ssg',
                route: '/en-US/ssg',
              },
              {
                dataRoute: undefined,
                initialRevalidateSeconds: undefined,
                nextRoute: '/ssg',
                route: '/ssg',
              },
            ])
            expect(pagesMap['/fr/ssg'].prerenderedRoutes).toEqual([
              {
                dataRoute: undefined,
                initialRevalidateSeconds: undefined,
                nextRoute: '/fr/ssg',
                route: '/fr/ssg',
              },
            ])
          })

          it('should return prerendered routes of static SSG page with getStaticProps', () => {
            expect(pagesMap['/static'].prerenderedRoutes).toEqual([
              {
                dataRoute: '/_next/data/buildId/en-US/static.json',
                initialRevalidateSeconds: false,
                nextRoute: '/en-US/static',
                route: '/en-US/static',
              },
              {
                dataRoute: '/_next/data/buildId/static.json',
                initialRevalidateSeconds: false,
                nextRoute: '/static',
                route: '/static',
              },
              {
                dataRoute: '/_next/data/buildId/fr/static.json',
                initialRevalidateSeconds: false,
                nextRoute: '/fr/static',
                route: '/fr/static',
              },
              {
                dataRoute: '/_next/data/buildId/nl-NL/static.json',
                initialRevalidateSeconds: false,
                nextRoute: '/nl-NL/static',
                route: '/nl-NL/static',
              },
            ])
          })

          it('should return prerendered routes of static SSG index page with getStaticProps', () => {
            expect(pagesMap['/'].prerenderedRoutes).toEqual([
              {
                dataRoute: '/_next/data/buildId/en-US.json',
                initialRevalidateSeconds: false,
                nextRoute: '/en-US',
                route: '/en-US',
              },
              {
                dataRoute: '/_next/data/buildId/index.json',
                initialRevalidateSeconds: undefined,
                nextRoute: '/',
                route: '/',
              },
              {
                dataRoute: '/_next/data/buildId/fr.json',
                initialRevalidateSeconds: false,
                nextRoute: '/fr',
                route: '/fr',
              },
              {
                dataRoute: '/_next/data/buildId/nl-NL.json',
                initialRevalidateSeconds: false,
                nextRoute: '/nl-NL',
                route: '/nl-NL',
              },
            ])
          })
        })

        describe('initialRevalidateSeconds', () => {
          it('should return initialRevalidateSeconds for pages with revalidation', () => {
            pagesMap['/dynamic/revalidate']?.prerenderedRoutes?.forEach(
              ({ initialRevalidateSeconds }) => {
                expect(initialRevalidateSeconds).toBe(10)
              }
            )
            pagesMap['/dynamic/fallback_true_revalidate/[id]']?.prerenderedRoutes?.forEach(
              ({ initialRevalidateSeconds }) => {
                expect(initialRevalidateSeconds).toBe(360)
              }
            )
          })
        })

        describe('fallback', () => {
          it('should return fallback type for prerendered pages with dynamic route', () => {
            expect(pagesMap['/dynamic/fallback_true/[id]'].fallback).toBe(FALLBACK_TYPES.true)
            expect(pagesMap['/dynamic/fallback_false/[id]'].fallback).toBe(FALLBACK_TYPES.false)
            expect(pagesMap['/dynamic/fallback_blocking/[id]'].fallback).toBe(
              FALLBACK_TYPES.blocking
            )
          })
          it('should return fallback HTML page for pages with fallbackType:true', () => {
            expect(pagesMap['/dynamic/fallback_true/[id]'].fallbackPage).toBe(
              '/dynamic/fallback_true/[id].html'
            )
          })
        })

        describe('page source', () => {
          it('should return page source (pages or app folder', () => {
            expect(pagesMap['/static'].pageSource).toBe(PAGE_SOURCE_TYPES.pages)
            expect(pagesMap['/app-folder-page'].pageSource).toBe(PAGE_SOURCE_TYPES.app)
          })
        })
      })
    })
  })
})
