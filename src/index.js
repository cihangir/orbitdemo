'use strict'

import chunkString from './chunkString'
import consumeRequests from './consumeRequests'
import consumeResponses from './consumeResponses'
import distributeJobs from './distributeJobs'
import { ensureConns } from './conns'
import generateView from './view'
import getPeers from './getPeers'

const elm = document.getElementById(`output`)
const textField = document.getElementById(`text`)
const processButton = document.getElementById(`process`)

window.conns = null

const handleError = e => {
  console.error(e.stack)
  elm.innerHTML = e.message
}

const openDatabase = (dbname, username) => {
  elm.innerHTML = `Connecting to system...`

  ensureConns(dbname, username, function(err, conns) {
    if (err) {
      return handleError(err)
    }

    window.conns = conns
    elm.innerHTML = `Loading database...`

    const updateView = conns => {
      generateView(conns, function(err, view) {
        if (err) {
          return handleError(err)
        }
        elm.innerHTML = view
      })
    }

    conns.log.events.on(`synced`, () => updateView(conns))
    conns.log.events.on(`ready`, () => {
      if (processButton.disabled) {
        processButton.disabled = false
      }
      updateView(conns)
    })
    conns.requestCounter.events.on(`synced`, () => updateView(conns))
    conns.requestCounter.events.on(`ready`, () => updateView(conns))

    conns.responseCounter.events.on(`synced`, () => updateView(conns))
    conns.responseCounter.events.on(`ready`, () => updateView(conns))

    conns.ledger.events.on(`synced`, () =>
      consumeRequests(conns, function(err) {
        if (err) {
          return handleError(err)
        }
        console.log(`consumed all the logs`)
      })
    )
    conns.ledger.events.on(`ready`, () =>
      consumeRequests(conns, function(err) {
        if (err) {
          return handleError(err)
        }
        console.log(`consumed all the logs`)
      })
    )

    conns.ledger.events.on(`synced`, () =>
      consumeResponses(conns, `id`, function(err) {
        if (err) {
          return handleError(err)
        }
        console.log(`consumed all the logs`)
      })
    )
    conns.ledger.events.on(`ready`, () =>
      consumeResponses(conns, `id`, function(err) {
        if (err) {
          return handleError(err)
        }
        console.log(`consumed all the logs`)
      })
    )

    // Start query loop when the databse has loaded its history
    conns.requestCounter
      .load(10)
      .then(() => conns.responseCounter.load(10))
      .then(() => conns.log.load(10))
      .then(() => conns.ledger.load(10))
      .then(() => {
        const interval = Math.floor(Math.random() * 5000 + 3000)
        setInterval(function() {
          updateView(conns)
        }, interval)
      })
  })
}

const process = (conns, text, processId) => {
  conns.log.add(`${conns.username} starts processing with ${processId}`)

  getPeers(conns, function(err, peers) {
    if (err) {
      return handleError(err)
    }
    conns.log.add(
      `${conns.username} fetched the latest peers on db ${conns.dbname}`
    )

    var chunks = chunkString(text, peers.length)

    distributeJobs(conns, processId, peers, chunks, function(err) {
      if (err) {
        return handleError(err)
      }
      conns.log.add(
        `${conns.username} created the jobs with process id ${
          processId
        } on db: ${conns.dbname}`
      )
      console.log(`distributed all the chunks`)
    })

    conns.log.add(
      `${conns.username} is creating the jobs with process id ${
        processId
      } on db: ${conns.dbname}`
    )
  })
}

const username = new Date().getTime() // random username/id
const dbname = `savas_demo`

openDatabase(dbname, username)

processButton.addEventListener(`click`, () => {
  var conns = window.conns
  const processId = conns.username + `` + new Date().getTime().toString()
  conns.log.add(
    `creating process id ${processId} for ${conns.username} on parent db: ${
      conns.dbname
    }`
  )

  const text = textField.value
  console.log(text)
  process(conns, text, processId)
})
