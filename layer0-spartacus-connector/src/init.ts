/* istanbul ignore file */
import { join } from 'path'
import { DeploymentBuilder } from '@layer0/core/deploy'
import { getAngularProject } from '@layer0/angular/utils/getBuildPath'

/**
 * Adds all required dependencies and files to the user's app by copying them
 * over from src/default-app.
 */
export default function init() {
  const builder = new DeploymentBuilder(process.cwd())
  const yarnOrNpmRun = builder.isYarn() ? 'yarn' : 'npm run'

  builder.addDefaultAppResources(join(__dirname, 'default-app')).addDefaultLayer0Scripts(
    {
      'dev:ssr': `ng run ${getAngularProject()}:serve-ssr --port=3001`,
      'layer0:sw:dev': 'webpack --config=sw/webpack.config.js --progress',
      'layer0:sw:prod':
        'NODE_ENV=production webpack --config=sw/webpack.config.js --progress && node ./sw/inject-manifest.js',
      'postbuild:ssr': `${yarnOrNpmRun} layer0:sw:prod`,
      'layer0:dev': `${yarnOrNpmRun} layer0:sw:dev && layer0 dev`,
    },
    true
  )
}
