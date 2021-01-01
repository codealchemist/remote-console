const SimplePeer = require('simple-peer')
const wrtc = require('wrtc')
const debug = require('debug')('peer')

class Peer {
  constructor(config) {
    this.debug = true
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
    this.create()
  }

  create(initiator = false) {
    try {
      this.log('CREATE')
      if (this.peer) this.destroy(true)
      this.isConnected = false
      this.peer = new SimplePeer({
        initiator,
        trickle: true,
        config: this.config,
        wrtc
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
  }

  signal(signal) {
    if (this.wasDestroyed) return
    if (this.isConnected) return
    try {
      this.peer.signal(JSON.stringify(signal))
    } catch(error) {
      this.log('ERROR on signal:', error)

      this.create()
      this.signal(signal)
    }
  }

  send(message) {
    if (this.wasDestroyed) return
    if (!this.isConnected) {
      this.log('Not connected yet')
      return
    }

    try {
      this.peer.send(JSON.stringify(message))
    } catch (error) {
      this.log('ERROR on send:', error)
      this.log('Retry in 1s...')
      setTimeout(() => {
        this.send(message)
      }, 1000)
    }
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
    delete this.peer

    if (noRecreation) return
    setTimeout(() => {
      this.create()
    }, 1000)
  }

  log() {
    if (!this.debug) return
    debug(...arguments)
  }
}

module.exports = Peer
