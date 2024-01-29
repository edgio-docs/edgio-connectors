import type Config from '@edgio/core/config'

/**
 * Extended object of config from edgio.config.js
 * with connector specific properties.
 */
export interface ExtendedConfig extends Config {
  astro?: {
    /**
     * The path of the standalone server that runs Astro SSR
     * The dependencies for this file are automatically bundled.
     */
    appPath?: string
  }
}
