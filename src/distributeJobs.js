const async = require("async");

export default function distributeJobs(
  username,
  dbname,
  processId,
  peers,
  chunks
) {
  async.eachOfSeries(
    chunks,
    function(chunk, count, callback) {
      var doc = {
        _id: ipfs.PeerId + count + "",
        target: peers[(peers.length - 1) % count || 0],
        sender: ipfs.PeerId,
        typeConstant: "request",
        request: chunk,
        processId: processId
      };
      log.add(
        `${username} is sending request ${doc._id} to ${doc.target} on db: ${dbname}`
      );
      ledger
        .put(doc)
        .then(() => requestCounter.inc())
        .then(hash => {
          console.log(hash, doc);
          callback();
        })
        .catch(callback);
    },
    function(err) {
      if (err) {
        return handleError(err);
      }
      console.log("distributed all the chunks");
    }
  );
}
