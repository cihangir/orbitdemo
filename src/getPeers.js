export default function getPeers(conns, callback) {
  conns.ipfs.pubsub
    .peers(conns.dbname + `.log`)
    .then(peers => {
      return callback(null, peers)
    })
    .catch(e => callback(e))
}
