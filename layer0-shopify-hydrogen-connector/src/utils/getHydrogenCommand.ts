// @ts-ignore
import { isYarn } from '@layer0/cli/utils/packageManager'

export default function getHydrogenCommand(...args: string[]) {
  return `${isYarn() ? 'yarn' : 'npx'} shopify hydrogen ${args.join(' ')}`
}
