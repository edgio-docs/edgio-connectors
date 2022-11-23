import createDevServer from '@edgio/core/dev/createDevServer'

export default async function dev() {
  return createDevServer({
    label: 'Gatsby',
    command: port => `npx gatsby develop --port ${port}`,
    ready: [/localhost:/i],
  })
}
