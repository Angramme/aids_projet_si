let funcs = [];

function cleanup(){
    for(let f of funcs){
        f();
    }
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

module.exports.bind = func=>funcs.push(func);