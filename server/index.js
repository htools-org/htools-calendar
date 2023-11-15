import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { createServer } from "node:http";

import { createRequestHandler } from "@remix-run/express";
import { broadcastDevReady, installGlobals } from "@remix-run/node";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import sourceMapSupport from "source-map-support";
import { Server } from "socket.io";

import Network from "hsd/lib/protocol/network.js";
import ChainEntry from "hsd/lib/blockchain/chainentry.js";
import NodeClient from "hsd/lib/client/node.js";

import dotenv from "dotenv";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

sourceMapSupport.install();
installGlobals();

/** @typedef {import('@remix-run/node').ServerBuild} ServerBuild */

const BUILD_PATH = path.resolve("build/index.js");
const VERSION_PATH = path.resolve("build/version.txt");

const initialBuild = await reimportServer();
const remixHandler =
  process.env.NODE_ENV === "development"
    ? await createDevRequestHandler(initialBuild)
    : createRequestHandler({
      build: initialBuild,
      mode: initialBuild.mode,
    });


// Handshake start
const hnsData = {
  currentHeight: 0,
};

const network = Network.get(process.env.HSD_NETWORK || "main");
const nodeClient = new NodeClient({
  network: network.type,
  port: network.rpcPort,
  apiKey: process.env.HSD_API_KEY,
});
// const socket = useContext(SocketContext);

(async () => {
  // Connection and both channel subscriptions handled by opening client
  await nodeClient.open();
  console.log("Connected to hsd.");
  const tip = await nodeClient.getTip();
  hnsData.currentHeight = ChainEntry.fromRaw(tip).height;
})();

// Listen for new blocks
nodeClient.bind("chain connect", (raw) => {
  const chainEntry = ChainEntry.fromRaw(raw);
  console.log("Node -- Chain Connect Event:\n", chainEntry);
  hnsData.currentHeight = chainEntry.height;
  io.emit("newData", hnsData);
});


// Handshake end

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer);

io.on("connection", (socket) => {
  // from this point you are on the WS connection with a specific client
  // console.log(socket.id, "connected");

  // socket.emit("confirmation", "connected!");

  // socket.on("event", (data) => {
  //   console.log(socket.id, data);
  //   socket.emit("event", "pong");
  // });

  socket.emit("newData", hnsData);
});

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// Remix fingerprints its assets so we can cache forever.
app.use(
  "/build",
  express.static("public/build", { immutable: true, maxAge: "1y" })
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("public", { maxAge: "1h" }));

app.use(morgan("tiny"));

app.all("*", remixHandler);

const port = process.env.PORT || 3000;

httpServer.listen(port, async () => {
  console.log(`Express server listening on port ${port}`);

  if (process.env.NODE_ENV === "development") {
    broadcastDevReady(initialBuild);
  }
});

/**
 * @returns {Promise<ServerBuild>}
 */
async function reimportServer() {
  const stat = fs.statSync(BUILD_PATH);

  // convert build path to URL for Windows compatibility with dynamic `import`
  const BUILD_URL = url.pathToFileURL(BUILD_PATH).href;

  // use a timestamp query parameter to bust the import cache
  return import(BUILD_URL + "?t=" + stat.mtimeMs);
}

/**
 * @param {ServerBuild} initialBuild
 * @returns {Promise<import('@remix-run/express').RequestHandler>}
 */
async function createDevRequestHandler(initialBuild) {
  let build = initialBuild;
  async function handleServerUpdate() {
    // 1. re-import the server build
    build = await reimportServer();
    // 2. tell Remix that this app server is now up-to-date and ready
    broadcastDevReady(build);
  }
  const chokidar = await import("chokidar");
  chokidar
    .watch(VERSION_PATH, { ignoreInitial: true })
    .on("add", handleServerUpdate)
    .on("change", handleServerUpdate);

  // wrap request handler to make sure its recreated with the latest build for every request
  return async (req, res, next) => {
    try {
      return createRequestHandler({
        build,
        mode: "development",
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}