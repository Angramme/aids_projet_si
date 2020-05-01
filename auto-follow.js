
const cv = require('opencv4nodejs');
const camera = require(`./camera-opencv.js`);
const chassis = require('./chassis.js');

//hog = new cv.HOGDescriptor()
//hog.setSVMDetector(cv.HAAR_FULLBODY);
const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);

function scan_video (frame){
    const scale = 400/frame.cols;
    frame = frame.resize(new cv.Size(
        frame.cols*scale, frame.rows*scale));
        
    let rects = classifier.detectMultiScale(frame).objects;
        
    /*for(let box of rects){
        cv.drawDetection(frame, box);
    }
    cv.imshow("test", frame);
    cv.waitKey(1);*/

    if(rects.length > 0){
        const box = rects[0];
        chassis.rotate_by(
            (box.x+box.width*0.5)/frame.cols-0.5,
            (box.y+box.height*0.5)/frame.rows-0.5
            );
    }
}

let handle = null;
let following_now = false;
function follow_now(v){
    if(v){
        if(!handle){
            handle = camera.create_handle(scan_video, false);
        }
        following_now = true;
    }else{ 
        if(handle){
            handle.delete();
            delete handle;
            handle = null;
        }
        following_now = false;
    }
}


module.exports =  async function routes(fastify, options){
    fastify.addHook('preHandler', fastify.auth_reject);

    fastify.post("/follow", {
        body: {
            type: 'object',
            required: ['follow'],
            properties: { follow: { type: 'boolean' } }
            }
    }, (req, rep)=>{
        follow_now(req.body.follow);
        rep.redirect(200);
    });
    fastify.get("/follow", (req, rep)=>{
        rep.send(following_now ? "true" : "false");
    });
};