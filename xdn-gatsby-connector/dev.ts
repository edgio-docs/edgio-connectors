import createDevServer from '@xdn/core/dev/createDevServer'

export default async function dev() {
  return createDevServer({
    label: 'Gatsby',
    command: port => `npx gatsby develop --port ${port}`,
    ready: [/success Building development bundle - /i],
  })
}
