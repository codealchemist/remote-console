const path = require('path')

function routes(app, host) {
  app.get('/install', function (req, res) {
    res.sendFile(path.join(__dirname, './installer/index.html'))
  })

  app.get('/inject', function (req, res) {
    const file = path.join(__dirname, './installer/inject.js')
    res.render(file, { host })
  })

  app.get('/client', function (req, res) {
    const file = path.join(__dirname, '../test-client/dist/main.js')
    res.sendFile(file)
  })
}

module.exports = routes
