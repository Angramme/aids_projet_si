function clamp(x, min, max){
    return x < min ? min : (x > max ? max : x);
}

class MotionController{
    constructor(){
        this.x = 0;
        this.s = 0;
        this.a = 0;
        this.target = 0;

        this.maxs = 1.0;
        this.maxa = 2;
    }
    predict(x0){
        const extremum_x = this.s/this.a;
        const A = -this.a/2;
        const B = this.s;
        const C = x0-this.target;
        
        return A*extremum_x*extremum_x + B*extremum_x + C;
    }
    go_to(nx){
        this.target = clamp(nx, 0, 6.28318);
        this.a = this.x < this.target ? this.maxa : -this.maxa;
    }
    move_by(nx){
        this.target = clamp(this.x + nx, 0, 6.28318);
        this.a = this.x < this.target ? this.maxa : -this.maxa;
    }
    update(dt){
        if(Math.abs(this.x-this.target) > 0.01){
            this.x += this.s*dt;
            if((this.s>0)^(this.a>0)){
                this.s += this.a*dt;
            }else if((this.predict(this.x) > 0)^(x>target)){
                this.s -= this.a*dt;
            }else if(this.s < this.maxs){
                this.s += this.a*dt;
            }
        }else{
            this.s = 0;
            this.a = 0;
        }
    }
}

const aspect_ratio = 480/640;
const FOV_horizontal = 60;
const FOV_vertical = FOV_horizontal * aspect_ratio;

let motor_a = new MotionController();
let motor_b = new MotionController();

function to_axis(x, y){
    return {
        y: x*FOV_horizontal,
        x: y*FOV_vertical,
    };
}

module.exports.rotate_by = (x, y)=>{
    let add = to_axis(x, y);
    motor_a.move_by(add.x);
    motor_b.move_by(add.y);
};

module.exports.rotate_to = (x, y)=>{
    let target = to_axis(x, y);
    motor_a.go_to(target.x);
    motor_b.go_to(target.y);
};


const config = require('./package.json').config;

if(config.is_raspberry){
    const raspi = require('raspi');
    const pwm = require('raspi-pwm');
    
    let pwm_a = null;
    let pwm_b = null;
    
    function update(){
        motor_a.update(100);
        motor_b.update(100);
    
        pwm_a.write(motor_a.x/6.28318);
        pwm_b.write(motor_b.x/6.28318);
    }
    
    raspi.init(() => {
        pwm_a = new pwm.PWM(config.servo1_pin);
        pwm_b = new pwm.PWM(config.servo2_pin);
        setInterval(update, 100);
    });
}
    
