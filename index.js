const path = require('path');
const config = require("./package.json").config;
const fastify = require('fastify')({
  logger: config.debug ? {
    prettyPrint: true,
  } : false,
});


//streaming server
fastify.register(require('./stream.js'),{
  prefix:'/ws',
});


//static 
fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'static'),
  prefix: '/public/', // optional: default '/'
})

// home page
fastify.get('/', function (request, reply) {
  //reply.send({ hello: 'world' })
  reply.sendFile('index.html');
})


// Run the server!
fastify.listen(3000, '0.0.0.0', function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`server listening on ${address}`)
})