const rc = {}
rc.test = (params) => {
  console.log('[ Test called ]', params)
  return 'Yay! It works!'
}
rc.log = (value) => {
  console.log(value)
  return value
}

(function () {
  const serverUrl = `https://<%= host %>`

  // Inject remote-console client.
  inject(`${serverUrl}/client`)

  function inject (src, callback) {
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.onload = function () {
      if (typeof callback === 'function') callback()
    }
    script.src = src
    document.getElementsByTagName('head')[0].appendChild(script)
  }
})()
