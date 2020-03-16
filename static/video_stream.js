
const ws = new WebSocket(`ws://${window.location.host}/ws/123`);

ws.addEventListener('error', console.log);

ws.addEventListener('open', function (event) {
    console.log('%c successfully connected to server!!!', 
        'color:green; background:white');
});

new Promise((resolve, reject)=>{
    ws.addEventListener('message', event=>{
        resolve(JSON.parse(event.data));
    }, {once:true});
})
.then(cam=>{
    const CAN = document.getElementById('vidcan');
    const CTX = CAN.getContext('2d');

    CAN.width = cam.width;
    CAN.height = cam.height;

    ws.addEventListener('message', event=>{
        event.data.arrayBuffer()
        .then(buffer=>new Uint8ClampedArray(buffer))
        .then(buffer=>new ImageData(buffer, cam.width, cam.height))
        .then(imgdata=>CTX.putImageData(imgdata, 0, 0));
    });
})