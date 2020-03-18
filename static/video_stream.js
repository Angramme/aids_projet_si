
const ws = new WebSocket(`ws://${window.location.host}/ws/123`);

ws.addEventListener('error', err=>console.log('ws error: ', err));
ws.addEventListener('open', (event)=>console.log(
    '%c successfully connected to server!!!', 
    'color:green; background:white'), {once:true});

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
    
    let urlObject;
    let image = document.createElement('img');

    ws.addEventListener('message', event=>{
        /*event.data.arrayBuffer()
        .then(buffer=>new Uint8ClampedArray(buffer))
        .then(buffer=>new ImageData(buffer, cam.width, cam.height))
        .then(imgdata=>CTX.putImageData(imgdata, 0, 0))
        .then(_=>ui_overlay(CTX))
        */
        const arrayBuffer = event.data;
        if (urlObject) URL.revokeObjectURL(urlObject)
        urlObject = URL.createObjectURL(new Blob([arrayBuffer]));
        image.src = urlObject;
    });

    function ui_loop(){
        CTX.drawImage(image, 0, 0);
        ui_overlay(CTX);
        requestAnimationFrame(ui_loop);
    }
    ui_loop();

    setInterval(e=>{
        if(!gmousedown)return;
        ws.send(JSON.stringify({
            ...relmouseN(CAN), cmd:"rotate_speed",
        }))
    }, 500);
})

function ui_overlay(ctx){
    let w = ctx.canvas.width;
    let h = ctx.canvas.height;
    let {x:mx, y:my} = relmouseN(ctx.canvas);
    mx = mx*w - w/2;
    my = my*h - h/2;

    ctx.translate(w/2, h/2);

    let a = Math.atan2(my, mx);
    let r = Math.sqrt(mx*mx+my*my);

    //ctx.strokeStyle = "rgba(255, 255, 255, "+r/h+")";
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    let da = 10/r;
    ctx.lineTo(Math.cos(a-da)*(r-10),Math.sin(a-da)*(r-10));
    ctx.lineTo(Math.cos(a+da)*(r-10),Math.sin(a+da)*(r-10));
    ctx.closePath();
    ctx.setLineDash([]);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(mx, my);
    ctx.setLineDash([2, 5]);
    ctx.stroke();

    ctx.resetTransform();
}