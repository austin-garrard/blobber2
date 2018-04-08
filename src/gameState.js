// This is a summary of events that have been processed in an update cycle of a game.
// The events in the digest will be sent to the clients.
function createDigest (output) {
  let events = []

  return {
    add (...event) {
      events.push(event)
    },

    send () {
      events.forEach(event => output.emit(...event))
      events = []
    }
  }
}

const blobs = []

function saveBlob (blob) {
  blobs.push(blob)
  return blob
}

function findBlob(id) {
  const found = blobs.find(blob => blob.id === data.id);
  if (found) {
    return found;
  }
  else {
    return false;
  }
}

module.exports = {
  createDigest,
  blobs,
  saveBlob,
  findBlob
}
