const VideoCapture = require('camera-capture').VideoCapture;
const CAM = new VideoCapture();  
CAM.start();
CAM.pause();

//for compression
const sharp = require('sharp');

module.exports.onframe = broadcast=>{
    CAM.addFrameListener(frame => {
        sharp(frame.data, {
            raw:{
                width:this.size.width,
                height:this.size.height,
                channels:4, //rgba
            }
        })
        //.flatten() //remove alpha
        .webp({ //more comrpession than jpeg
            quality:60,
            alphaQuality:0,
        })
        .removeAlpha()
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