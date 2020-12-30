# XDN Connectors

Connector packages help build and run your app within the XDN. When you run `xdn init`, the XDN CLI detects the framework used by your app and installs the corresponding connector package. For example, if you use Next.js, `@xdn/next` will be installed. If no connector package exists for the framework that you use, you can still deploy to the XDN by implementing the connector interface directly in your app.

For more details on implementing your own connector, see our guide at https://developer.moovweb.com/guides/connectors.

## Supported Frameworks

Out of the box, the XDN supports the following frameworks:

- Angular
- Gatsby
- Next
- Nuxt
- Sapper
- Spartacus
- Vue Storefront
