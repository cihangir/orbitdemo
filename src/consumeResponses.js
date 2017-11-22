const async = require(`async`)

export default function consumeResponses(conns, processId, callback) {
  const all = conns.ledger.query(
    doc => doc.target === conns.ipfs.PeerId && doc.typeConstant === `response`
  )

  console.log(`consuming ledger`, all)

  async.eachOfSeries(
    all,
    function(data, count, callback) {
      conns.responseCounter
        .inc(data.response)
        .then(hash => {
          conns.ledger
            .del(data._id)
            .then(hash => callback())
            .catch(e => callback(e))
        })
        .catch(e => callback(e))
    },
    function(err) {
      if (err) {
        return callback(err)
      }
      callback()
    }
  )
}
