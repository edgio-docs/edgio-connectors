export const VUE_CONFIG_NAME = 'vue.config.json'

// normalized config across different CLIs, containing only supported attributes
export type VueConfig = {
  outDir: string
}
