const fs = require('fs')
const path = require('path')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const https = require('https')
const readline = require('readline')
const ip = require('ip')
const ejs = require('ejs')
const routes = require('./routes')
const WebSocketClient = require('./server-websocket')
const Peer = require('./server-webrtc')

const port = process.env.PORT || 1337

//------------------------------------------------
// Connect to remote device.
const peer = new Peer()
const ws = new WebSocketClient()
ws.connect('wss://proxy-lady.herokuapp.com:443')
ws.onMessage(message => { peer.signal(message) })
peer.onSignal(signal => { ws.send(signal) }) 
//------------------------------------------------

function server (input = process.stdin, output = process.stdout) {
  app.set('view engine', 'js')
  app.engine('js', ejs.renderFile)
  app.set('views', __dirname)
  app.use(express.static('./test-client/build'))

  // Load SSL creds.
  const privateKey = fs.readFileSync(path.join(__dirname, '../cert/server.key'), 'utf8')
  const certificate = fs.readFileSync(path.join(__dirname, '../cert/server.cert'), 'utf8')
  const credentials = {key: privateKey, cert: certificate}

  // Init https server.
  const httpsServer = https.createServer(credentials, app)

  const localIp = ip.address()
  const host = `${localIp}:${port}`

  // Set routes.
  routes(app, host)

  // Set command line interface.
  const rl = readline.createInterface({
    input: input,
    output: output,
    prompt: 'browser> '
  })

  rl.on('close', () => {
    rl.clearLine()
    console.log('Have a great day!')
    rl.clearLine()
    process.exit(0)
  })

  peer
    .onConnect(() => {
      rl.clearLine()
      console.log('[ Browser connected ]')

      rl.on('line', (command) => {
        peer.send({ type: 'command', command })
      })
    })
    .onMessage((message) => {
      console.log(message)
      rl.prompt()
    })

  // Init prompt.
  rl.clearLine()
  rl.prompt()

  // Start server.
  httpsServer.listen(port, function () {
    console.log(`
      LOCAL ACCESS
      - listening on https://localhost:${port}
      - install https://localhost:${port}/install
      LAN ACCESS
      - listening on https://${host}
      - install https://${host}/install
    `)
  })

  return {
    app: app,
    readline: rl,
    http: http
  }
}

server()
