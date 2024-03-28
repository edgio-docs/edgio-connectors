import { Router } from '@edgio/core'
import { DeploymentBuilder } from '@edgio/core/deploy'
import DevServerOptions from '@edgio/core/dev/DevServerOptions'

interface ProdOptions {
  serverPath?: string
  run?: (module: any) => void | Promise<void>
}

export enum BundlerType {
  NFT = '@vercel/nft',
  NCC = '@vercel/ncc',
  ESBUILD = 'esbuild',
}

export interface DisabledDefaultRoutes {
  serverless?: boolean
  serviceWorker?: boolean
}

interface BuildOptions {
  command?: string
  buildFolder?: string
  entryFile?: string
  entryOutputFile?: string
  // executed after build command, before bundler
  addAssets?: (builder: DeploymentBuilder) => Promise<void> | void
  // works only if entryFile is defined, will be done as a last step in the build process
  bundler?: BundlerType | null
}

// We inject everything that can be considered 'large' - we aim to have connector definitions only a few Kb, not few HUNDREDS Kb,
// as they are imported by prod.ts at runtime in lambda - so it doesnt make sense to duplicate source if we can easily avoid it.
export interface Connector {
  name: string
  withServiceWorker?: { withGlob: boolean } | boolean
  withServerless?: boolean | ((edgioConfig: any) => boolean)
  static404Error?: string | ((edgioConfig: any) => string | void)
  templateConfig?: string
  templateRoutes?: string
  onRegister?: (router: Router) => void
  initCommand?: () => void | Promise<void>
  devCommand?:
    | DevServerOptions
    | ((edgioConfig: any) => DevServerOptions | Promise<DevServerOptions>)
  prodCommand?:
    | ProdOptions
    | ((edgioConfig: any, port: number) => ProdOptions | Promise<ProdOptions>)
  staticFolder?: string | ((edgioConfig: any) => string | void)
  buildCommand?:
    | BuildOptions
    | ((edgioConfig: any, builder: DeploymentBuilder) => BuildOptions | Promise<BuildOptions>)
}
