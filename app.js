var CALLBACK_ID = 1
var CLIENT_ID = 'a6jlpzakur6r4b4chdumh6f5agl5zy'
var URL = 'https://api.twitch.tv/kraken/search/streams'

/* super simple templating system */

var LIMIT = 5
var templates = {}

function compileTemplate(id) {
  var elt = document.getElementById(id)
  var txt = elt.innerHTML
  var regexes = null

  return function(data) {
    // initialize regexes for global replace on first use
    if (regexes == null) {
      regexes = {}
      keys(data).forEach(function(key) {
        regexes[key] = new RegExp('\\{\\{' + key + '\\}\\}', 'g')
      })
    }

    var res = txt

    keys(data).forEach(function(key) {
      res = res.replace(regexes[key], data[key])
      console.log(res)
    })

    return res
  }
}

function render(id, data) {
  if (!templates[id]) {
    templates[id] = compileTemplate(id)
  }

  return templates[id](data)
}

function log(x) { console.log(x); return x }
function keys(obj) { return Object.keys(obj) }
function vals(obj) { return keys(obj).map(function(key) { return obj[key] })}
function merge(obj1, obj2) { return Object.assign({}, obj1, obj2) }

function serializeParams(params) {
  var fragments = []
  keys(params).forEach(function(key) {
    fragments.push(key + '=' + params[key])
  })
  return fragments.join('&')
}

function getJSONP(url, params, callback) {
  var identifier = '_callback' + CALLBACK_ID++
  var head = document.head
  var elt = document.createElement('script')
  elt.charset = 'UTF-8'
  window[identifier] = callback
  var queryString = serializeParams(merge(params, {
    client_id: CLIENT_ID,
    callback: identifier
  }))
  head.appendChild(elt)
  elt.src = url + '?' + queryString
}

window.app = {
  query: null,
  links: null,
  pending: false,
  streams: null,
  total: null,
  page: 0
}

function pageForward() { if (!app.pending) { executeQuery(app.query, app.page + 1) } }
function pageBackward() { if (!app.pending) { executeQuery(app.query, app.page - 1) } }

function executeQuery(query, page) {
  query = query || 'starcraft'
  page = page || 0

  var params = { q: query, offset: page * LIMIT, limit: LIMIT }

  getJSONP(URL, params, function(data) {
    app.page = page
    app.offset = page * LIMIT
    app.query = query
    app.pending = false
    app.links = data._links
    app.total = data._total
    app.streams = data.streams
    renderResults()
  })

  app.pending = true
  renderResults()
}

function previewLoaded(id) {
  document.getElementById(id).className = 'preview loaded'
}

function renderResults() {
  var streams = document.getElementById('streams')
  var chrome = document.getElementById('chrome')

  if (app.pending) {
    streams.className='in-progress'
  } else {
    streams.className='loaded'
    streams.innerHTML = ''
    chrome.innerHTML = ''

    chrome.innerHTML += render(
      'paginator',
      {
        total: app.total,
        prevClass: (app.total > LIMIT && app.page > 0) ? 'enabled' : 'disabled',
        nextClass: (app.total > LIMIT && app.page < Math.floor(app.total / LIMIT)) ? 'enabled' : 'disabled',
        currentPage: app.page + 1,
        totalPages: Math.ceil(app.total / LIMIT)
      }
    )

    for (var i = 0; i < app.streams.length; i++) {
      var stream = app.streams[i]
      streams.innerHTML += render(
        'tile',
        {
          id: 'tile' + i,
          preview: stream.preview.template.replace('{width}', 240).replace('{height}', 180),
          url: stream.channel.url,
          name: stream.channel.display_name,
          game: stream.channel.game,
          description: stream.channel.status,
          viewers: stream.viewers
        }
      )
    }

    setTimeout(function() {
      var backButton = document.getElementById('back-button')
      var nextButton = document.getElementById('next-button')

      backButton.onclick = function() { pageBackward() }
      nextButton.onclick = function() { pageForward() }
    }, 16)
  }
}

function init() {
  var searchButton = document.getElementById('search-button')
  var input = document.getElementById('search-input')

  searchButton.onclick = function() { executeQuery(input.value) }
  executeQuery()
}

init()
