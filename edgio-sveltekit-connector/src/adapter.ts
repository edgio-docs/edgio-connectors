/* istanbul ignore file */

export = () => {
  return {
    name: '@edgio/sveltekit/adapter',
    adapt: async (...args: any[]) => {
      // This adapter is doing nothing and its only purpose is to prevent sveltekit showing following message:
      // | Could not detect a supported production environment.
      // | See https://kit.svelte.dev/docs/adapters to learn how to configure your app to run on the platform of your choosing
      // The whole build process is done by sveltekit/src/build.ts,
      // which allows users to skip the framework build via 'edgio build -s' command.
    },
  }
}
