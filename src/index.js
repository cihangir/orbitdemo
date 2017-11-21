import { ucs2 } from "punycode";

("use strict");

const IPFS = require("ipfs-daemon/src/ipfs-browser-daemon");
const OrbitDB = require("orbit-db");
const async = require("async");

const elm = document.getElementById("output");
const textField = document.getElementById("text");
const processButton = document.getElementById("process");

const username = new Date().getTime(); // random username/id
const dbname = "savas_demo";

window.db = null;
window.log = null;
window.requestCounter = null;
window.responseCounter = null;
window.ipfs = null;
window.orbit = null;
window.ledger = null;

const handleError = e => {
  console.error(e.stack);
  elm.innerHTML = e.message;
};

const consumeRequests = ledger => {
  const all = ledger.query(
    // doc => true
    doc => doc.target == ipfs.PeerId && doc.typeConstant == "request"
  );
  console.log("consuming ledger", all);

  async.eachOfSeries(
    all,
    function(data, count, callback) {
      ledger
        .put({
          _id: data._id + "r",
          target: data.sender,
          sender: ipfs.PeerId,
          processId: data.processId,
          typeConstant: "response",
          response: data.request.length
        })
        .then(hash => {
          ledger
            .del(data._id)
            .then(hash => callback())
            .catch(e => callback(e));
        })
        .catch(e => callback(e));
    },
    function(err) {
      if (err) {
        return handleError(err);
      }
      console.log("consumed all the logs");
    }
  );
};

const consumeResponses = (ledger, processId) => {
  const all = ledger.query(
    // doc => true
    doc => doc.target == ipfs.PeerId && doc.typeConstant == "response"
  );
  console.log("consuming ledger", all);

  async.eachOfSeries(
    all,
    function(data, count, callback) {
      responseCounter
        .inc(data.response)
        .then(hash => {
          ledger
            .del(data._id)
            .then(hash => callback())
            .catch(e => callback(e));
        })
        .catch(e => callback(e));
    },
    function(err) {
      if (err) {
        return handleError(err);
      }
      console.log("consumed all the logs");
    }
  );
};

const openDatabase = dbname => {
  elm.innerHTML = "Connecting to system...";

  window.ipfs = new IPFS({
    IpfsDataDir: "/orbit-db-/examples/browser",
    SignalServer: "star-signal.cloud.ipfs.team" // IPFS dev server
  });

  ipfs.on("error", e => handleError(e));

  ipfs.on("ready", () => {
    elm.innerHTML = "Loading database...";

    const orbit = new OrbitDB(ipfs, username);
    window.orbit = orbit;

    window.ledger = orbit.docstore(dbname + ".ledger");

    window.log = orbit.eventlog(dbname + ".log", {
      maxHistory: 10,
      syncHistory: true,
      cachePath: "/orbit-db"
    });
    window.requestCounter = orbit.counter(dbname + ".count", {
      maxHistory: 10,
      syncHistory: true,
      cachePath: "/orbit-db"
    });
    window.responseCounter = orbit.counter(
      dbname + username + ".response.count",
      {
        maxHistory: 10,
        syncHistory: true,
        cachePath: "/orbit-db"
      }
    );

    const getData = () => {
      const latest = log.iterator({ limit: 10 }).collect();

      ipfs.pubsub.peers(dbname + ".log").then(peers => {
        const output = `
            -------------------------------------------------------
            Total Word Count: ${responseCounter.value}
            -------------------------------------------------------
            -------------------------------------------------------
            You are: ${username}<br>
            -------------------------------------------------------
            Your Peer ID: ${ipfs.PeerId}<br>
            -------------------------------------------------------
            Database: ${dbname}<br>
            -------------------------------------------------------
            Peers: ${peers.length}<br>
            -------------------------------------------------------
            Connected Rope Peer Hashes:
            -------------------------------------------------------
            ${peers
              .reverse()
              .map(e => e)
              .join(
                "\n-------------------------------------------------------\n"
              )}

            -------------------------------------------------------
            Latest Requests
            -------------------------------------------------------
            ${latest
              .reverse()
              .map(e => e.payload.value)
              .join("\n")}

            -------------------------------------------------------
            Total Request Count: ${requestCounter.value}
            -------------------------------------------------------
            `;
        elm.innerHTML = output.split("\n").join("<br>");
      });
    };

    log.events.on("synced", () => getData());
    log.events.on("ready", () => {
      if (processButton.disabled) {
        processButton.disabled = false;
      }
      getData();
    });

    requestCounter.events.on("synced", () => getData());
    requestCounter.events.on("ready", () => getData());

    responseCounter.events.on("synced", () => getData());
    responseCounter.events.on("ready", () => getData());

    ledger.events.on("synced", () => consumeRequests(ledger));
    ledger.events.on("ready", () => consumeRequests(ledger));

    ledger.events.on("synced", () => consumeResponses(ledger));
    ledger.events.on("ready", () => consumeResponses(ledger));

    // Start query loop when the databse has loaded its history
    requestCounter
      .load(10)
      .then(() => responseCounter.load(10))
      .then(() => log.load(10))
      .then(() => ledger.load(10))
      .then(() => {
        const interval = Math.floor(Math.random() * 5000 + 3000);
        setInterval(getData, interval);
      });
  });
};

const chunkString = (str, length) => {
  const max = 50;
  var n = Math.trunc(str.length / length);
  n = n > max ? max : n;
  var res = str.match(new RegExp("(.|[\r\n]){1," + n + "}", "g"));
  return res;
};

const distributeJobs = (username, dbname, processId, peers, chunks) => {
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
};

const process = (text, username, dbname, processId) => {
  log.add(`${username} starts processing with ${processId}`);

  getPeers(dbname, function(err, peers) {
    log.add(`${username} fetched the latest peers on db ${dbname}`);

    var chunks = chunkString(text, peers.length);

    distributeJobs(username, dbname, processId, peers, chunks);

    log.add(
      `${username} is creating the jobs with process id ${processId} on db: ${dbname}`
    );

    console.log("cihangir", err, peers, chunks);
  });
};

const getPeers = (dbname, callback) => {
  ipfs.pubsub
    .peers(dbname + ".log")
    .then(peers => {
      return callback(null, peers);
    })
    .catch(e => callback(e));
};

openDatabase(dbname);

processButton.addEventListener("click", () => {
  const processId = username + "" + new Date().getTime().toString();
  log.add(
    `creating process id ${processId} for ${username} on parent db: ${dbname}`
  );

  const text = textField.value;
  console.log(text);
  process(text, username, dbname, processId);
});
