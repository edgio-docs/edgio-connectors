import { satisfies } from 'semver'

/**
 * Returns true if the 'target' config is supported. This config stopped being supported in Next 12.2
 * @param nextVersion
 * @returns
 */
export default function isTargetSupported(nextVersion: string | null) {
  if (nextVersion) {
    return !satisfies(nextVersion, '>= 12.2.0')
  } else {
    return true
  }
}
