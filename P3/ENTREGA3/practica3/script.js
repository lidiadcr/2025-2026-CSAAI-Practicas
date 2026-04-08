/* jshint esversion: 6 */
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

let alienSpeedY = 30; // Cuánto bajan al tocar el borde
let alienSpeedX = 1.5; 
let enemyBulletSpeed = 3; 

// Carga de sonidos
const laserSnd = new Audio('laser.mp3');
const explosionSnd = new Audio('explosion.mp3');
const victorySnd = new Audio('victoria.mp3'); 
const gameOverSnd = new Audio('gameover.mp3');

//Carga de imágenes
const alienImg = new Image();
alienImg.src = 'alien2.png';

const naveImg = new Image();
naveImg.src = 'nave.png';

// --- CRONÓMETRO ---
let startTime;
let timerInterval;

function startTimer() {
    startTime = Date.now();
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (!gameRunning) return;
    let elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = String(Math.floor(elapsedTime / 60)).padStart(2, '0');
    const seconds = String(elapsedTime % 60).padStart(2, '0');
    timeElement.textContent = `${minutes}:${seconds}`;
}

// --- OBJETOS ---
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

function initAliens() {
    aliens = [];
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

// --- CONTROLES ---
let keys = {};
window.onkeydown = (e) => keys[e.code] = true;
window.onkeyup = (e) => keys[e.code] = false;

// Eventos de disparo optimizados
const fireAction = () => { if (gameRunning) shoot(); };
document.getElementById('btn-fire').addEventListener('touchstart', (e) => { e.preventDefault(); fireAction(); });
document.getElementById('btn-fire').onclick = fireAction;

function shoot() {
    if (energy >= 20) {
        projectiles.push({ x: player.x + player.w/2 - 2, y: player.y, w: 4, h: 15 });
        energy -= 20;
        laserSnd.currentTime = 0;
        laserSnd.play().catch(()=>{});
    }
}

function updateUI() {
    scoreElement.textContent = score;
    livesElement.textContent = '❤'.repeat(Math.max(0, lives));
    energyFill.style.width = energy + '%';
    energyFill.style.background = energy < 20 ? 'red' : 'linear-gradient(90deg, #00AAFF, #00FFCC)';
}

// --- LÓGICA PRINCIPAL ---
// --- LÓGICA PRINCIPAL CORREGIDA ---
function update() {
    if (!gameRunning) return;
    // --- AÑADE ESTAS DOS LÍNEAS AQUÍ ---
    if (moveLeftActive && player.x > 0) player.x -= player.speed;
    if (moveRightActive && player.x < canvas.width - player.w) player.x += player.speed;
    // ----------------------------------
    
    // Controles
    if ((keys.ArrowLeft || keys.KeyA) && player.x > 0) player.x -= player.speed;
    if ((keys.ArrowRight || keys.KeyD) && player.x < canvas.width - player.w) player.x += player.speed;
    if (keys.Space) { shoot(); keys.Space = false; }

    // Recuperación de energía
    if (energy < 100) energy += 0.4;

    // Cálculo de aliens vivos para la velocidad
    let aliveAliens = aliens.filter(a => a.alive);
    let speedMult = 1 + ((24 - aliveAliens.length) * 0.1); 
    let edgeReached = false;

    // Movimiento de Aliens y Condición de Derrota por Invasión
    aliens.forEach(a => {
        if (!a.alive) return;
        
        a.x += (alienSpeedX * alienDir) * speedMult;
        
        if (a.x > canvas.width - a.w || a.x < 0) edgeReached = true;
        
        // SI TOCAN AL JUGADOR -> DERROTA Y MÚSICA DE DERROTA
        if (a.y + a.h >= player.y) {
            endGame(false); 
        }

        if (Math.random() < 0.0015) {
            enemyProjectiles.push({ x: a.x + a.w/2, y: a.y + a.h, w: 4, h: 10 });
        }
    });

    if (edgeReached) {
        alienDir *= -1;
        aliens.forEach(a => { a.y += alienSpeedY;}); 
    }

    // Condición de VICTORIA (Solo si matas a todos)
    if (aliveAliens.length === 0 && gameRunning && lives > 0) {
        endGame(true); 
    }

    // Proyectiles Jugador
    projectiles = projectiles.filter(p => {
        p.y -= 10;
        let hit = false;
        aliens.forEach(a => {
            if (a.alive && p.x < a.x + a.w && p.x + p.w > a.x && p.y < a.y + a.h && p.y + p.h > a.y) {
                a.alive = false;
                a.explosionTimer = 15;
                score += 10;
                hit = true;
                explosionSnd.currentTime = 0;
                explosionSnd.play().catch(()=>{});
            }
        });
        return !hit && p.y > 0;
    });

    // Proyectiles Enemigos
    enemyProjectiles = enemyProjectiles.filter(ep => {
        ep.y += enemyBulletSpeed;
        const hitPlayer = ep.x < player.x + player.w && ep.x + ep.w > player.x && ep.y < player.y + player.h && ep.y + ep.h > player.y;
        if (hitPlayer) {
            lives--;
            if (lives <= 0) endGame(false);
            return false;
        }
        return ep.y < canvas.height;
    });

    updateUI();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar Jugador
    ctx.drawImage(naveImg, player.x, player.y, player.w, player.h);

    // Dibujar Aliens
    aliens.forEach(a => {
        if (a.alive) {
            ctx.drawImage(alienImg, a.x, a.y, a.w, a.h);

        } else if (a.explosionTimer > 0) {
            ctx.fillStyle = "orange";
            ctx.fillRect(a.x, a.y, a.w, a.h);
            a.explosionTimer--;
        }
    });

    // Dibujar Proyectiles
    ctx.fillStyle = "cyan";
    projectiles.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));
    ctx.fillStyle = "red";
    enemyProjectiles.forEach(ep => ctx.fillRect(ep.x, ep.y, ep.w, ep.h));

    if (!gameRunning) {
        // LÓGICA CORREGIDA:
        // Solo es victoria si NO quedan aliens Y todavía tienes vidas
        const noAliensLeft = aliens.filter(a => a.alive).length === 0;
        const isVictory = noAliensLeft && lives > 0;

        ctx.fillStyle = isVictory ? "#00FF44" : "red";
        ctx.font = "bold 60px Arial";
        ctx.textAlign = "center";
        ctx.fillText(isVictory ? "¡VICTORIA!" : "GAME OVER", canvas.width/2, canvas.height/2);
    }
}

function endGame(win) {
    if (!gameRunning) return; 
    gameRunning = false;
    clearInterval(timerInterval);
    
    // Ahora win viene directamente de la lógica de colisión
    if (win) {
        victorySnd.currentTime = 0;
        victorySnd.play().catch(() => console.log("Error audio victoria"));
    } else {
        gameOverSnd.currentTime = 0;
        gameOverSnd.play().catch(() => console.log("Error audio derrota"));
    }
    
    setTimeout(resetGame, 3000);
}
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function resetGame() {
    gameOverSnd.pause();
    gameOverSnd.currentTime = 0;

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


// --- CONTROLES PARA MÓVIL Y BOTONES UI ---

// Referencias a los botones del HTML
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

// Variables para controlar si el botón está pulsado
let moveLeftActive = false;
let moveRightActive = false;

// Funciones para activar/desactivar el movimiento
const startMoveLeft = (e) => { e.preventDefault(); moveLeftActive = true; };
const stopMoveLeft = (e) => { e.preventDefault(); moveLeftActive = false; };
const startMoveRight = (e) => { e.preventDefault(); moveRightActive = true; };
const stopMoveRight = (e) => { e.preventDefault(); moveRightActive = false; };

// Eventos para Ratón (PC)
btnLeft.onmousedown = startMoveLeft;
btnLeft.onmouseup = stopMoveLeft;
btnRight.onmousedown = startMoveRight;
btnRight.onmouseup = stopMoveRight;

// Eventos para Pantalla Táctil (Móvil)
btnLeft.addEventListener('touchstart', startMoveLeft);
btnLeft.addEventListener('touchend', stopMoveLeft);
btnRight.addEventListener('touchstart', startMoveRight);
btnRight.addEventListener('touchend', stopMoveRight);

// Integración con el bucle de actualización
// Para que el movimiento sea fluido, añadimos esto a la lógica:


initAliens();
startTimer();
loop();