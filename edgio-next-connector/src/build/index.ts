import NextBuilder from './NextBuilder'
import { BuildOptions } from '@edgio/core/deploy'
import chalk from 'chalk'

export default async function build(options: BuildOptions) {
  try{
    await new NextBuilder({
      buildCommand: 'npx next build'
    }).build(options)
  }catch (e: any){
    console.error("\r\n")
    console.error(chalk.red(e.stack))
    process.exit(1)
  }
}
