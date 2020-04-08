module.exports =  async function routes(fastify, options){
    fastify.register(require('fastify-websocket'))

    //VIDEO
    if(!options.camera_backend)throw new Error('Camera backend not specified!!!: possible values: "opencv" "puppeteer"');
    const camera = require(`./camera-${options.camera_backend}.js`);
    
    //websocket stuff
    const cryptoRandomString = require('crypto-random-string');
    let session_tokens = {};
    fastify.register(async (fastify)=>{
        fastify.addHook('preHandler', fastify.auth_reject);
        fastify.get('/connect', (req, rep)=>{
            let token = cryptoRandomString({length: 32, type: 'url-safe'});
            session_tokens[token] = true;
            setTimeout(()=>delete session_tokens[token], 5000); //delete in 5 seconds
            rep.send(options.prefix+'/'+token); //on-time-use connection url
        });
    });
    
    fastify.get('/:token', { websocket: true }, (conn, req, params) => {
        if(!session_tokens[params.token]){
            fastify.log.info("socket connection rejected!")
            return conn.socket.close();
        }
        delete session_tokens[params.token];

        fastify.log.info('new socket connection');

        let handle = camera.create_handle(data=>conn.socket.send(data, {binary:true, compress:false}), true);
        conn.socket.on('close', ()=>{
            fastify.log.info('socket disconnected');
            handle.delete();
        });

        conn.socket.send(JSON.stringify(camera.size));
    })
}
