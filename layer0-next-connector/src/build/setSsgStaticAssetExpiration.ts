import { DeploymentBuilder } from '@layer0/core/deploy'

/**
 * Configure SSG pages to expire based on the revalidate time returned by getStaticProps, which
 * is stored in .next/prerender-manifest.json
 */
export default function setSsgStaticAssetExpiration(
  builder: DeploymentBuilder,
  prerenderManifest: { [key: string]: any },
  distDir: string
) {
  for (let [path, entry] of Object.entries(prerenderManifest.routes)) {
    const { initialRevalidateSeconds } = <any>entry

    if (path.endsWith('/')) {
      path = path + 'index'
    }

    if (initialRevalidateSeconds) {
      builder
        .setStaticAssetExpiration(
          `${distDir}/serverless/pages${path}.html`,
          initialRevalidateSeconds,
          initialRevalidateSeconds // temporary fix to pass build
        )
        .setStaticAssetExpiration(
          `${distDir}/serverless/pages${path}.json`,
          initialRevalidateSeconds,
          initialRevalidateSeconds // temporary fix to pass build
        )
    }
  }
}
