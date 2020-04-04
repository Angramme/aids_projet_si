const config = require("./package.json").config;

const cv = require('opencv4nodejs');
const cam = new cv.VideoCapture(cv[config.camera_opencv_driver] | 0);
const FPS = config.camera_fps;

const chassis = require('./chassis.js'); //for chassis rotation

let paused = true;
let broadcast_func = null;
let intervalID = null;

function loop(){
    const frame = cam.read();
    const buff = cv.imencode(
        ".webp", 
        frame, 
        [cv.IMWRITE_WEBP_QUALITY, 70]);


    /*
    hog = cv.HOGDescriptor()
    hog.setSVMDetector(cv.HOGDescriptor_getDefaultPeopleDetector())

    
    let [rects, weights] = hog.detectMultiScale(frame, winStride=(4, 4),
		padding=(8, 8), scale=1.05)
	//draw the original bounding boxes
	for (let [x, y, w, h] of rects){
		cv.rectangle(orig, (x, y), (x + w, y + h), (0, 0, 255), 2)
    }
        
        # apply non-maxima suppression to the bounding boxes using a
	# fairly large overlap threshold to try to maintain overlapping
	# boxes that are still people
	rects = np.array([[x, y, x + w, y + h] for (x, y, w, h) in rects])
	pick = non_max_suppression(rects, probs=None, overlapThresh=0.65)
	# draw the final bounding boxes
	for (xA, yA, xB, yB) in pick:
		cv2.rectangle(image, (xA, yA), (xB, yB), (0, 255, 0), 2)
	# show some information on the number of bounding boxes
	filename = imagePath[imagePath.rfind("/") + 1:]
	print("[INFO] {}: {} original boxes, {} after suppression".format(
		filename, len(rects), len(pick)))
        */
    if(!config.camera_opencv_headless){
        cv.imshow('display', frame);
        cv.waitKey(1)
    }

    broadcast_func(buff);
}

function cleanup(){
    module.exports.streamnow(false);
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