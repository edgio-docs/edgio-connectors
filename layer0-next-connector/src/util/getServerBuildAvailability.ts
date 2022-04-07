import semverMajor from 'semver/functions/major'
import resolvePackagePath from 'resolve-package-path'

function getNextMajorVersion(): number | null {
  // This will return the path to the main module, which will not necessarily be in the root
  // directory of the package. Next.js is one such example.
  const packagePath = resolvePackagePath('next', process.cwd())
  return packagePath ? semverMajor(eval('require')(packagePath).version) : null
}

let memoized: undefined | { serverBuildAvailable: boolean; useServerBuild: boolean }

export const getServerBuildAvailability = ({ config }: { config: { target?: string } }) => {
  if (memoized) return memoized

  const nextMajorVersion = getNextMajorVersion()
  const serverBuildAvailable = Boolean(nextMajorVersion && nextMajorVersion >= 12)
  const useServerBuild = serverBuildAvailable && config.target === 'server'

  if (serverBuildAvailable && !useServerBuild) {
    console.warn('`@layer0/next` will utilize the `server` target by default in future versions.')
    console.warn('Opt in early by setting `target: server` in your `next.config.js` file.')
    console.warn(
      'More information: https://docs.layer0.co/guides/next#section_next_js_version_12_and_next_js_middleware__beta_'
    )
  }

  memoized = { serverBuildAvailable, useServerBuild }
  return { serverBuildAvailable, useServerBuild }
}
