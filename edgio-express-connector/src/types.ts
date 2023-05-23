import type Config from '@edgio/core/config'

/**
 * Extended object of config from edgio.config.js
 * with connector specific properties.
 */
export interface ExtendedConfig extends Config {
  express?: {
    /**
     * The main entry point for your app, which exports an instance of express app.
     * This file and its dependencies will be bundled into a single file for serverless deployment.
     *
     * If omitted, Edgio will try to find your app in one of the following files:
     * - ./src/server.ts
     * - ./src/server.js
     * - ./src/app.ts
     * - ./src/app.js
     * - ./src/index.ts
     * - ./src/index.js
     * - ./server.js
     * - ./app.js
     * - ./index.js
     */
    appPath?: string

    /**
     * The bundler which will be used to bundle your app.
     */
    bundler?: string
  }
}
