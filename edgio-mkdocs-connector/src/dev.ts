/* istanbul ignore file */
import { createDevServer } from '@edgio/core/dev'

export default function () {
  let command = 'mkdocs serve'

  // Spawn a child process
  var spawn = require('child_process').spawnSync
  // Check if mkdocs is referenced in the PATH
  var out = spawn(`mkdocs --version`, ['/?'], { encoding: 'utf8' })
  if (out.error) {
    // If mkdocs doesn't exist in the path
    console.log('> Encountered the following error with `mkdocs --version`.')
    console.log(out.error)
    console.log(
      '\n> Attempting to determine the correct way to run mkdocs app in developement mode with `python -m mkdocs --version`.'
    )
    // Try with python -m prefix
    var out2 = spawn(`python -m mkdocs --version`, ['/?'], { encoding: 'utf8' })
    // If python -m mkdocs doesn't exist in the path
    if (out2.error) {
      console.log('> Encountered the following error with `python -m mkdocs --version`.')
      console.log(out2.error)
      console.log(
        '\n> Attempting to determine the correct way to run mkdocs app in developement mode with `python3 -m mkdocs --version`.'
      )
      // Try with python3 -m prefix
      var out3 = spawn(`python3 -m mkdocs --version`, ['/?'], { encoding: 'utf8' })
      if (out3.error) {
        console.log('> Encountered the following error with `python3 -m mkdocs --version`.')
        console.log(out3.error)
      }
      // If python3 -m mkdocs works
      else {
        command = `python3 -m ${command}`
      }
    }
    // If python -m mkdocs works
    else {
      command = `python -m ${command}`
    }
    // Don't need to do anything if mkdocs is in the path
  }

  return createDevServer({
    label: 'MkDocs',
    command: port => `${command} --dev-addr localhost:${port}`,
    ready: [/localhost:/i],
  })
}
