const chassis = require('./chassis.js');

const pos_body = {
    type: 'object',
    required: ['x', 'y'],
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
    }
  };

module.exports = function(fastify, opts, done){
    // manual rotation
    fastify.post('/rotate-by', { body: pos_body },
    (req, rep)=>{
      chassis.rotate_by(req.body.x, req.body.y);
      rep.redirect(200);
    });

    fastify.post('/rotate-to', { body: pos_body },
    (req, rep)=>{
      chassis.rotate_to(req.body.x, req.body.y);
      rep.redirect(200);
    });

    done();
}
