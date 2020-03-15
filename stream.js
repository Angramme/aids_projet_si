module.exports =  async function routes(fastify, options){
    fastify.register(require('fastify-websocket'))

    const broadcast = (...args) =>
        fastify.websocketServer.clients.forEach(client => {
            client.send(...args);
        });

    //VIDEO
    const VideoCapture = require('camera-capture').VideoCapture;
    const CAM = new VideoCapture();
    CAM.addFrameListener(frame => {
        //console.log(new Uint8ClampedArray(frame.data));
        broadcast(frame.data, {binary:true, compress:true});
    });
    CAM.start();

    //websocket stuff
    fastify.get('/:user', { websocket: true }, (conn, req, params) => {
        fastify.log.info('new socket connection - user:'
            +params.user);

        conn.socket.send(JSON.stringify(CAM.o)); //width, height

        conn.socket.on('message', message => {
            //...
        })
    })
}
