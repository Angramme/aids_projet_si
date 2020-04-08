let config = require("./package.json").config;
const HEADLESS = config.headless;
const DRIVER = config.camera_opencv_driver;
const FPS = config.camera_fps;
delete config;

const cv = require('opencv4nodejs');
const cam = new cv.VideoCapture(cv[DRIVER] | 0);

let paused = true;
let intervalID = null;
let handles = [];
let onframe_encoded = [];
let onframe_raw = [];

function loop(){
    const frame = cam.read();

    for(let f of onframe_raw){
        f(frame);
    }

    if(onframe_encoded.length>0){
        const buff = cv.imencode(
            ".webp", 
            frame, 
            [cv.IMWRITE_WEBP_QUALITY, 70]);
        for(let f of onframe_encoded){
            f(buff);
        }
    }

    if(!HEADLESS){
        cv.imshow('display', frame);
        cv.waitKey(1)
    }
}

/*
module.exports.onframe = broadcast=>{
    broadcast_func = broadcast;
};
*/

Object.defineProperty(module.exports, 'size', {
    get: ()=>({
        width:cam.get(cv.CAP_PROP_FRAME_WIDTH),
        height:cam.get(cv.CAP_PROP_FRAME_HEIGHT),
    })
});

const streamnow = v=>{
    if(v && paused){
        paused = false;
        intervalID = setInterval(loop, 1000/FPS) //24 fps
    }else if(!v && !paused){
        paused = true;
        if(!intervalID)throw new Error("intervalID not defined!!!");
        clearInterval(intervalID);
    }
};

module.exports.create_handle = (onframe, encode)=>{
    let obj = {
        onframe: onframe,
        delete: ()=>{
            const i = handles.indexOf(obj);
            if(i>-1)handles.splice(i, 1);

            const arr = (encode?onframe_encoded:onframe_raw);
            const j = arr.indexOf(onframe);
            if(j>-1)arr.splice(j, 1);

            streamnow(handles.length>0);
        }
    };
    handles.push(obj);
    (encode?onframe_encoded:onframe_raw).push(onframe);
    streamnow(handles.length>0);

    return obj;
}



function cleanup(){
    //module.exports.streamnow(false);
    streamnow(false);
    cam.release();
    cv.destroyAllWindows();
    process.exit();
}
process.on('exit', cleanup.bind(null,{cleanup:true}));
//catches ctrl+c event
process.on('SIGINT', cleanup.bind(null, {exit:true}));
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', cleanup.bind(null, {exit:true}));
process.on('SIGUSR2', cleanup.bind(null, {exit:true}));
//catches uncaught exceptions
process.on('uncaughtException', (err, origin) => {
    console.error("ERROR at: ", origin, " : \n", err);
    cleanup();
});
