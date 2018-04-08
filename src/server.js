const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)

let rx = require('rxjs')
const Observable = rx.Observable

const {eventBus} = require('./events/eventBus')
const {createBlob} = require('./models/blob')
const {createDigest, blobs, saveBlob} = require('./gameState')
const {eventHandlers} = require('./events/eventHandlers')

// my idea right here is to handle movement here on the digest. What we'll do is
// handle moving players blobs here in the timer. it could work, going to back up before trying

function init (log) {
// Establish update loop
  const digest = createDigest(io.sockets)
  Observable.timer(0, 15).subscribe(() => {
    eventBus.put('updateAll', {})
    digest.send()
  })

  // Set up handlers to consume events from the bus and update the digest
  eventHandlers.forEach(([name, handler]) => {
    eventBus.get(name).subscribe(handler(digest))
  })

  // We will process these events when a client sends them
  const clientEvents = ['ud', 'ch']

  // configure websockets
  io.on('connection', socket => {
    socket.on('disconnect', () => {
      log(`User ${player.id} disconnected.`)
      eventBus.put('rv', {
        id: player.id
      })
    })

    // create a new player
    const player = saveBlob(createBlob(500, 500, 100))
    log(`User ${player.id} connected.`)

    // initialize the client
    socket.emit('init', {
      id: player.id,
      location: player.location,
      size: player.size,
      blobs: blobs,
      message: 'Welcome to Blobber 2!'
    })

    // route known events coming in on this socket to the main event bus
    clientEvents.forEach(type => socket.on(type, data => {
      eventBus.put(type, data)
    }))

    // let the world know what just happened!
    eventBus.put('np', player)
  })

  // Some error handling. It's unlikely that these will occur but when they do we want
  // to know about it.
  io.on('connect_error', data => {
    log('connect error!', data)
  })

  io.on('connect_timeout', () => {
    log('connect timeout!')
  })

  io.on('error', data => {
    log('error!', data)
  })

  return server
}

module.exports = {
  init
}
