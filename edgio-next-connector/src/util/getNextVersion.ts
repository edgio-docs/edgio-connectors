import resolvePackagePath from 'resolve-package-path'

/**
 * Returns the installed version of Next.js
 * @returns
 */
export default function getNextVersion(): string | null {
  // This will return the path to the main module, which will not necessarily be in the root
  // directory of the package. Next.js is one such example.
  const packagePath = resolvePackagePath('next', process.cwd())

  if (!packagePath) {
    return null
  }

  return eval('require')(packagePath).version
}
