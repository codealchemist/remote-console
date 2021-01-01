import { v4 as uuidv4 } from 'uuid'
import WebSocketClient from './src/services/websocket'
import Peer from './src/services/webrtc'

let remoteConsoleId = localStorage.getItem('remoteConsoleId')
if (!remoteConsoleId) {
  remoteConsoleId = uuidv4()
  localStorage.setItem('remoteConsoleId', remoteConsoleId)
  console.log('[ remote-console ] Created ID:', remoteConsoleId)
} else {
  console.log('[ remote-console ] Retrieved ID:', remoteConsoleId)
}

//------------------------------------------------
// Connect to remote console.
const ws = new WebSocketClient('browser', remoteConsoleId)
const peer = new Peer(null, remoteConsoleId)

ws.connect('wss://proxy-lady.herokuapp.com:443')
ws.onMessage(message => {
  peer.signal(message)
})

peer.onSignal(signal => {
  ws.send(signal)
})
//------------------------------------------------

peer
  .onConnect(() => {
    console.log('[ remote-console: Peer connected ]')
    ws.debug = false
  })
  .onMessage(message => {
    const { type, command } = message
    if (type !== 'command') return

    try {
      const f = new Function(`return ${command}`)
      const response = f()
      peer.send({ type: 'response', response })
    } catch (error) {
      console.log('[ remote-console ] ERROR running remote command:', error)
    }
  })

window.rc = {
  test: (params) => {
    console.log('[ remote-console: Test called ]', params)
    return 'Keep rocking!'
  },
  log: (value) => {
    console.log(value)
    return value
  }
}

// Console override for remote logging.
if (window.console) {
  for (let method in window.console) {
    if (typeof console[method] === 'function') {
      const srcMethod = console[method]
      window.console[method] = function() {
        peer.send({ type: 'console', data: [...arguments]})
        srcMethod(...arguments)
      }
    }
  }
}
