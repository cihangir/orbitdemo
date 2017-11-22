'use strict'

const async = require(`async`)

export default function distributeJobs(
  conns,
  processId,
  peers,
  chunks,
  callback
) {
  async.eachOfSeries(
    chunks,
    function(chunk, count, cb) {
      var doc = {
        _id: conns.ipfs.PeerId + count + ``,
        target: peers[(peers.length - 1) % count || 0],
        sender: conns.ipfs.PeerId,
        typeConstant: `request`,
        request: chunk,
        processId: processId,
      }
      conns.log.add(
        `${conns.username} is sending request ${doc._id} to ${
          doc.target
        } on db: ${conns.dbname}`
      )
      conns.ledger
        .put(doc)
        .then(() => conns.requestCounter.inc())
        .then(hash => {
          cb()
        })
        .catch(cb)
    },
    callback
  )
}
