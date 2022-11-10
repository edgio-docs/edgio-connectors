export interface ExcludeConfig {
  type: 'string' | 'RegExp'
  value: string
}

export interface GenerateConfig {
  fallback?: string | boolean
  exclude?: ExcludeConfig[]
}

export interface NuxtConfig {
  target?: string
  generate?: GenerateConfig
  buildDir?: string
}
