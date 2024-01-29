import { satisfies } from 'semver'

/**
 * Returns the value of NODE_OPTIONS environment variable
 * with params needed to run older Next.js versions.
 * @returns
 */
export default function getNodeOptions(nextVersion: string): string {
  // We need to add openssl-legacy-provider for Next.js < 12 to NODE_OPTIONS
  // only for Node 17 and newer versions otherwise it will fail
  // with error: "node: --openssl-legacy-provider is not allowed in NODE_OPTIONS"
  if (satisfies(nextVersion, '< 12.0.0') && satisfies(process.version, '>= 17.0.0')) {
    return `--openssl-legacy-provider ${process?.env?.NODE_OPTIONS || ''}`
  }
  return process?.env?.NODE_OPTIONS || ''
}
