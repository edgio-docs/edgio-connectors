# Edgio Connectors

Connector packages help build and run your app within Edgio. When you run `edgio init`, the Edgio CLI detects the framework used by your app and installs the corresponding connector package. For example, if you use Next.js, `@edgio/next` will be installed. If no connector package exists for the framework that you use, you can still deploy to Edgio by implementing the connector interface directly in your app.

For more details on implementing your own connector, see our guide at https://docs.edg.io/guides/connectors.

## Supported Frameworks

Out of the box, Edgio supports the following frameworks:

- Angular
- Fastboot
- Frontity
- Gatsby
- Next
- Nuxt
- Razzle
- Sapper
- Spartacus
- Sveltekit
- Vue Storefront
- ... plus more!
