export interface ExcludeConfig {
  type: 'string' | 'RegExp'
  value: string
}

export interface NuxtConfig {
  target?: string
  generate?: GenerateConfig
}

export interface GenerateConfig {
  fallback?: string | boolean
  exclude?: ExcludeConfig[]
}
