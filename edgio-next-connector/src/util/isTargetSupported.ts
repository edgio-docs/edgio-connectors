import { satisfies, coerce } from 'semver'

/**
 * Returns true if the 'target' config is supported. This config stopped being supported in Next 12.2
 * @param nextVersion
 * @returns
 */
export default function isTargetSupported(nextVersion: string | null): boolean {
  const version = coerce(nextVersion)
  if (version) return satisfies(version, '< 12.2.0')

  return true
}
