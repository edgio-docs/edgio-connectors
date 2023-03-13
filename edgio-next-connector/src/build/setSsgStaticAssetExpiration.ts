// This code is not used / it's defined
// import { DeploymentBuilder } from '@edgio/core/deploy'
// import { FAR_FUTURE_TTL } from '../router/constants'
//
// /**
//  * Configure SSG pages to expire based on the revalidate time returned by getStaticProps, which
//  * is stored in .next/prerender-manifest.json
//  */
// export default function setSsgStaticAssetExpiration(
//   builder: DeploymentBuilder,
//   prerenderManifest: { [key: string]: any },
//   distDir: string,
//   defaultLocale?: string
// ) {
//   for (let [path, entry] of Object.entries(prerenderManifest.routes)) {
//     const { initialRevalidateSeconds } = <any>entry
//
//     if (path.endsWith('/')) {
//       path = path + 'index'
//     }
//
//     if (initialRevalidateSeconds) {
//       addStaticAsset(builder, distDir, path, initialRevalidateSeconds)
//
//       if (defaultLocale) {
//         if (path.startsWith(`/${defaultLocale}/`)) {
//           // Next.js does not include information for paths rendered without a locale prefix in prerender-manifest.json,
//           // so we need to derive based on the paths rendered for the default locale.
//           // Here we add the same TTL for the HTML and JSON without a locale prefix
//           // handle /some-file.js and /some-dir/index.js with ISR and localization
//           const withoutLocale = path.slice(defaultLocale.length + 1)
//           addStaticAsset(builder, distDir, withoutLocale, initialRevalidateSeconds)
//         } else if (path === `/${defaultLocale}`) {
//           // handle /index.js with ISR and localization
//           addStaticAsset(builder, distDir, '/index', initialRevalidateSeconds)
//         }
//       }
//     }
//   }
// }
//
// function addStaticAsset(
//   builder: DeploymentBuilder,
//   distDir: string,
//   path: string,
//   initialRevalidateSeconds: any
// ) {
//   builder
//     .setStaticAssetExpiration(
//       `${distDir}/pages${path}.html`,
//       initialRevalidateSeconds,
//       FAR_FUTURE_TTL
//     )
//     .setStaticAssetExpiration(
//       `${distDir}/pages${path}.json`,
//       initialRevalidateSeconds,
//       FAR_FUTURE_TTL
//     )
// }
