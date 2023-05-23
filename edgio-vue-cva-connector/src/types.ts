export const VITE_CONFIG_FILE = 'vite.config.js'
export const VUE_CONFIG_FILE = 'vue.config.js'
export const SERIALIZED_CONFIG_FILE = 'vue.config.json'
export const PROJECT_TYPES = {
  vueCli: 'vueCli',
  vite: 'vite',
}
export type ProjectType = (typeof PROJECT_TYPES)[keyof typeof PROJECT_TYPES]
