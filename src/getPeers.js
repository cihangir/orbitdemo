export default function getPeers(ipfs, dbname, callback) {
  ipfs.pubsub
    .peers(dbname + ".log")
    .then(peers => {
      return callback(null, peers);
    })
    .catch(e => callback(e));
}
