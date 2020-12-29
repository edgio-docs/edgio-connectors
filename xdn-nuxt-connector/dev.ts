import createDevServer from '@xdn/core/dev/createDevServer'

export default async function dev() {
  return createDevServer({
    label: 'Nuxt',
    command: () => 'npx nuxt dev',
    ready: [/Listening on/i, /Listening on/i],
  })
}
