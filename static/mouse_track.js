
let gmouseX = 0;
let gmouseY = 0;
window.addEventListener('mousemove', e=>{
    gmouseX = e.clientX;
    gmouseY = e.clientY;
});

let gmousedown = false;
window.addEventListener("mousedown", e=>gmousedown=true);
window.addEventListener("mouseup", e=>gmousedown=false);

function relmouse(element){
    var rect = element.getBoundingClientRect();
    return {x:gmouseX-rect.left, y:gmouseY-rect.top};
}

function relmouseN(element){
    var rect = element.getBoundingClientRect();
    return {x:(gmouseX-rect.left)/rect.width, 
            y:(gmouseY-rect.top)/rect.height};
}