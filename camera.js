const VideoCapture = require('camera-capture').VideoCapture;
const CAM = new VideoCapture();  
CAM.start();
CAM.pause();

const sharp = require('sharp');

module.exports.onframe = broadcast=>{
    CAM.addFrameListener(frame => {
        sharp(frame.data, {
            raw:{
                width:this.size.width,
                height:this.size.height,
                channels:4,
            }
        })
        .jpeg({
            quality:10,
        })
        .toBuffer()
        .then(broadcast)
        .catch(err=>console.log('ERROR(sharp):', err))

        //broadcast(frame.data);
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