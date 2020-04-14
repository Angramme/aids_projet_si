const CAN = document.getElementById('vidcan');
const CTX = CAN.getContext('2d');
let urlObject = null;
let image = document.createElement('img');

function ui_loop(){
    CTX.drawImage(image, 0, 0);
    //ui_overlay(CTX);
    requestAnimationFrame(ui_loop);
}
ui_loop();


function connectToSocket(type){
    if(type!='live'&&type!='playback') throw new Error('invalid type specified');
    return fetch(`http://${window.location.host}/ws/${type}/connect`)
    .then(res=>{
        if(!res.ok)
            alert('ERROR: You are not logged in!');
        return res.text();
    })
    .then(wsURL=>new WebSocket(`ws://${window.location.host}${wsURL}`));
}

const setupCommunication = mode=>connectToSocket(mode)
.then(ws=>{   
    ws.addEventListener('error', err=>console.log('ws error: ', err));
    ws.addEventListener('open', (event)=>console.log(
        '%c successfully connected to server!!!', 
        'color:green; background:white'), {once:true});
    
    ws.addEventListener('message', event=>{
        console.log('initiated canvas size');
        let cam = JSON.parse(event.data);
        
        CAN.width = cam.width;
        CAN.height = cam.height;
        
        ws.addEventListener('message', event=>{
            URL.revokeObjectURL(urlObject)
            urlObject = URL.createObjectURL(new Blob([event.data]));
            image.src = urlObject;
        });
    }, {once:true});

    return ws;
});


let currentWS = setupCommunication('live');

let is_live_mode = true;
const switch_playback_button = document.getElementById("playbackmode");
switch_playback_button.addEventListener("click", ()=>{
    is_live_mode = !is_live_mode;
    switch_playback_button.getElementsByClassName("leftbutton")[0].textContent = is_live_mode ? "live" : "playback";
    switch_playback_button.getElementsByClassName("rightbutton")[0].textContent = is_live_mode ? "playback" : "live";

    currentWS = currentWS
    .then(ws=>ws.close())
    .then(()=>setupCommunication(is_live_mode ? 'live' : 'playback'));
});



CAN.addEventListener('mousedown', ()=>{
    if(!is_live_mode)return;
    //p1 = relmouseN(CAN);
    let int = setInterval(()=>{
        let p2 = relmouseN(CAN);
        fetch('/cam/rotate-by', {
            method: 'POST',
            mode: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'error', // manual, *follow, error
            body: JSON.stringify({
                x: p2.x-0.5,
                y: p2.y-0.5,
            })
        })
        .catch(err=>{
            console.error('cannot rotate!: ', err);
        });
    }, 100);
    CAN.addEventListener('mouseup', ()=>{
        clearInterval(int);
    }, {once:true});
});