import { satisfies } from 'semver'
import getNextVersion from './getNextVersion'
import isTargetSupported from './isTargetSupported'

let memoized:
  | undefined
  | { serverBuildAvailable: boolean; useServerBuild: boolean; standaloneBuildConfig: any }

export const getServerBuildAvailability = ({
  config,
  quiet = false,
}: {
  config: { target?: string }
  quiet?: boolean
}) => {
  if (!memoized) {
    const nextVersion = getNextVersion()

    let serverBuildAvailable = false,
      useServerBuild = false,
      standaloneBuildConfig: any = {}

    if (nextVersion) {
      serverBuildAvailable = satisfies(nextVersion, '>= 12.0.0')

      if (!isTargetSupported(nextVersion)) {
        useServerBuild = true
        standaloneBuildConfig = { output: 'standalone' }
      } else if (serverBuildAvailable && config.target === 'server') {
        useServerBuild = true
        standaloneBuildConfig = { experimental: { outputStandalone: true } }
      }
    }

    if (serverBuildAvailable && !useServerBuild && !quiet) {
      console.warn(
        '[Edgio]',
        '@edgio/next will utilize the "server" target by default in future versions.'
      )
      console.warn(
        '[Edgio]',
        'Opt in early by setting "target: server" in your next.config.js file.'
      )
      console.warn(
        '[Edgio]',
        'More information: https://docs.edg.io/guides/next#section_next_js_version_12_and_next_js_middleware__beta_'
      )
    }

    memoized = { serverBuildAvailable, useServerBuild, standaloneBuildConfig }
  }

  return memoized
}
