import getPeers from './getPeers'

export default function generateView(conns, callback) {
  const latest = conns.log.iterator({ limit: 10 }).collect()

  getPeers(conns, function(err, peers) {
    if (err) {
      return callback(err)
    }
    const output = `
            -------------------------------------------------------
            Total Word Count: ${conns.responseCounter.value}
            -------------------------------------------------------
            -------------------------------------------------------
            You are: ${conns.username}<br>
            -------------------------------------------------------
            Your Peer ID: ${conns.ipfs.PeerId}<br>
            -------------------------------------------------------
            Database: ${conns.dbname}<br>
            -------------------------------------------------------
            Peers: ${peers.length}<br>
            -------------------------------------------------------
            Connected Rope Peer Hashes:
            -------------------------------------------------------
            ${peers
    .reverse()
    .map(e => e)
    .join(
      `\n-------------------------------------------------------\n`
    )}

            -------------------------------------------------------
            Latest Requests
            -------------------------------------------------------
            ${latest
    .reverse()
    .map(e => e.payload.value)
    .join(`\n`)}

            -------------------------------------------------------
            Total Request Count: ${conns.requestCounter.value}
            -------------------------------------------------------
            `
    return callback(null, output.split(`\n`).join(`<br>`))
  })
}
