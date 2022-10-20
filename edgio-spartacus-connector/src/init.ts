/* istanbul ignore file */
import { join } from 'path'
import { DeploymentBuilder } from '@edgio/core/deploy'
import { getAngularProject } from '@edgio/angular/utils/getBuildPath'

/**
 * Adds all required dependencies and files to the user's app by copying them
 * over from src/default-app.
 */
export default function init() {
  const builder = new DeploymentBuilder(process.cwd())
  const yarnOrNpmRun = builder.isYarn() ? 'yarn' : 'npm run'

  builder.addDefaultAppResources(join(__dirname, 'default-app')).addDefaultEdgioScripts(
    {
      'dev:ssr': `ng run ${getAngularProject()}:serve-ssr --port=3001`,
      'edgio:sw:dev': 'webpack --config=sw/webpack.config.js --progress',
      'edgio:sw:prod':
        'NODE_ENV=production webpack --config=sw/webpack.config.js --progress && node ./sw/inject-manifest.js',
      'postbuild:ssr': `${yarnOrNpmRun} edgio:sw:prod`,
      'edgio:dev': `${yarnOrNpmRun} edgio:sw:dev && edgio dev`,
    },
    true
  )
}
