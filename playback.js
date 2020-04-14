const cv = require('opencv4nodejs');
const config = require('./package.json').config;
const path = require('path');
const cryptoRandomString = require('crypto-random-string');

const fs = require('fs');
const util = require('util');
//const readdirAsync = util.promisify(fs.readdir);
//const readfileAsync = util.promisify(fs.readFile);
//const writeFileAsync = util.promisify(fs.writeFile);
//const existsAsync = util.promisify(fs.exists);
const appendFileAsync = util.promisify(fs.appendFile);

const VIDEO_MAXLENGTH = 10000; //10s


function toBuffer(ab) {
    return Buffer.from(ab.buffer);
}
function toFloat64Array(b) {
    return new Float64Array(new Uint8Array(b).buffer);
}

const binarySearchLeftBoundIndex = (array, target) => {
    let left = 0;
    let right = array.length - 1;
    while(left < right) {
        let middle = Math.floor((left + right) / 2);
        if(target == array[middle]) return middle;

        if(target > array[middle]) {
            left = middle + 1;
        }else if(target < array[middle]) {
            right = middle - 1;
        }
    }
    return left;
}

const RecordsArchive = new (class RecordsArchive{
    constructor(directory){
        this.directory = directory;
        this.archive_file_path = path.join(this.directory, "archive.bin");

        this.video_filenames = fs.existsSync(this.archive_file_path) ? this.loadArchiveFile() : this.createArchiveFile();
        //console.log(this.video_filenames);
    }

    getFileIndex(timestamp){
        return binarySearchLeftBoundIndex(this.video_filenames, timestamp);
    }
    getByIndex(i){
        if(i<0 || i>=this.video_filenames.length) return null;
        return this.video_filenames[i];
    }
    getFilePath(name){
        return path.join(this.directory, name.toString()+'.avi');
    }

    loadArchiveFile(){
        return Array.from(toFloat64Array(fs.readFileSync(this.archive_file_path)));
    }
    createArchiveFile(){
        let list = fs.readdirSync(this.directory)
        .reduce((arr, file)=>{
            let [num, extension] = file.split('.');
            if(extension == "avi") arr.push(Number(num));
            return arr;
        }, [0])
        .sort((a,b)=>a-b) // sort from smallest to biggest

        fs.writeFileSync(this.archive_file_path, toBuffer(new Float64Array(list)));

        return list;
    }
    async appendToArchive(nfile_timestamp){
        if(nfile_timestamp < this.video_filenames[this.video_filenames.length-1] + VIDEO_MAXLENGTH)
            throw new Error("video overlaps with already existing data");
        return appendFileAsync(this.archive_file_path, toBuffer(new Float64Array([nfile_timestamp])) )
        .then(()=>this.video_filenames.push(nfile_timestamp))
        .catch(err=>{throw new Error('Cannot append new file to archive ' +err)});
    }
})(config.record_directory);

let ActiveVideoStreamers = [];
class VideoStreamer{
    constructor(onframe, timestamp){
        ActiveVideoStreamers.push(this);
        this.onframe = onframe;
        this.go_to_timestamp(timestamp?timestamp : RecordsArchive.getByIndex(1));
        this.loop(true);
    }
    go_to_timestamp(timestamp){
        this._video2_index = RecordsArchive.getFileIndex(timestamp);
        this._video2 = RecordsArchive.getByIndex(this._video2_index);
        if(this._video2){
            this._video2_player = this.createVideoPlayer(this._video2);
            this.next_video();
        }
    }
    next_video(){
        this._video1 = this._video2;
        this._video1_player = this._video2_player;
        this._video2_index++;
        this._video2 = RecordsArchive.getByIndex(this._video2_index);
        this._video2_player = this.createVideoPlayer(this._video2);
    }
    createVideoPlayer(name){
        const filepath = RecordsArchive.getFilePath(name);
        if(!fs.existsSync(filepath)) return null;
        return new cv.VideoCapture(filepath);
    }

    delete(){
        this.loop(false);
        if(this._video1_player) this._video1_player.release();
        if(this._video2_player) this._video2_player.release();
        ActiveVideoStreamers.splice(ActiveVideoStreamers.indexOf(this), 1);
    }
    _loop(){
        if(!this._video1_player && this._video2_player) this.next_video();
        if(!this._video2_player) return;

        let frame = this._video1_player.read();
        if(!frame){
            this.next_video();
            frame = this._video1_player.read();
        }

        const buff = cv.imencode(
            ".webp", 
            frame, 
            [cv.IMWRITE_WEBP_QUALITY, 70]);
        this.onframe(buff);
    }
    loop(v){
        if(v){
            if(this.interval) clearInterval(this.interval);
            this.interval = setInterval(this._loop.bind(this), 1000/config.camera_fps);
            this._paused = false;
        }else if(!v){
            clearInterval(this.interval);
            this._paused = true;
        }
    }
}
require('./cleanup.js').bind(()=>{
    for(let s of ActiveVideoStreamers){
        s.delete();
    }
});


//VIDEO recording
const camera_backend = config.camera_backend;
if(!camera_backend)throw new Error('Camera backend not specified!!!: possible values: "opencv" "puppeteer"');
const camera = require(`./camera-${camera_backend}.js`);

let video_output = null;
let handle = null;
let timeout = null;
function record(v, timeout_caused=false){
    if(v){
        let timestamp = Date.now();
        video_output = new cv.VideoWriter(path.join(config.record_directory, timestamp.toString()+'.avi'), 
            cv.VideoWriter.fourcc('MJPG'), 
            config.camera_fps, 
            new cv.Size(camera.size.width, camera.size.height));

        RecordsArchive.appendToArchive(timestamp);

        if(!timeout_caused && !handle){
            handle = camera.create_handle(frame=>{
                if(video_output) video_output.write(frame);
            }, false);
        }

        timeout = setTimeout(()=>{
            record(false, true);
        }, VIDEO_MAXLENGTH);
    }else{
        if(video_output){ //if isn't deleted already
            video_output.release();
            delete video_output;
            video_output = null;
        }

        if(!timeout_caused){
            clearTimeout(timeout);
            
            if(handle){
                handle.delete();
                delete handle;
                handle = null;
            }
        }else{
            record(true, true);
        }
    }
}
require('./cleanup.js').bind(()=>{
    record(false);
});
if(config.record)
    record(true);


module.exports =  async function routes(fastify, options){
    //websocket stuff
    let session_tokens = {};
    
    fastify.addHook('preHandler', fastify.auth_reject);
    fastify.get('/connect', (req, rep)=>{
        let token = cryptoRandomString({length: 32, type: 'url-safe'});
        session_tokens[token] = true;
        setTimeout(()=>delete session_tokens[token], 5000); //delete in 5 seconds
        rep.send(options.prefix+'/'+token); //on-time-use connection url
    });
    fastify.post('/record', {
        body: {
            type: 'object',
            required: ['record'],
            properties: { record: { type: 'boolean' } }
            }
    }, (req, rep)=>{
        record(req.body.record);
        rep.redirect(200);
    });

    
    fastify.get('/:token', { websocket: true }, (conn, req, params) => {
        if(!session_tokens[params.token]){
            fastify.log.info("socket connection rejected!")
            return conn.socket.close();
        }
        delete session_tokens[params.token];
        fastify.log.info('playback - new socket connection');
        let streamer = new VideoStreamer(buff=>conn.socket.send(buff, {binary:true, compress:false}));
        conn.socket.on('message', e=>{
            let msg = e.data;
            if(msg.type == "go-to-timestamp") streamer.go_to_timestamp(msg.timestamp);
        });
        conn.socket.on('close', ()=>{
            fastify.log.info('playback - socket disconnected');
            streamer.delete();
            delete streamer;
        });
    })
}
