module.exports =  async function routes(fastify, options){
    fastify.register(require('fastify-websocket'))

    //VIDEO
    const camera = require('./camera.js');
    camera.onframe(data=>{
        for(let client of fastify.websocketServer.clients){
            client.send(data, {binary:true, compress:true});
        }
    });
    const update_usercount = (()=>{
        let user_count = 0;
        return function(add){
            user_count += add;
            fastify.log.info('streaming: ', user_count>0)
            camera.streamnow(user_count>0);
        }
    })();

    //websocket stuff
    fastify.get('/:user', { websocket: true }, (conn, req, params) => {
        fastify.log.info('new socket connection - user:'+params.user);

        update_usercount(1);
        conn.socket.on('close', ()=>{
            fastify.log.info('socket disconnected - user:'+params.user);
            update_usercount(-1);
        });

        conn.socket.send(JSON.stringify(camera.size));

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
