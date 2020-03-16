module.exports =  async function routes(fastify, options){
    fastify.register(require('fastify-websocket'))

    const broadcast = (...args) =>
        {for(let client of fastify.websocketServer.clients){
            client.send(...args);
        }};

    //VIDEO
    const VideoCapture = require('camera-capture').VideoCapture;
    const CAM = new VideoCapture();
    CAM.addFrameListener(frame => {
        broadcast(frame.data, {binary:true, compress:true});
    });
    CAM.start();

    //websocket stuff
    fastify.get('/:user', { websocket: true }, (conn, req, params) => {
        fastify.log.info('new socket connection - user:'
            +params.user);

        conn.socket.send(JSON.stringify(CAM.o)); //width, height

        conn.socket.on('message', message => {
            let msg = JSON.parse(message);
            switch(msg.cmd){
                case "rotate_speed":
                    fastify.log.info("rotating: ", msg.x, msg.y);
                    break;
            }
        })
    })
}
