// @filename: main.ts

import { Buffer } from "https://deno.land/std/node/buffer.ts";
import { Application, Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";

import Convert16b32fp from './Convert16b32fp.ts';

console.info("Started Application.");

/* Load Configuration */
import ConfigReader from './Config.ts';
const Config = await ConfigReader('config.json');

/* Initialise Web Router */
const App = new Application();
const AppRouter = new Router();

/* Serve static files */
if(Config.http.serve_htdocs)
{
  App.use(async (context, next) => {
    try {
      await context.send({
        root: `./htdocs/`,
        index: 'index.html',
      });
    } catch {
      await next();
    }
  });
}

let sockets_audio = new Map<string, WebSocket>();

AppRouter.get("/audio", (ctx) =>
{
  if(!ctx.isUpgradable) 
  {
    ctx.throw(501);
  }
  const ws = ctx.upgrade();
  const uid = globalThis.crypto.randomUUID();

  ws.onopen = () =>
  {
    console.info("websocket client connected.");
    sockets_audio.set(uid,ws);
  };
  ws.onmessage = (m) =>
  {
    console.info(`Received message from client: ${m.data}`);
  };
  ws.onclose = () => {
    console.info("Disconnected from client");
    sockets_audio.delete(uid);
  }
});

App.use(AppRouter.routes());
App.use(AppRouter.allowedMethods());

console.info(`Starting HTTP server ( http://${Config.http.address}:${Config.http.port}/ )..`);
App.listen({ hostname: Config.http.address, port: Config.http.port });


const sendSize = (1024) * 2; // 2 bytes/sample
let udpBuffer = new Buffer.alloc(10*sendSize);

console.info(`Starting UDP server (listening) (${Config.udp.address}:${Config.udp.port})..`);
const l = Deno.listenDatagram({transport: "udp", port: Config.udp.port, hostname: Config.udp.address, reuseAddress: true});


async function listenUDPAudio(l)
{
  for await(const r of l)
  {
    udpBuffer = Buffer.concat([udpBuffer, r[0]]);
    while(udpBuffer.length > sendSize)
    {
      const sendBuffer = udpBuffer.slice(0, sendSize);
      udpBuffer = udpBuffer.slice(sendSize);

      const sendFloatBuffer = Convert16b32fp(sendBuffer);

      await sockets_audio.forEach((ws: WebSocket) => {
        ws.send(sendFloatBuffer, {binary: true, mask: false});
      });
    }
  }
}
listenUDPAudio(l);

console.info(`Starting UDP server (listening) (${Config.activity.address}:${Config.activity.port})..`);
const udpActivity = Deno.listenDatagram({transport: "udp", port: Config.activity.port, hostname: Config.activity.address, reuseAddress: true});

let activity_list = [];

const uuid_lookup = [
  {'name': 'A', 'uuid': Buffer.from("0f826e6c0263266124100cc603ed9232", "hex")},
  {'name': 'B', 'uuid': Buffer.from("7006cbddcbe640f78e1d4556ee662181", "hex")},
  {'name': 'G', 'uuid': Buffer.from("4204c3a1f2394b23a3454363226a14f0", "hex")}
];

async function listenActivity(l)
{
  for await(const r of l)
  {
    let inputBuffer = Buffer.from(r[0]);

    while(inputBuffer.length >= 16)
    {
      const uuidBuffer = inputBuffer.slice(0, 16);

      for(let idx in uuid_lookup)
      {
        if(Buffer.compare(uuidBuffer, uuid_lookup[idx].uuid) === 0)
        {
          activity_list.push(uuid_lookup[idx].name);
        }
      }

      inputBuffer = inputBuffer.slice(16);
    }
  }
}
listenActivity(udpActivity);

setInterval(() => {
  if(activity_list.length > 0)
  {
    const activity_json = JSON.stringify({'participants': activity_list});
    activity_list.length = 0;
    
    sockets_audio.forEach((ws: WebSocket) => {
      ws.send(activity_json);
    });
  }
}, 100);


console.log("end of init");