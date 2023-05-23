// This file was automatically added by edgio init.
// You should commit this file to source control.
// Learn more about this file at https://docs.edg.io/guides/edgio_config
module.exports = {
  connector: '@edgio/nuxt',

  // The name of the site in Edgio to which this app should be deployed.
  // name: 'my-site-name',

  // The name of the team in Edgio to which this app should be deployed.
  // team: 'my-team-name',

  // Overrides the default path to the routes file. The path should be relative to the root of your app.
  // routes: 'routes.js',

  // origins: [
  //   {
  //     // This is origin with simple configuration
  //     // The name of the backend origin
  //     name: "origin",
  //
  //     // When provided, the following value will be sent as the host header when connecting to the origin.
  //     // If omitted, the host header from the browser will be forwarded to the origin.
  //     override_host_header: "example.com",
  //
  //     // The list of backend hosts
  //     hosts: [
  //       {
  //         // The domain name or IP address of the origin server
  //         location: "example.com"
  //       }
  //     ]
  //   },
  //   {
  //     // This is origin with complex configuration
  //     // The name of the backend origin
  //     name: "complex_origin",
  //
  //     // When provided, the following value will be sent as the host header when connecting to the origin.
  //     // If omitted, the host header from the browser will be forwarded to the origin.
  //     override_host_header: "example.com",
  //
  //     tls_verify: {
  //       // Uncomment the following line if TLS is not set up properly on the origin domain and you want to allow self signed certs.
  //       // allow_self_signed_certs: true
  //     },
  //
  //     // The load balancer will spread traffic across the provided hosts based on this config.
  //     // Possible values are:
  //     // 'round_robin' - Iterates through the hosts and sends traffic to across them in provided order
  //     balancer: 'round_robin',
  //
  //     // The list of backend hosts
  //     hosts: [
  //       {
  //         location: {
  //           // The domain name or IP address of the origin server
  //           hostname: 'example.com',
  //
  //           // Overrides the default ports (80 for http and 443 for https) and instead use a specific port
  //           // when connecting to the origin
  //           port: 443
  //         },
  //
  //         // Allows to set specific protocol. The protocol is by default determined using 'match' option.
  //         // Other possible values are 'http' and 'https'.
  //         scheme: 'match'
  //       }
  //     ]
  //   }
  // ],

  // The maximum number of URLs that will be concurrently prerendered during deployment when static prerendering is enabled.
  // Defaults to 200, which is the maximum allowed value.
  // prerenderConcurrency: 200,

  // A list of glob patterns identifying which prerenderConcurrency source files should be uploaded when running edgio deploy --includeSources.
  // This option is primarily used to share source code with Edgio support personnel for the purpose of debugging. If omitted,
  // edgio deploy --includeSources will result in all files which are not gitignored being uploaded to Edgio.
  //
  // sources : [
  //   '**/*', // include all files
  //   '!(**/secrets/**/*)', // except everything in the secrets directory
  // ],

  // Allows you to include additional resources in the bundle that is deployed to Edgio’s serverless JS workers.
  // Keys are globs, value can be a boolean or string. This is typically used to ensure that resources
  // that need to be dynamically required at runtime such as build manifests for server-side rendering
  // or other config files are present in the cloud.
  //
  // includeFiles: {
  //   'lang/**/*': true, // Just includes the specified files
  //   'content/**/*': 'another/dir/in/edgio/lambda', // Copies the files into specific directory within Edgio build
  // },

  // Set to true to include all packages listed in the dependencies property of package.json when deploying to Edgio.
  // This option generally isn't needed as Edgio automatically includes all modules imported by your code in the bundle that
  // is uploaded during deployment
  //
  // includeNodeModules: true,
}
