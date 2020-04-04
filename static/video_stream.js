const CAN = document.getElementById('vidcan');
const CTX = CAN.getContext('2d');

fetch(`http://${window.location.host}/ws/connect`)
.then(res=>{
    if(!res.ok)
        alert('ERROR: You are not logged in!');
    return res.text();
})
.then(wsURL=>new WebSocket(`ws://${window.location.host}${wsURL}`))
.then(ws=>{   
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
        
        CAN.width = cam.width;
        CAN.height = cam.height;
        
        let urlObject;
        let image = document.createElement('img');
        
        ws.addEventListener('message', event=>{
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
    });
})

let p1 = null;
CAN.addEventListener('mousedown', ()=>{
    p1 = relmouseN(CAN);
    CAN.addEventListener('mouseup', ()=>{
        let p2 = relmouseN(CAN);
        fetch('/cam', {
            method: 'POST',
            mode: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'error', // manual, *follow, error
            body: JSON.stringify({
                type:"rotate-by",
                x: p2.x-p1.x,
                y: p2.y-p1.y,
            })
        })
        .catch(err=>{
            console.error('cannot rotate!: ', err);
        })
    }, {once:true});
});
function ui_overlay(ctx){
    if(!gmousedown)return;

    let w = ctx.canvas.width;
    let h = ctx.canvas.height;
    let {x:mx, y:my} = relmouse(ctx.canvas);
    mx = mx*w;
    my = my*h;
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(mx, my);
    ctx.setLineDash([2, 5]);
    ctx.stroke();
    
    ctx.resetTransform();
}