const fp = require('fastify-plugin');

module.exports =  fp(async function routes(fastify, options){
    const cryptoRandomString = require('crypto-random-string');

    fastify.register(require('fastify-formbody'))
    fastify.register(require('fastify-cookie'));
    fastify.register(require('fastify-session'), {
        secret: cryptoRandomString({length: 64}),
        cookie:{
            secure:false,
        },
    });

    fastify.get('/login', (request, reply)=>{
        reply.sendFile('login.html');
    });

    

    //in memory database (bad) but I won't have thousands of clients at once plus it is faster.
    const UserCredentials = require('./UserCredentials.json');
    const session_expire_time = 0.5*60e3; //0.5min
    let active_sessions = {};
    active_sessions.add = (id, name)=>{
        this[id] = {
            name:name,
            last_acted:Date.now(),
        };
    };
    active_sessions.check = (id)=>{
        if(!this[id])return false;
        if( Date.now() - this[id].last_acted > session_expire_time ){
            delete this[id];
            return false;
        }else{
            this[id].last_acted = Date.now();
            return this[id].name;
        }
    }

    fastify.decorate('active_sessions', active_sessions);
    fastify.decorate('authenticate', async (req, rep)=>{
        return active_sessions.check(req.session.sessionId) ? null : rep.redirect('/login');
    });

    fastify.post('/session/bump', async (req, rep)=>{
        active_sessions.check(req.session.sessionId);
        rep.code(200); //OK
    });

    fastify.post('/auth', async (req, reply) => {
        //html codes: 401 Unathorized or 403 if not valid password or user...
        await new Promise(r=>setTimeout(r, 1000)); //intentional wait for user experience and anti bruteforce
        if(req.body.username && req.body.password){
            if(UserCredentials[req.body.username] && UserCredentials[req.body.username].pwd === req.body.password){
                req.session.user = {name:req.body.username};
                active_sessions.add(req.session.sessionId, req.body.username); 
                reply.redirect('/');
            }else{
                reply.redirect(403);
            }
        }else{
            reply.redirect(401);
        }
    })
},{
    decorators:[
        'authenticate'
    ]
});