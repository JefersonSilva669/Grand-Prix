const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const speedValueUI = document.getElementById('speedValue');
const distanceValueUI = document.getElementById('distanceValue');
const healthMotorUI = document.getElementById('health-motor');
const healthSuspensaoUI = document.getElementById('health-suspensao');
const gameOverScreen = document.getElementById('game-over-screen');
const finalDistanceUI = document.getElementById('final-distance');
const restartBtn = document.getElementById('restart-btn');

let width, height;
function resize() {
    // Resolução retro interna e baixa (480x360) para dar o visual clássico 16-bits (bitilizado)
    width = 480;
    height = 360;
    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, s: false, a: false, d: false };
window.addEventListener('keydown', e => { if(keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', e => { if(keys.hasOwnProperty(e.key)) keys[e.key] = false; });

let gameState = {
    running: true,
    distance: 0,
    speed: 50,
    minSpeed: 50 
};

const camera = { y: 1500, depth: 0.8 }; 
const roadWidth = 2000;
const segmentLength = 200;
const drawDistance = 300; 
let segments = [];
let trackLength = 0;

function resetRoad() {
    segments = [];
    for (let n = 0; n < 2000; n++) {
        let curve = 0;
        if (n > 100 && n < 300) curve = 2; 
        if (n > 400 && n < 600) curve = -2; 
        if (n > 800 && n < 1000) curve = 3;
        if (n > 1200 && n < 1400) curve = -3;
        if (n > 1600 && n < 1800) curve = 1.5;

        segments.push({
            index: n,
            z: n * segmentLength,
            curve: curve,
            color: Math.floor(n / 3) % 2 ? 
                {road: '#6b665c', grass: '#738a58', rumble: '#ffffff'} : 
                {road: '#7d776b', grass: '#809962', rumble: '#d1112b'}
        });
    }
    trackLength = segments.length * segmentLength;
}

function getSegment(z) {
    if (z < 0) z += trackLength;
    return segments[Math.floor(z / segmentLength) % segments.length];
}

const player = {
    x: 0, 
    z: 0, 
    widthScale: 0.3,
    baseMaxSpeed: 300,
    currentMaxSpeed: 300,
    acceleration: 0.3,
    braking: 0.8,
    handlingBase: 0.05, 
    currentHandling: 0.05,
    health: { motor: 100, suspensao: 100 },
    
    update(deltaTime) {
        if (keys.ArrowUp || keys.w) gameState.speed += this.acceleration * (deltaTime/16);
        else if (keys.ArrowDown || keys.s) gameState.speed -= this.braking * (deltaTime/16);
        else gameState.speed -= 0.1 * (deltaTime/16); 

        this.currentMaxSpeed = this.baseMaxSpeed * (this.health.motor / 100);
        if (this.currentMaxSpeed < gameState.minSpeed) this.currentMaxSpeed = gameState.minSpeed;
        
        if (gameState.speed > this.currentMaxSpeed) gameState.speed -= 0.5 * (deltaTime/16); 
        if (gameState.speed < gameState.minSpeed) gameState.speed = gameState.minSpeed; 

        this.currentHandling = this.handlingBase * (this.health.suspensao / 100);
        if (this.currentHandling < 0.01) this.currentHandling = 0.01;

        if (keys.ArrowLeft || keys.a) this.x -= this.currentHandling * (deltaTime/16) * (gameState.speed / 50);
        if (keys.ArrowRight || keys.d) this.x += this.currentHandling * (deltaTime/16) * (gameState.speed / 50);

        let currentSegment = getSegment(this.z);
        let speedPercent = gameState.speed / this.baseMaxSpeed;
        this.x -= (currentSegment.curve * speedPercent * 0.02 * (deltaTime/16));

        if (this.x < -1.2) this.x = -1.2;
        if (this.x > 1.2) this.x = 1.2;

        if (Math.abs(this.x) > 1.0) gameState.speed -= 1.5 * (deltaTime/16); 

        let moveStep = gameState.speed * 8 * (deltaTime/16);
        this.z += moveStep;
        if (this.z >= trackLength) this.z -= trackLength;

        gameState.distance += (gameState.speed / 1000) * (deltaTime/16);
    },

    takeDamage(amount, type) {
        if (type === 0) {
            this.health.motor -= amount;
            if (this.health.motor <= 0) this.health.motor = 0;
            updateHealthBar(healthMotorUI, this.health.motor);
        } else {
            this.health.suspensao -= amount;
            if (this.health.suspensao <= 0) this.health.suspensao = 0;
            updateHealthBar(healthSuspensaoUI, this.health.suspensao);
        }

        ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
        ctx.fillRect(0,0,width,height);

        if (this.health.motor <= 0 || this.health.suspensao <= 0) {
            triggerGameOver();
        }
    },

    draw() {
        const bounce = (gameState.speed > gameState.minSpeed) ? Math.sin(Date.now() / 40) * 3 : 0;
        const px = width / 2; 
        const py = height - 120 + bounce; 

        let tilt = 0;
        if (keys.ArrowLeft || keys.a) tilt = -0.05;
        if (keys.ArrowRight || keys.d) tilt = 0.05;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(tilt);
        
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(-70, +25, 140, 20);

        ctx.fillStyle = "#111";
        ctx.fillRect(-80, -15, 30, 50); 
        ctx.fillRect(50, -15, 30, 50);  

        const lg = ctx.createLinearGradient(-40, 0, 40, 0);
        lg.addColorStop(0, "#c0c0c0");
        lg.addColorStop(0.5, "#ffffff");
        lg.addColorStop(1, "#808080");
        
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.ellipse(0, 0, 45, 35, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(0, -35, 16, 0, Math.PI*2); 
        ctx.fill();
        ctx.fillStyle = "#5c4322"; 
        ctx.beginPath();
        ctx.ellipse(0, -15, 26, 20, 0, Math.PI, 0); 
        ctx.fill();
        
        if (gameState.speed > 100 && Math.random() > 0.5) {
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.beginPath();
            ctx.arc(-60 + Math.random()*20, +30, 10 + Math.random()*15, 0, Math.PI*2);
            ctx.arc(60 - Math.random()*20, +30, 10 + Math.random()*15, 0, Math.PI*2);
            ctx.fill();
        }

        ctx.restore();
    }
};

const enemies = [];
function spawnEnemy(zStart) {
    if (!zStart) {
        let spawnAhead = drawDistance * segmentLength;
        zStart = player.z + spawnAhead - 1000;
        if (zStart > trackLength) zStart -= trackLength;
    }
    
    enemies.push({
        z: zStart,
        x: (Math.random() * 2) - 1,   
        speed: 80 + Math.random() * 80, 
        color: `hsl(${Math.random() * 360}, 60%, 40%)`,
        markedForDeletion: false,
        widthScale: 0.3
    });
}
let spawnTimer = 0;

function updateHealthBar(element, health) {
    element.style.width = health + '%';
    if (health > 60) element.style.backgroundColor = '#06d6a0'; 
    else if (health > 30) element.style.backgroundColor = '#ffd166'; 
    else element.style.backgroundColor = '#ef476f'; 
    element.style.boxShadow = `0 0 8px ${element.style.backgroundColor}`;
}

function triggerGameOver() {
    gameState.running = false;
    finalDistanceUI.innerText = gameState.distance.toFixed(1);
    gameOverScreen.classList.remove('hidden');
}

function resetGame() {
    gameState.running = true;
    gameState.distance = 0;
    gameState.speed = gameState.minSpeed; 
    player.health.motor = 100;
    player.health.suspensao = 100;
    player.x = 0;
    player.z = 0;
    
    resetRoad();
    enemies.length = 0;
    for(let i=0; i<30; i++) {
        spawnEnemy(Math.random() * trackLength);
    }
    
    updateHealthBar(healthMotorUI, 100);
    updateHealthBar(healthSuspensaoUI, 100);
    gameOverScreen.classList.add('hidden');
    
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function projectSegment(p, cameraX, cameraZ) {
    p.camera = { x: p.x - cameraX, y: -camera.y, z: p.z - cameraZ };
    p.screen = { scale: camera.depth / p.camera.z, x: 0, y: 0, w: 0 };
    p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
    p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
    p.screen.w = Math.round((p.screen.scale * roadWidth * width / 2));
}

function drawPolygon(x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
}

function render3D() {
    ctx.fillStyle = "#a8c0d9"; 
    ctx.fillRect(0, 0, width, height);

    let baseSegment = getSegment(player.z);
    let basePercent = (player.z % segmentLength) / segmentLength;

    let dx = - (baseSegment.curve * basePercent);
    let renderX = 0;
    let maxY = height; 
    
    let segmentsToDraw = [];

    for (let n = 0; n < drawDistance; n++) {
        let segment = getSegment(player.z + n * segmentLength);
        let loopOffset = (segment.index < baseSegment.index) ? trackLength : 0;
        
        segment.p1 = segment.p1 || { x: 0, y: 0, z: 0 };
        segment.p2 = segment.p2 || { x: 0, y: 0, z: 0 };
        
        segment.p1.z = segment.index * segmentLength;
        segment.p2.z = (segment.index + 1) * segmentLength;

        projectSegment(segment.p1, (player.x * roadWidth) - renderX, player.z - loopOffset);
        projectSegment(segment.p2, (player.x * roadWidth) - renderX - dx, player.z - loopOffset);

        renderX += dx;
        dx += segment.curve;

        if (segment.p1.camera.z <= 0.001 || segment.p2.screen.y >= maxY) continue;
        maxY = segment.p2.screen.y;

        segmentsToDraw.push(segment);

        let color = segment.color;

        ctx.fillStyle = color.grass;
        ctx.fillRect(0, segment.p2.screen.y, width, segment.p1.screen.y - segment.p2.screen.y + 1);

        let w1 = segment.p1.screen.w;
        let w2 = segment.p2.screen.w;

        let rX1 = segment.p1.screen.x;
        let rY1 = segment.p1.screen.y;
        let rX2 = segment.p2.screen.x;
        let rY2 = segment.p2.screen.y;
        
        drawPolygon(rX1 - w1 * 1.1, rY1, rX1 - w1, rY1, rX2 - w2, rY2, rX2 - w2 * 1.1, rY2, color.rumble);
        drawPolygon(rX1 + w1 * 1.1, rY1, rX1 + w1, rY1, rX2 + w2, rY2, rX2 + w2 * 1.1, rY2, color.rumble);
        drawPolygon(rX1 - w1, rY1, rX1 + w1, rY1, rX2 + w2, rY2, rX2 - w2, rY2, color.road);
    }
    
    let visibleEnemies = [];
    for (const e of enemies) {
        let relZ = e.z - player.z;
        if (relZ < 0) relZ += trackLength; 
        if (relZ > 0 && relZ < drawDistance * segmentLength) visibleEnemies.push({...e, relZ: relZ});
    }

    visibleEnemies.sort((a,b) => b.relZ - a.relZ); 

    for (let i = 0; i < visibleEnemies.length; i++) {
        let e = visibleEnemies[i];
        let seg = getSegment(player.z + e.relZ); 
        
        if (seg && seg.p1 && seg.p1.screen) {
            let scale = camera.depth / (e.relZ); 
            if (scale > 0 && scale < 20) { 
                let spriteX = seg.p1.screen.x + (scale * e.x * roadWidth * width / 2);
                let spriteY = seg.p1.screen.y; 
                let spriteW = scale * 1000 * (width / 2); 
                let spriteH = spriteW * 0.5;

                ctx.save();
                ctx.translate(spriteX, -spriteH + spriteY); 
                
                ctx.fillStyle = "rgba(0,0,0,0.5)"; 
                ctx.fillRect(-spriteW/2, spriteH - spriteH*0.1, spriteW, spriteH*0.2);

                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.ellipse(0, spriteH/3, spriteW/2, spriteH/3, 0, 0, Math.PI*2);
                ctx.fill();

                ctx.fillStyle = "#111";
                ctx.fillRect(-spriteW/2 - spriteW*0.1, spriteH - spriteH*0.4, spriteW*0.2, spriteH*0.4);
                ctx.fillRect(spriteW/2 - spriteW*0.1, spriteH - spriteH*0.4, spriteW*0.2, spriteH*0.4);

                ctx.restore();
            }
        }
    }
}

let lastTime = 0;
function gameLoop(timestamp) {
    if (!gameState.running) return;
    
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, width, height);

    player.update(deltaTime);

    spawnTimer += deltaTime;
    let requiredSpawns = Math.max(1000 - gameState.speed * 2, 300); 
    if (spawnTimer > requiredSpawns) {
        spawnEnemy();
        spawnTimer = 0;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        
        e.z += e.speed * 8 * (deltaTime/16);
        if (e.z >= trackLength) e.z -= trackLength;

        let distRelative = e.z - player.z;
        if (distRelative < -segmentLength*2 && distRelative > -trackLength/2) {
            e.markedForDeletion = true; 
        }

        let zTolerance = 400; 
        let rawDist = Math.abs(distRelative);
        if (rawDist > trackLength/2) rawDist = trackLength - rawDist;

        if (rawDist < zTolerance) {
            let xDist = Math.abs(player.x - e.x);
            if (xDist < (player.widthScale + e.widthScale)) {
                let hitSpeedDiff = Math.abs(gameState.speed - e.speed);
                if (xDist < 0.1) player.takeDamage(hitSpeedDiff * 0.1, 0); 
                else player.takeDamage(hitSpeedDiff * 0.1, 1); 
                
                gameState.speed *= 0.5; 
                e.speed = gameState.speed + 50; 
                e.x += (e.x > player.x ? 0.3 : -0.3); 
                if(e.x > 1.5 || e.x < -1.5) e.markedForDeletion = true; 
            }
        }

        if (e.markedForDeletion) enemies.splice(i, 1);
    }

    render3D();
    player.draw();

    speedValueUI.innerText = Math.floor(gameState.speed);
    distanceValueUI.innerText = gameState.distance.toFixed(1);

    requestAnimationFrame(gameLoop);
}

restartBtn.addEventListener('click', () => { resetGame(); });

resetRoad();
resetGame();
