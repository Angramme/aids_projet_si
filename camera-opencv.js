const config = require("./package.json").config;

const cv = require('opencv4nodejs');
const cam = new cv.VideoCapture(cv[config.camera_opencv_driver] | 0); //direct show
const FPS = config.camera_fps;

let paused = true;
let broadcast_func = null;
let intervalID = null;

function loop(){
    const frame = cam.read();
    const buff = cv.imencode(
        ".webp", 
        frame, 
        [cv.IMWRITE_WEBP_QUALITY, 80]);

    cv.imshow('display', frame);
    cv.waitKey(1)

    broadcast_func(buff);
}


module.exports.onframe = broadcast=>{
    broadcast_func = broadcast;
};

module.exports.streamnow = v=>{
    if(v && paused){
        intervalID = setInterval(loop, 1000/FPS) //24 fps
    }else if(!v && !paused){
        if(!intervalID)throw new Error("intervalID not defined!!!");
        clearInterval(intervalID);
    }
};

//module.exports.size = {width:100, height:100};
Object.defineProperty(module.exports, 'size', {
    get: ()=>({
        width:cam.get(cv.CAP_PROP_FRAME_WIDTH),
        height:cam.get(cv.CAP_PROP_FRAME_HEIGHT),
    })
});

Object.defineProperty(module.exports, 'fps', {
    set: v=>{
        FPS = v;
        if(!paused){
            module.exports.streamnow(false);
            module.exports.streamnow(true);
        }
    }
});