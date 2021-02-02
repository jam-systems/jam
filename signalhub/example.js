var client = require('./')

var c = client('swarmtest', 'https://signalhub.mafintosh.com')

c.subscribe('hello').on('data', console.log)

c.broadcast('hello', {hello: 'world'}, function () {
  console.log('broadcasted message')
  c.close(function () {
    console.log('closed client')
  })
})
