import getDistDir from '../util/getDistDir'
import NextBuilder from './NextBuilder'
import { BuildOptions } from '@edgio/core/deploy'

export default async function build(options: BuildOptions) {
  const nextBuilder = new NextBuilder({
    srcDir: '.',
    distDir: getDistDir(),
    buildCommand: 'npx next build',
  })
  await nextBuilder.build(options)
}
