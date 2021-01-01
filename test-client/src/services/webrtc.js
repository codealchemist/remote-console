import SimplePeer from 'simple-peer'

class Peer {
  constructor(config, id) {
    this.debug = false
    this.signals = []
    this.config = config || {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478?transport=udp' },
        { urls: 'stun:stun.speedy.com.ar:3478' }
      ]
    }
    this.isConnected = false
    this.wasDestroyed = false
    this.peer = null
    this.id = id
    this.create()
  }

  create(initiator = true) {
    try {
      this.log('CREATE')
      if (this.peer) this.destroy(true)
      this.peer = new SimplePeer({
        initiator,
        trickle: true,
        config: this.config
      })
      this.wasDestroyed = false
      this.setEvents()
      return this
    } catch (error) {
      this.log('ERROR creating PEER:', error)
      this.log('Retry in 2s...')
      this.create(initiator)
    }
  }

  setEvents() {
    this.peer.on('signal', signal => {
      this.log('SIGNAL', signal)
      if (this.peer.readyState === 'open') {
        this.signal(signal)
        return
      }

      if (typeof this.onSignalCallback === 'function') {
        this.onSignalCallback(signal)
      }
    })

    this.peer.on('connect', () => {
      this.log('CONNECTED')
      this.isConnected = true
      if (typeof this.onConnectCallback === 'function') {
        this.onConnectCallback()
      }
    })

    this.peer.on('data', data => {
      this.log('DATA', data.toString('utf-8'))
      if (typeof this.onDataCallback === 'function') {
        this.onDataCallback(data)
      }
      if (typeof this.onMessageCallback === 'function') {
        const message = JSON.parse(data)
        this.onMessageCallback(message)
      }
    })

    this.peer.on('signalingStateChange', (state) => {
      this.log('WebRTC state changed', state);
    })

    this.peer.once('error', err => {
      this.log('ERROR', err)
      if (this.wasDestroyed) return
      this.destroy()
    })

    this.peer.once('close', () => {
      this.log('CLOSED')
      this.destroy()
    })

    this.peer.once('finish', () => {
      this.log('FINISH')
      this.destroy()
    })

    this.peer.once('end', () => {
      this.log('END')
      this.destroy()
    })

    window.peer = this
  }

  signal(signal) {
    if (this.wasDestroyed) return

    try {
      this.peer.signal(JSON.stringify(signal))
    } catch(error) {
      this.log('ERROR on signal:', error)

      setTimeout(() => {
        this.create()

        setTimeout(() => {
          this.signal(signal)
        }, 2000)
      }, 1000)
    }
  }

  send(message) {
    if (this.wasDestroyed) return
    if (!this.isConnected) {
      this.log('Not connected yet')
      return
    }
    this.peer.send(JSON.stringify({
      ...message,
      remotePeerId: this.id
    }))
  }

  onSignal(callback) {
    this.onSignalCallback = callback
    return this
  }

  onConnect(callback) {
    this.onConnectCallback = callback
    return this
  }

  onData(callback) {
    this.onDataCallback = callback
    return this
  }

  onMessage(callback) {
    this.onMessageCallback = callback
    return this
  }

  destroy (noRecreation) {
    if (this.wasDestroyed) return
    this.wasDestroyed = true
    this.isConnected = false
    this.log('DESTROY')
    this.peer.removeAllListeners()
    this.peer.destroy()
    this.peer = null

    if (noRecreation) return
    this.create()
  }

  log() {
    if (!this.debug) return
    console.log('[ PEER ]', ...arguments)
  }
}

export default Peer
