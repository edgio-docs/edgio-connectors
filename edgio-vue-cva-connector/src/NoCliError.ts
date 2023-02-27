export default class NoCliError extends Error {
  constructor() {
    super(
      `No Vue CLI installed - ideally, please install Vite-based "create-vue" CLI. Read more: https://vuejs.org/guide/scaling-up/tooling.html`
    )
  }
}
