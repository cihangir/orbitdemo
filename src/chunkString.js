'use strict'

export default function chunkString(str, length) {
  const max = 50
  var n = Math.trunc(str.length / length)
  n = n > max ? max : n
  return str.match(new RegExp(`(.|[\r\n]){1,` + n + `}`, `g`))
}
