const path = require('path');
const config = require("./package.json").config;
const fastify = require('fastify')({
  logger: config.debug ? {
    prettyPrint: true,
  } : false,
});


//authentication routes
fastify.register(require('./login.js'));


//streaming routes
if(config.stream||config.record)
fastify.register(require('fastify-websocket'));

if(config.stream)
fastify.register(require('./stream.js'),{
  prefix:'/ws/live',
});

fastify.register(require('./playback.js'),{
  prefix:'/ws/playback',
});

fastify.register(require('./auto-follow.js'),{
  prefix:'/auto',
});


//static 
fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'static'),
  prefix: '/public/',
});


fastify.register(async (fastify)=>{
  fastify.addHook('preHandler', fastify.auth_redirect);

  // home page
  fastify.get('/', function (request, reply) {
    reply.sendFile('index.html');
  });

});

fastify.register(async (fastify)=>{
  fastify.addHook('preHandler', fastify.auth_reject);

  fastify.register(require('./rest-rotate.js'), {
    prefix:'/cam'
  });
});


// Run the server!
fastify.listen(3000, '0.0.0.0', function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`server listening on ${address}`)
})