import resolvePackagePath from 'resolve-package-path'

/**
 * Returns the installed version of Next.js
 * @returns
 */
export default function getNextVersion(): string {
  // This will return the path to the main module, which will not necessarily be in the root
  // directory of the package. Next.js is one such example.
  const packagePath = resolvePackagePath('next', process.cwd())

  if (!packagePath) {
    throw new Error(
      'Unable to determine the version of Next being used. The next package could not be found.'
    )
  }

  return eval('require')(packagePath).version
}
