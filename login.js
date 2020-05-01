const fp = require('fastify-plugin');
const cryptoRandomString = require('crypto-random-string');
const SKIP_LOGIN = require('./package.json').config.skip_auth;

module.exports =  fp(async function routes(fastify, options){

    fastify.register(require('fastify-formbody'))
    fastify.register(require('fastify-cookie'));
    fastify.register(require('fastify-session'), {
        secret: cryptoRandomString({length: 64}),
        cookie:{
            secure:false,
        },
    });

    fastify.get('/login', !SKIP_LOGIN ? 
    (request, reply)=>{
        reply.sendFile('login.html');
    } : 
    (re, rp)=>{
        re.session.authenticated = true;
        rp.redirect('/');
    });

    const UserCredentials = require('./UserCredentials.json');

    fastify.decorate('auth_redirect', async (req, rep)=>{
        return req.session.authenticated ? null : rep.redirect('/login');
    });
    fastify.decorate('auth_reject', async (req, rep)=>{
        return req.session.authenticated ? null : rep.redirect(403);
    });

    fastify.post('/auth', async (req, reply) => {
        //html codes: 401 Unathorized or 403 if not valid password or user...
        await new Promise(r=>setTimeout(r, 1000)); //intentional wait for user experience and anti bruteforce
        if(req.body.username && req.body.password){
            if(UserCredentials[req.body.username] && UserCredentials[req.body.username].pwd === req.body.password){
                req.session.user = {name:req.body.username};
                req.session.authenticated = true;
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
        'auth_redirect',
        'auth_reject'
    ]
});