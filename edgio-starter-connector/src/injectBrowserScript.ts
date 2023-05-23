import Response from '@edgio/core/runtime/Response'
import cheerio from 'cheerio'
import getBuildVersion from './getBuildVersion'
import responseBodyToString from '@edgio/core/utils/responseBodyToString'

const version = getBuildVersion()

/**
 * Adds browser.ts to the document
 * @param response The response from the origin
 */
export default function injectBrowserScript(response: Response) {
  if (response.body) {
    const $ = cheerio.load(responseBodyToString(response))

    $('head').append(
      `<script src="/__edgio__/${encodeURIComponent(version)}/browser.js" defer></script>`
    )

    response.body = $.html()
  }
}
