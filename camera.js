const VideoCapture = require('camera-capture').VideoCapture;
const CAM = new VideoCapture();  
CAM.start();
CAM.pause();

module.exports.onframe = broadcast=>{
    CAM.addFrameListener(frame => {
        broadcast(frame.data);
    });
}

module.exports.streamnow = v=>{
    if(v){
        CAM.resume();
    }else{
        CAM.pause();
    }
}

module.exports.size = CAM.o;