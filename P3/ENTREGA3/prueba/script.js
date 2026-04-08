const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// --- CONFIGURACIÓN Y ESTADO ---
let score = 0;
let lives = 3;
let energy = 100;
let gameRunning = true;
let explosionFrames = []; // Para las naves destruidas

// Carga de sonidos (usa archivos cortos .mp3 o .wav)
const laserSnd = new Audio('laser.mp3');
const explosionSnd = new Audio('explosion.mp3');

// --- OBJETOS DEL JUEGO ---
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 60,
    w: 50, h: 50,
    speed: 7
};

let projectiles = [];
let enemyProjectiles = [];
let aliens = [];
const alienRows = 3;
const alienCols = 8;
let alienDir = 1;
let alienStepY = 0;

// Crear flota inicial
function initAliens() {
    for (let r = 0; r < alienRows; r++) {
        for (let c = 0; c < alienCols; c++) {
            aliens.push({
                x: c * 70 + 100,
                y: r * 60 + 50,
                w: 40, h: 40,
                alive: true,
                explosionTimer: 0
            });
        }
    }
}

// --- CONTROLES (PC y MÓVIL) ---
let keys = {};
window.onkeydown = (e) => keys[e.code] = true;
window.onkeyup = (e) => keys[e.code] = false;

// Adaptación móvil
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnFire = document.getElementById('btn-fire');

btnLeft.ontouchstart = () => keys['ArrowLeft'] = true;
btnLeft.ontouchend = () => keys['ArrowLeft'] = false;
btnRight.ontouchstart = () => keys['ArrowRight'] = true;
btnRight.ontouchend = () => keys['ArrowRight'] = false;
btnFire.onclick = () => { if (energy >= 20) shoot(); };

function shoot() {
    projectiles.push({ x: player.x + player.w/2 - 2, y: player.y, w: 4, h: 15 });
    energy -= 20;
    laserSnd.currentTime = 0;
    laserSnd.play().catch(()=>{}); // Catch para evitar errores si no hay interacción previa
}

// --- LÓGICA PRINCIPAL ---
function update() {
    if (!gameRunning) return;

    // 1. Movimiento Jugador
    if ((keys['ArrowLeft'] || keys['KeyA']) && player.x > 0) player.x -= player.speed;
    if ((keys['ArrowRight'] || keys['KeyD']) && player.x < canvas.width - player.w) player.x += player.speed;
    if (keys['Space']) { if (energy >= 20) shoot(); keys['Space'] = false; }

    // 2. Recarga de Energía (0.5s aprox por unidad de disparo)
    if (energy < 100) energy += 0.4;

    // 3. Movimiento Alienígenas + Velocidad Dinámica
    let aliveCount = aliens.filter(a => a.alive).length;
    if (aliveCount === 0) endGame(true);
    
    let speedMult = 1 + ( (24 - aliveCount) * 0.15 ); // Aumenta velocidad
    let edgeReached = false;

    aliens.forEach(a => {
        if (!a.alive) return;
        a.x += (1 * alienDir) * speedMult;
        if (a.x > canvas.width - a.w || a.x < 0) edgeReached = true;
        
        // Disparo enemigo aleatorio (~1 vez por segundo)
        if (Math.random() < 0.005) {
            enemyProjectiles.push({ x: a.x + a.w/2, y: a.y + a.h, w: 4, h: 10 });
        }
    });

    if (edgeReached) {
        alienDir *= -1;
        aliens.forEach(a => a.y += 20);
    }

    // 4. Proyectiles y Colisiones
    projectiles.forEach((p, pi) => {
        p.y -= 10;
        aliens.forEach(a => {
            if (a.alive && p.x < a.x + a.w && p.x + p.w > a.x && p.y < a.y + a.h && p.y + p.h > a.y) {
                a.alive = false;
                a.explosionTimer = 15; // Requisito de frames de explosión
                projectiles.splice(pi, 1);
                score += 10;
                explosionSnd.play().catch(()=>{});
            }
        });
    });

    enemyProjectiles.forEach((ep, epi) => {
        ep.y += 5;
        if (ep.x < player.x + player.w && ep.x + ep.w > player.x && ep.y < player.y + player.h && ep.y + ep.h > player.y) {
            enemyProjectiles.splice(epi, 1);
            lives--;
            if (lives <= 0) endGame(false);
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar Jugador
    ctx.fillStyle = "#00AAFF";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // Dibujar Aliens
    aliens.forEach(a => {
        if (a.alive) {
            ctx.fillStyle = "#00FF44";
            ctx.fillRect(a.x, a.y, a.w, a.h);
        } else if (a.explosionTimer > 0) {
            ctx.fillStyle = "orange"; // Representación de la explosión
            ctx.fillRect(a.x, a.y, a.w, a.h);
            a.explosionTimer--;
        }
    });

    // Dibujar Disparos
    ctx.fillStyle = "cyan";
    projectiles.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));
    ctx.fillStyle = "red";
    enemyProjectiles.forEach(ep => ctx.fillRect(ep.x, ep.y, ep.w, ep.h));

    // UI (Puntuación, Energía, Vidas)
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`PUNTUACIÓN: ${score}`, 20, 30);
    ctx.fillText(`VIDAS: ${lives}`, 20, 60);
    
    ctx.fillStyle = "#333";
    ctx.fillRect(20, 75, 100, 10);
    ctx.fillStyle = energy > 20 ? "cyan" : "red";
    ctx.fillRect(20, 75, energy, 10);

    if (!gameRunning) {
        ctx.fillStyle = "red";
        ctx.font = "60px Arial";
        ctx.textAlign = "center";
        ctx.fillText(lives > 0 ? "¡VICTORIA!" : "GAME OVER", canvas.width/2, canvas.height/2);
    }
}

function endGame(win) {
    gameRunning = false;
    // Aquí puedes añadir el sonido de victoria o derrota final
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

initAliens();
loop();