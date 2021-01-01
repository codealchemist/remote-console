import Peer from './services/webrtc'
import WebSocketClient from './services/websocket'
import { v4 as uuidv4 } from 'uuid'
import './App.css'

let id = localStorage.getItem('id')
if (!id) {
  id = uuidv4()
  localStorage.setItem('id', id)
  console.log('Created ID:', id)
} else {
  console.log('Retrieved ID:', id)
}

//------------------------------------------------
// Connect to remote console.
const ws = new WebSocketClient('browser', id)
const peer = new Peer(null, id)

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
    console.log('[ Peer connected ]')
  })
  .onMessage(message => {
    const { type, command } = message
    if (type !== 'command') return

    try {
      const f = new Function(`return ${command}`)
      const response = f()
      peer.send({ type: 'response', response })
    } catch (error) {
      console.log('ERROR running remote command:', error)
    }
  })

window.rc = {
  test: (params) => {
    console.log('[ Test called ]', params)
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

function App() {
  return (
    <div className="page">
      <header>remote console</header>

      <div className="content">
        <h2>Test remote connection</h2>

        <p>Open the browser console and try logging something from the node cli.</p>

        <code>
          <p>browser&gt;</p> rc.log('yeah!')<br />
          <i>yeah!</i><br />
          <p>browser&gt;</p> rc.test()<br />
          <i>Keep rocking!</i>
        </code>
      </div>
    </div>
  )
}

export default App
