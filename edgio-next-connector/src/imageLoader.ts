export interface ImageLoaderProps {
  config?: {
    path: string
  }
  src: string
  width?: number
  height?: number
  quality?: number
}

/**
 * This is a custom loader for next/image
 * that is used to optimize images with new Edgio Image Optimizer powered by Sailfish.
 *
 * When Edgio Image Optimizer is disabled, this loader is not used
 * and images are optimized by next's built-in image optimizer.
 *
 * See plugins/withImageLoaderConfig.ts for more details and
 * https://nextjs.org/docs/pages/api-reference/next-config-js/images
 * for more information about image loaders.
 */
export default function imageLoader({ src, width, height, quality }: ImageLoaderProps) {
  // Edgio Image Optimizer.
  // NOTE: The Sailfish Image Optimizer is throwing an error
  // when the query params are defined in the url but left empty.
  // That's why we need to add only defined query params here.
  const params = new URLSearchParams({
    // We'll use webp format for all images.
    format: 'webp',
  })
  if (width) params.set('width', width.toString())
  if (height) params.set('height', height.toString())
  if (quality) params.set('quality', quality.toString())

  return `${src}?${params.toString()}`
}
