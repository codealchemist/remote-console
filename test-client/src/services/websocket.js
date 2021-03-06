class WebSocketClient {
  constructor(from = 'browser', id) {
    this.debug = true
    this.isConnected = false
    this.queue = []
    this.from = from
    this.id = id
  }

  connect(serverUrl) {
    this.serverUrl = serverUrl
    this.ws = new WebSocket(serverUrl)
    this.ws.onopen = () => {
      this.log('WS OPEN')
      this.isConnected = true

      if (this.queue.length) {
        this.log('Send queued messages...')
        this.sendQueued()
      }
    }
  
    this.ws.onmessage = (e) => {
      const message = JSON.parse(e.data)
      if (message.from === this.from) return
      this.log('WS MESSAGE:', message)
      if (message.type === 'disconnect') return
      if (typeof this.onMessageCallback === 'function') {
        this.onMessageCallback(message)
      }
    }
  
    this.ws.onclose = (e) => {
      this.isConnected = false
      this.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason)
      setTimeout(() => {
        this.connect(this.serverUrl)
      }, 1000)
    }
  
    this.ws.onerror = (err) => {
      this.log('ERROR: Closing socket', err.message)
      this.ws.close()
    }
  
    window.send = message => this.ws.send(JSON.stringify(message))
    return this
  }

  sendQueued() {
    if (!this.isConnected) return
    const msgCount = this.queue.length
    if (!msgCount) {
      this.log('sendQueued: Queue is empty.')
      return
    }
    this.log(`sendQueued: ${msgCount} messages left`)
    const message = this.queue.shift()
    this.send(message)
    setTimeout(() => this.sendQueued(), 1000)
  }

  send(message) {
    // Enqueue message. Send it when connected.
    if (!this.isConnected) {
      this.queue.push(message)
      this.log(`${this.queue.length} messages enqueued`)
      return
    }

    this.ws.send(JSON.stringify({
      ...message,
      from: 'browser',
      remoteClientId: this.id
    }))
    return this
  }

  onMessage(callback) {
    this.onMessageCallback = callback
  }

  log() {
    if (!this.debug) return
    console.log('[ WS ]', ...arguments)
  }
}

export default WebSocketClient
