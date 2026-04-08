const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const scoreElement = document.getElementById('score-value');
const livesElement = document.getElementById('lives-value');
const energyFill = document.getElementById('energy-fill');
const timeElement = document.getElementById('time-value');

// --- CONFIGURACIÓN Y ESTADO ---
let score = 0;
let lives = 3;
let energy = 100;
let gameRunning = true;

// Velocidades base
let alienStepY = 40; // <--- ¡ESTA ERA LA VARIABLE QUE FALTABA!
let alienSpeedX = 1.0;
let enemyBulletSpeed = 2.5;

// Carga de sonidos
const laserSnd = new Audio('laser.mp3');
const explosionSnd = new Audio('explosion.mp3');
const victorySnd = new Audio('victoria.mp3');
const gameOverSnd = new Audio('gameover.mp3');

// --- CRONÓMETRO ---
let startTime;
let timerInterval;

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (!gameRunning) return;
    let elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = String(Math.floor(elapsedTime / 60)).padStart(2, '0');
    const seconds = String(elapsedTime % 60).padStart(2, '0');
    timeElement.textContent = `${minutes}:${seconds}`;
}

// --- OBJETOS DEL JUEGO ---
const player = { x: canvas.width / 2 - 25, y: canvas.height - 60, w: 50, h: 50, speed: 7 };
let projectiles = [];
let enemyProjectiles = [];
let aliens = [];
let alienDir = 1;

function initAliens() {
    aliens = [];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 8; c++) {
            aliens.push({ x: c * 70 + 100, y: r * 60 + 50, w: 40, h: 40, alive: true, explosionTimer: 0 });
        }
    }
}

// --- CONTROLES ---
let keys = {};
window.onkeydown = (e) => keys[e.code] = true;
window.onkeyup = (e) => keys[e.code] = false;

document.getElementById('btn-left').ontouchstart = () => keys['ArrowLeft'] = true;
document.getElementById('btn-left').ontouchend = () => keys['ArrowLeft'] = false;
document.getElementById('btn-right').ontouchstart = () => keys['ArrowRight'] = true;
document.getElementById('btn-right').ontouchend = () => keys['ArrowRight'] = false;
document.getElementById('btn-fire').onclick = () => shoot();

// --- CONTROLES MÓVILES Y SONIDO ---
document.getElementById('btn-fire').onclick = () => {
    if (energy >= 20) shoot();
};

function shoot() {
    if (energy >= 20 && gameRunning) {
        // ... (resto del código)
        laserSnd.currentTime = 0;
        laserSnd.play().catch(()=>{}); // <--- ESTA LÍNEA es la clave
    }
}

function updateUI() {
    scoreElement.textContent = score;
   
    // CAMBIO A CORAZONES ❤
    let corazones = "";
    for(let i=0; i<lives; i++) { corazones += "❤"; }
    livesElement.textContent = corazones || " ";

    energyFill.style.width = energy + '%';
    energyFill.style.background = energy < 20 ? 'red' : 'linear-gradient(90deg, #00AAFF, #00FFCC)';
}

function update() {
    if (!gameRunning) return;

    if ((keys['ArrowLeft'] || keys['KeyA']) && player.x > 0) player.x -= player.speed;
    if ((keys['ArrowRight'] || keys['KeyD']) && player.x < canvas.width - player.w) player.x += player.speed;
    if (keys['Space']) { shoot(); keys['Space'] = false; }

    if (energy < 100) energy += 0.4;

    let aliveAliens = aliens.filter(a => a.alive);
    if (aliveAliens.length === 0) {
        endGame(true); // Ganas
        return;
    }
   
    let speedMult = 1 + ((24 - aliveAliens.length) * 0.12);
    let edgeReached = false;

    aliens.forEach(a => {
        if (!a.alive) return;
        a.x += (alienSpeedX * alienDir) * speedMult;
        if (a.x > canvas.width - a.w || a.x < 0) edgeReached = true;
        if (a.y + a.h >= player.y) endGame(false); // Invasión

        if (Math.random() < 0.0015) {
            enemyProjectiles.push({ x: a.x + 18, y: a.y + 40, w: 4, h: 10 });
        }
    });

    if (edgeReached) {
        alienDir *= -1;
        aliens.forEach(a => { a.y += alienStepY; }); // Aquí ya no fallará
    }

    projectiles.forEach((p, pi) => {
        p.y -= 10;
        aliens.forEach(a => {
            if (a.alive && p.x < a.x + a.w && p.x + p.w > a.x && p.y < a.y + a.h && p.y + p.h > a.y) {
                a.alive = false;
                a.explosionTimer = 15;
                projectiles.splice(pi, 1);
                score += 10;
                explosionSnd.currentTime = 0;
                explosionSnd.play().catch(()=>{});
            }
        });
        if (p.y < 0) projectiles.splice(pi, 1);
    });

    enemyProjectiles.forEach((ep, epi) => {
        ep.y += enemyBulletSpeed;
        if (ep.x < player.x + player.w && ep.x + ep.w > player.x && ep.y < player.y + player.h && ep.y + ep.h > player.y) {
            enemyProjectiles.splice(epi, 1);
            lives--;
            if (lives <= 0) endGame(false); // Sin vidas
        }
        if (ep.y > canvas.height) enemyProjectiles.splice(epi, 1);
    });

    updateUI();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00AAFF";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    aliens.forEach(a => {
        if (a.alive) {
            ctx.fillStyle = "#00FF44";
            ctx.fillRect(a.x, a.y, a.w, a.h);
        } else if (a.explosionTimer > 0) {
            ctx.fillStyle = "orange";
            ctx.fillRect(a.x, a.y, a.w, a.h);
            a.explosionTimer--;
        }
    });

    ctx.fillStyle = "cyan";
    projectiles.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));
    ctx.fillStyle = "red";
    enemyProjectiles.forEach(ep => ctx.fillRect(ep.x, ep.y, ep.w, ep.h));

    if (!gameRunning) {
        let win = aliens.filter(a => a.alive).length === 0;
        ctx.fillStyle = win ? "#00FF44" : "red";
        ctx.font = "bold 60px Arial";
        ctx.textAlign = "center";
        ctx.fillText(win ? "¡VICTORIA!" : "GAME OVER", canvas.width/2, canvas.height/2);
    }
}

function endGame(win) {
    if (!gameRunning) return;
    gameRunning = false;
    clearInterval(timerInterval);
   
    if (win) {
        victorySnd.currentTime = 0;
        victorySnd.play().catch(() => console.log("Error victoria"));
    } else {
        gameOverSnd.currentTime = 0;
        gameOverSnd.play().catch(() => console.log("Error derrota"));
    }
    setTimeout(resetGame, 3000); //
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function resetGame() {
    score = 0;
    lives = 3;
    energy = 100;
    projectiles = [];
    enemyProjectiles = [];
    alienDir = 1;
    player.x = canvas.width / 2 - 25;
    initAliens();
    startTimer();
    gameRunning = true;
}

initAliens();
startTimer();
loop();