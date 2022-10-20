// @ts-ignore
import { isYarn } from '@edgio/cli/utils/packageManager'

export default function getHydrogenCommand(...args: string[]) {
  return `${isYarn() ? 'yarn' : 'npx'} shopify hydrogen ${args.join(' ')}`
}
