/* jshint esversion: 6 */
/* global iniciarCrono, detenerCrono */


const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Imágenes
const imgNave = new Image();
imgNave.src = 'assets/nave.png'; 

const imgAlien = new Image();
imgAlien.src = 'assets/alien2.png';

let stars = [];

function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) { 
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 
        });
    }
}

let score = 0;
let lives = 3;
let energy = 100;
let gameRunning = false; // Empieza en false hasta que el usuario pulse JUGAR
let alienDirection = 1; 
let alienSpeed = 1.5;
const SHOOT_COST = 20;
const RECHARGE_RATE = 0.4;

const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 60,
    width: 50,
    height: 50,
    speed: 5
};

let bullets = [];
let enemyBullets = [];
let aliens = [];
let explosions = [];


function initAliens() {
    aliens = [];
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 8; col++) {
            aliens.push({ x: 100 + col * 70, y: 50 + row * 60, width: 40, height: 40 });
        }
    }
}

const keys = {};
document.addEventListener('keydown', e => {
    keys[e.code] = true;
});

document.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'Space' && gameRunning) shoot();
});

// Soporte táctil para disparar
canvas.addEventListener('touchstart', e => {
    e.preventDefault(); 
    if (gameRunning) shoot();
}, { passive: false });

// Movimiento táctil
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const touchX = (touch.clientX - rect.left) * scaleX;
    player.x = touchX - player.width / 2;
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
}, { passive: false });

// Clic con ratón para disparar
canvas.addEventListener('mousedown', () => {
    if (gameRunning) shoot();
});


// ── BOTÓN DE INICIO ──
// El clic/toque del usuario sobre el botón desbloquea el audio del navegador
document.getElementById('start-btn').addEventListener('click', function() {
    // 1. Desbloquear todos los sonidos (el gesto del usuario lo permite)
    const sonidos = ['snd-laser', 'snd-explosion', 'snd-victory', 'snd-gameover'];
    sonidos.forEach(id => {
        const snd = document.getElementById(id);
        if (snd) {
            snd.load();
            snd.play().then(() => {
                snd.pause();
                snd.currentTime = 0;
            }).catch(e => console.warn("Audio no disponible:", id, e));
        }
    });

    // 2. Ocultar pantalla de inicio y mostrar el juego
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

    // 3. Iniciar el juego
    gameRunning = true;
    initAliens();
    initStars();
    actualizarCorazones();
    iniciarCrono();
    draw();
});


function shoot() {
    if (energy >= SHOOT_COST) {
        bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, speed: 7 });
        energy -= SHOOT_COST;
        const snd = document.getElementById('snd-laser');
        if(snd) { snd.currentTime = 0; snd.play(); }
    }
}

function update() {
    if (!gameRunning) return;

    if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x < canvas.width - player.width) player.x += player.speed;

    if (energy < 100) energy += RECHARGE_RATE;
    const energyFill = document.getElementById('energy-fill');
    if (energyFill) energyFill.style.width = energy + "%";

    bullets.forEach((b, i) => {
        b.y -= b.speed;
        if (b.y < 0) bullets.splice(i, 1);
    });

    let touchEdge = false;
    aliens.forEach(a => {
        a.x += alienSpeed * alienDirection;
        if (a.x <= 0 || a.x + a.width >= canvas.width) touchEdge = true;
    });

    if (touchEdge) {
        alienDirection *= -1;
        aliens.forEach(a => a.y += 15);
    }

    if (Math.random() < 0.015 && aliens.length > 0) {
        const rA = aliens[Math.floor(Math.random() * aliens.length)];
        enemyBullets.push({ x: rA.x + 20, y: rA.y + 40, speed: 4 });
    }

    enemyBullets.forEach((eb, i) => {
        eb.y += eb.speed;
        if (eb.x < player.x + player.width && eb.x + 5 > player.x &&
            eb.y < player.y + player.height && eb.y + 10 > player.y) {
            enemyBullets.splice(i, 1);
            lives--;
            actualizarCorazones();
            if (lives <= 0) gameOver(false);
        }
        if (eb.y > canvas.height) enemyBullets.splice(i, 1);
    });

    bullets.forEach((b, bi) => {
        aliens.forEach((a, ai) => {
            if (b.x < a.x + a.width && b.x + 4 > a.x && b.y < a.y + a.height && b.y + 10 > a.y) {
                bullets.splice(bi, 1);
                explosions.push({x: a.x, y: a.y, timer: 15});
                aliens.splice(ai, 1);
                score += 10;
                const scoreEl = document.getElementById('score');
                if (scoreEl) scoreEl.innerText = score;
                const expSnd = document.getElementById('snd-explosion');
                if(expSnd) { expSnd.currentTime = 0; expSnd.play(); }
                alienSpeed += 0.1;
            }
        });
    });

    if (aliens.length === 0) gameOver(true);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "white";
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    if (gameRunning) {
        if (imgNave.complete && imgNave.naturalWidth !== 0) {
            ctx.drawImage(imgNave, player.x, player.y, player.width, player.height);
        } else {
            ctx.fillStyle = "#00d2ff"; 
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }

        aliens.forEach(a => {
            if (imgAlien.complete && imgAlien.naturalWidth !== 0) {
                ctx.drawImage(imgAlien, a.x, a.y, a.width, a.height);
            } else {
                ctx.fillStyle = "#33ff33"; 
                ctx.fillRect(a.x, a.y, a.width, a.height);
            }
        });

        ctx.fillStyle = "yellow";
        bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 10));
        ctx.fillStyle = "red";
        enemyBullets.forEach(eb => ctx.fillRect(eb.x, eb.y, 4, 10));
    } else {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "30px Arial";
        
        if (aliens.length === 0) {
            ctx.fillStyle = "#33ff33";
            ctx.fillText("VICTORY!", canvas.width / 2, canvas.height / 2);
        } else {
            ctx.fillStyle = "red";
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        }
        ctx.fillStyle = "white";
        ctx.font = "15px Arial";
        ctx.fillText("Reiniciando...", canvas.width / 2, canvas.height / 2 + 80);
    }

    explosions.forEach((exp, i) => {
        ctx.fillStyle = "orange";
        ctx.beginPath();
        ctx.arc(exp.x + 20, exp.y + 20, 20, 0, Math.PI*2);
        ctx.fill();
        exp.timer--;
        if (exp.timer <= 0) explosions.splice(i, 1);
    });

    requestAnimationFrame(() => {
        update();
        draw();
    });
}

function gameOver(victory) {
    if (!gameRunning) return;
    gameRunning = false;
    detenerCrono();

    const snd = victory ? document.getElementById('snd-victory') : document.getElementById('snd-gameover');
    if(snd) { snd.currentTime = 0; snd.play(); }
    setTimeout(() => location.reload(), 4000);
}

function actualizarCorazones() {
    const container = document.getElementById('lives-icons-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        const heart = document.createElement('span');
        heart.innerText = '♥'; 
        heart.style.color = '#ff3333'; 
        heart.style.fontSize = '20px'; 
        heart.style.margin = '0 2px'; 
        heart.style.textShadow = '0 0 5px #ff3333'; 
        container.appendChild(heart);
    }
}