import { EDGIO_IMAGE_PROXY_PATH } from './constants'

export interface ImageLoaderProps {
  config?: {
    path: string
  }
  src: string
  width?: number
  height?: number
  quality?: number
  unoptimized?: boolean
}

/**
 * This is a custom loader for next/image
 * that is used to optimize images with new Edgio Image Optimizer powered by Sailfish.
 *
 * Images on relative paths can be optimized directly.
 * Images on remote hosts are first proxied through the user's lambda
 * using Edgio Image Proxy (see NextRoutes.ts) and then optimized by Sailfish Image Optimizer.
 * The Edgio Image Proxy is used to validates the remote patterns from next.config.js
 * and proxies only allowed URLs.
 *
 * When Edgio Image Optimizer is disabled, this loader is not used
 * and images are optimized by next's built-in image optimizer.
 *
 * NOTE: This loader runs on both server and client side,
 * so don't use any browser/node specific APIs here.
 *
 * See plugins/withImageLoaderConfig.ts for more details and
 * https://nextjs.org/docs/pages/api-reference/next-config-js/images
 * for more information about image loaders.
 */
export default function imageLoader({
  src,
  width,
  height,
  quality,
  unoptimized,
}: ImageLoaderProps) {
  if (unoptimized) return src

  // The Sailfish Image Optimizer is throwing an error
  // when the query params are defined in the url but left empty.
  // That's why we need to add only defined query params here.
  const params = new URLSearchParams({
    // We'll use webp format for all images.
    format: 'webp',
  })

  // If the image src is relative, we'll keep the original path
  // @example
  // <Image src="/image.jpg" /> => /image.jpg?format=webp
  // If the image src is absolute path on remote host,
  // we'll remap it to Edgio Image Proxy.
  // @example
  // <Image src="https://cdn.pixels/image.jpg" /> => /__edgio__/image?url=https%3A%2F%2Fcdn.pixels%2Fimage.jpg?format=webp
  const isAbsolute = src.startsWith('http') || src.startsWith('//')
  const path = isAbsolute ? EDGIO_IMAGE_PROXY_PATH : src

  if (isAbsolute) params.set('url', src)
  if (width) params.set('width', width.toString())
  if (height) params.set('height', height.toString())
  if (quality) params.set('quality', quality.toString())

  return `${path}?${params.toString()}`
}
