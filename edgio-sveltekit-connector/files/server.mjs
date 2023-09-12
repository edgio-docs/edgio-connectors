// This file was automatically added by 'edgio build' command from @edgio/sveltekit
//
// It starts HTTP server, which accepts Node's requests/responses handler
// and converts them to JS requests/responses which Sveltekit accepts.
// It also adds global polyfills for Node environment.
//
// The implementation is based on:
// https://github.com/sveltejs/kit/blob/master/packages/adapter-vercel/package.json
// https://github.com/sveltejs/kit/blob/master/packages/adapter-node/package.json
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { resolve } from 'path'
import { getRequest, setResponse } from '@sveltejs/kit/node'
import { installPolyfills } from '@sveltejs/kit/node/polyfills';

// Sveltekit output files which are copied during the build
import { Server } from './index.js'
import { manifest } from './manifest.js'

installPolyfills()

const sveltekitServer = new Server(manifest)

// Initialize Sveltekit server
await sveltekitServer.init({
  env: process.env
})

// Create handler for Node HTTP server
export const handler = async (req, res) => {
  let serverReq
  try {
    // Convert Node's IncomingMessage to JS Request which Sveltekit accepts
    serverReq = await getRequest({ base: `https://${req.headers.host}`, request: req });
  } catch (e) {
    res.statusCode = e?.status || 500;
    return res.end('ERROR: Invalid request');
  }

  const serverRes = await sveltekitServer.respond(serverReq, {
    getClientAddress() {
      return req.headers?.['x-forwarded-for'] || '127.0.0.1'
    },
  })
  await setResponse(res, serverRes)

}

const port = Number(process.env.PORT || 3001)

// Create Node HTTP server
export const server = createServer(handler)
server.listen(port)