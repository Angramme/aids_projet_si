const CAN = document.getElementById('vidcan');
const CTX = CAN.getContext('2d');
let urlObject = null;
let image = document.createElement('img');

const date_input = document.getElementById("playbackdate");
const hour_input = document.getElementById("playbacktime");
let cvideo_time_ms = 0;

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
            if(event.data instanceof Blob){
                URL.revokeObjectURL(urlObject)
                urlObject = URL.createObjectURL(event.data);
                //urlObject = URL.createObjectURL(new Blob([event.data]));
                image.src = urlObject;
            }else{
                try {
                    const json = JSON.parse(event.data);
                    if(json.vts){
                        cvideo_time_ms = json.vts;
                        const date = new Date(json.vts);
                        date_input.valueAsDate = date;
                        hour_input.value = date.toLocaleTimeString();
                    }
                } catch(err) {
                    console.log('received invalid message from the server through ws:  ', event.data);
                }
            }
        });
    }, {once:true});

    return ws;
});


let currentWS = setupCommunication('live');

let is_live_mode = true;
const switch_playback_button = document.getElementById("playbackmodebuttons");
const switch_playback_mode_now = ()=>{
    is_live_mode = !is_live_mode;
    switch_playback_button.getElementsByClassName("leftbutton")[0].textContent = is_live_mode ? "live" : "playback";
    switch_playback_button.getElementsByClassName("rightbutton")[0].textContent = is_live_mode ? "playback" : "live";
    document.getElementById("playbackcontrols").style.bottom = is_live_mode ? '-40px' : '5px';
    document.getElementById("playbackinfo").style.bottom = is_live_mode ? '5px' : '40px';

    currentWS = currentWS
    .then(ws=>ws.close())
    .then(()=>setupCommunication(is_live_mode ? 'live' : 'playback'));
};
switch_playback_button.addEventListener("click", switch_playback_mode_now);

const pause_playback_button = document.getElementById("pauseplaybackbutton");
pause_playback_button.addEventListener("click", ()=>{
    currentWS.then(ws=>ws.send(JSON.stringify({type:"pause-toggle"})));
});
const jumpback_playback_button = document.getElementById("jumpbackplaybackbutton");
jumpback_playback_button.addEventListener("click", ()=>{
    currentWS.then(ws=>ws.send(JSON.stringify({type:"go-to-timestamp", timestamp:cvideo_time_ms-5000})));
});
const jumpforward_playback_button = document.getElementById("jumpfrontplaybackbutton");
jumpforward_playback_button.addEventListener("click", ()=>{
    currentWS.then(ws=>ws.send(JSON.stringify({type:"go-to-timestamp", timestamp:cvideo_time_ms+5000})));
});

const date_hour_change_listener = e=>{
    const ts = new Date(date_input.value + ' ' + hour_input.value).getTime();
    currentWS.then(ws=>ws.send(JSON.stringify({type:"go-to-timestamp", timestamp:ts})));
};
date_input.addEventListener('change', date_hour_change_listener);
hour_input.addEventListener('change', date_hour_change_listener);

const pause_now = e=>{
    currentWS.then(ws=>ws.send(JSON.stringify({type:"pause-set", value:true})));
};
date_input.addEventListener('focus', pause_now);
hour_input.addEventListener('focus', pause_now);

const record_checkbox = document.getElementById("recordcheckbox");
const update_record_checkbox = ()=>{
    fetch('/ws/playback/record')
    .then(res=>{
        if(!res.ok)
            alert('ERROR: You are not logged in!');
        return res.text();
    })
    .then(txt=>{
        record_checkbox.checked = txt == "true";
    })
};
record_checkbox.addEventListener("change", e=>{
    const recnow = record_checkbox.checked;
    fetch('/ws/playback/record', {
        method: 'POST',
        mode: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        redirect: 'error', // manual, *follow, error
        body: JSON.stringify({
            record: recnow
        })
    })
    .then(update_record_checkbox)
    .catch(err=>{
        console.error('cannot set recording state!: ', err);
    });
})
update_record_checkbox();

const open_archive_button = document.getElementById("openarchive");
const archive_window = document.getElementById("archivewindow");
const open_archive_window = ()=>{
    archive_window.innerText = "";
    archive_window.style.display = "block";

    if(is_live_mode) switch_playback_mode_now();

    fetch("/ws/playback/archive")
    .then(res=>{
        if(!res.ok)
            alert('ERROR: You are not logged in!');
        return res.json();
    })
    .then(json=>json.timestamps)
    .then(list=>{
        list.splice(0, 1);
        for(let ts of list){
            let p = document.createElement("p");
            p.textContent = new Date(ts).toLocaleString();
            p.timestamp = ts;
            p.classList.add("timestamp_link");
            archive_window.appendChild(p);
        }
        window.addEventListener("click", e=>{
            archive_window.style.display = "none";
            if(e.target.classList.contains("timestamp_link")){
                currentWS.then(ws=>ws.send(JSON.stringify({type:"go-to-timestamp", 
                    timestamp: Number(e.target.timestamp)})));
            }
        }, {once:true});
    })
};
open_archive_button.addEventListener("click", open_archive_window);


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