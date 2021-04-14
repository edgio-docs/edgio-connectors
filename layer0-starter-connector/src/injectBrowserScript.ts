import cheerio from 'cheerio'
import Response from '@layer0/core/router/Response'
import getBuildVersion from './getBuildVersion'

const version = getBuildVersion()

/**
 * Adds browser.ts to the document
 * @param response The response from the origin
 */
export default function injectBrowserScript(response: Response) {
  if (response.body) {
    const $ = cheerio.load(response.body)
    $('head').append(
      `<script src="/__layer0__/${encodeURIComponent(version)}/browser.js" defer></script>`
    )
    response.body = $.html()
  }
}
