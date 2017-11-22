'use strict'

const async = require(`async`)

export default function consumeRequests(conns, callback) {
  const all = conns.ledger.query(
    // doc => true
    doc => doc.target === conns.ipfs.PeerId && doc.typeConstant === `request`
  )
  console.log(`consuming ledger`, all)

  async.eachOfSeries(
    all,
    function(data, count, cb) {
      conns.ledger
        .put({
          _id: data._id + `r`,
          target: data.sender,
          sender: conns.ipfs.PeerId,
          processId: data.processId,
          typeConstant: `response`,
          response: data.request.length,
        })
        .then(hash => {
          conns.ledger
            .del(data._id)
            .then(hash => cb())
            .catch(e => cb(e))
        })
        .catch(e => cb(e))
    },
    callback
  )
}
