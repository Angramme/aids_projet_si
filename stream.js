module.exports =  async function routes(fastify, options){
    fastify.register(require('fastify-websocket'))

    //VIDEO
    const camera = require('./camera.js');
    camera.onframe(data=>{
        for(let client of fastify.websocketServer.clients){
            client.send(data, {binary:true, compress:false});
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
    const cryptoRandomString = require('crypto-random-string');
    let session_tokens = {};
    fastify.get('/connect', (req, rep)=>{
        if(!fastify.active_sessions.check(req.session.sessionId)){
            rep.redirect(401);
        }else{
            let token = cryptoRandomString({length: 32, type: 'url-safe'});
            session_tokens[token] = true;
            setTimeout(()=>delete session_tokens[token], 5000); //delete in 5 seconds
            rep.send(options.prefix+'/'+token); //on-time-use connection url
        }
    });
    fastify.get('/:token', { websocket: true }, (conn, req, params) => {
        if(!session_tokens[params.token]){
            fastify.log.info("socket connection rejected!")
            return conn.socket.close();
        }
        delete session_tokens[params.token];

        fastify.log.info('new socket connection');

        update_usercount(1);
        conn.socket.on('close', ()=>{
            fastify.log.info('socket disconnected');
            update_usercount(-1);
        });

        conn.socket.send(JSON.stringify(camera.size));
    })
}
