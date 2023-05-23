import { getServerBuildAvailability } from './getServerBuildAvailability'
import { ExtendedConfig, RENDER_MODES } from '../types'
import { getConfig } from '@edgio/core'

/**
 * Returns the render mode for the current build.
 * @param nextConfig
 */
export default function getRenderMode(nextConfig: any) {
  const edgioConfig = getConfig() as ExtendedConfig
  if (edgioConfig?.next?.forceServerBuild) return RENDER_MODES.server

  const { useServerBuild } = getServerBuildAvailability({ config: nextConfig })
  return useServerBuild ? RENDER_MODES.server : RENDER_MODES.serverless
}
