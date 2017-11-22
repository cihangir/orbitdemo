window.ipfs = null;
window.orbit = null;

window.db = null;
window.log = null;
window.requestCounter = null;
window.responseCounter = null;
window.ipfs = null;
window.ledger = null;

const IPFS = require("ipfs-daemon/src/ipfs-browser-daemon");
const OrbitDB = require("orbit-db");

// getIPFS checks if there is an already connected ipfs connection, else creates
// a new one and waits for the connectino to be in ready states
export function getIPFS(callback) {
  if (window.ipfs) {
    return callback(null, window.ipfs);
  }
  const ipfs = new IPFS({
    IpfsDataDir: "/orbit-db-/examples/browser",
    SignalServer: "star-signal.cloud.ipfs.team" // IPFS dev server
  });
  ipfs.on("error", e => callback(e));
  ipfs.on("ready", () => {
    window.ipfs = ipfs;
    callback(null, window.ipfs);
  });
}

// getOrbitDB is singleton, it only connects with the first ever given username
export function getOrbitDB(username, callback) {
  if (window.orbit) {
    return callback(null, window.orbit);
  }
  getIPFS(function(err, ipfs) {
    if (err) {
      return callback(err);
    }
    const orbit = new OrbitDB(ipfs, username);
    window.orbit = orbit;
    return callback(null, orbit);
  });
}

// ensureConns establishes required connections.
export function ensureConns(dbname, callback) {
  getIPFS(function(err, ipfs) {
    if (err) {
      return callback(err);
    }
    getOrbitDB(username, function(err, orbit) {
      if (err) {
        return callback(err);
      }
      const ledger = orbit.docstore(dbname + ".ledger");
      ledger.events.on("synced", () => consumeResponses(ledger));
      ledger.events.on("ready", () => consumeResponses(ledger));

      const log = orbit.eventlog(dbname + ".log", {
        maxHistory: 10,
        syncHistory: true,
        cachePath: "/orbit-db"
      });
      const requestCounter = orbit.counter(dbname + ".count", {
        maxHistory: 10,
        syncHistory: true,
        cachePath: "/orbit-db"
      });
      const responseCounter = orbit.counter(
        dbname + username + ".response.count",
        {
          maxHistory: 10,
          syncHistory: true,
          cachePath: "/orbit-db"
        }
      );

      requestCounter.load(10);
      responseCounter.load(10);
      log.load(10);
      ledger.load(10);
    });
  });
}
