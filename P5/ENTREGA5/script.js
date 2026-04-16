const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas responsivo
function resizeCanvas() {
    const maxW = Math.min(800, window.innerWidth - 10);
    canvas.width = maxW;
    canvas.height = Math.round(maxW * 0.5); // mantener ratio 2:1
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- CONTROLES TÁCTILES PARA MÓVIL ---
const mobileBtnMapping = {
    'btn-up': 'ArrowUp',
    'btn-down': 'ArrowDown',
    'btn-left': 'ArrowLeft',
    'btn-right': 'ArrowRight',
    'btn-shoot': 'Space',
    'btn-rot-l': 'KeyA',
    'btn-rot-r': 'KeyD'
};
Object.keys(mobileBtnMapping).forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys[mobileBtnMapping[btnId]] = true;
        }, { passive: false });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys[mobileBtnMapping[btnId]] = false;
        }, { passive: false });
        // Soporte mouse para pruebas en PC
        btn.addEventListener('mousedown', (e) => { keys[mobileBtnMapping[btnId]] = true; });
        btn.addEventListener('mouseup', (e) => { keys[mobileBtnMapping[btnId]] = false; });
    }
});





// --- VARIABLES DE ESTADO ---
let gameRunning = false;
let gameMode = 0; 
let scorePlayer = 0;
let scoreBot = 0;
let botsCanMove = false;
let secondsElapsed = 0;
let timerInterval = null;
const goalSound = new Audio('gol.m4a');
const victorySound = new Audio('victoria.mp3'); // <--- NUEVO: Carga del audio de victoria

// --- OBJETOS DEL JUEGO ---
// Las posiciones se calculan relativas al canvas en resetPositions()
const ball = { x: 0, y: 0, radius: 12, dx: 0, dy: 0, friction: 0.98 };

const player = { x: 0, y: 0, radius: 15, color: '#2196F3', speed: 4, angle: 0 };
const playerGoalkeeper = { x: 0, y: 0, radius: 15, color: '#0D47A1', speed: 2, type: 'portero_azul' };

const bots = [
    { x: 0, y: 0, radius: 15, color: '#f44336', speed: 2.2, type: 'jugador_rojo' },
    { x: 0, y: 0, radius: 15, color: '#b71c1c', speed: 2, type: 'portero_rojo' }
];

const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.code] = false; });

// --- FUNCIONES DE MENÚ Y CONTROL ---
window.startGame = function(mode) {
    // Esto "prepara" los archivos sin que lleguen a sonar (volumen 0 o pausa inmediata)
    goalSound.play().then(() => { 
        goalSound.pause(); 
        goalSound.currentTime = 0; 
    }).catch(e => console.log("Audio prep"));
    
    victorySound.play().then(() => { 
        victorySound.pause(); 
        victorySound.currentTime = 0; 
    }).catch(e => console.log("Audio prep"));

    gameMode = mode;
    scorePlayer = 0; scoreBot = 0;
    secondsElapsed = 0; 
    
    document.getElementById('score-player').innerText = "0";
    document.getElementById('score-bot').innerText = "0";
    document.getElementById('game-timer').innerText = "Tiempo: 00:00";
    
    document.getElementById('overlay-menu').classList.add('hidden');
    document.getElementById('final-buttons').classList.add('hidden');
    
    resetPositions();
    startCountdown();
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
};

window.showMenu = function() {
    gameRunning = false;
    document.getElementById('overlay-message').classList.add('hidden');
    document.getElementById('overlay-menu').classList.remove('hidden');
    resetPositions();
};

window.addEventListener('keydown', e => {
    if (e.code === 'KeyR') location.reload();
    if (e.code === 'KeyM') showMenu();
});

function startCountdown() {
    let count = 3;
    gameRunning = false; botsCanMove = false;
    const overlay = document.getElementById('overlay-message');
    const countdownDisp = document.getElementById('countdown-display');
    overlay.classList.remove('hidden');
    document.getElementById('status-text').innerText = "¡PREPARADOS!";
    
    const timer = setInterval(() => {
        countdownDisp.innerText = count;
        if (count <= 0) {
            clearInterval(timer);
            overlay.classList.add('hidden');
            countdownDisp.innerText = "";
            gameRunning = true;
            setTimeout(() => { botsCanMove = true; }, 500);
        }
        count--;
    }, 800);
}

function resetPositions() {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const w = canvas.width, h = canvas.height;
    ball.x = cx; ball.y = cy; ball.dx = 0; ball.dy = 0;
    player.x = cx * 0.6; player.y = cy;
    playerGoalkeeper.x = w * 0.06; playerGoalkeeper.y = cy;
    bots[0].x = cx * 1.4; bots[0].y = cy;
    bots[1].x = w * 0.94; bots[1].y = cy;
}

function update() {
    if (!gameRunning) return;

    const w = canvas.width, h = canvas.height;
    const goalTop = h * 0.375, goalBot = h * 0.625; // portería: 25% del alto centrada

    // Movimiento Jugador
    if (keys['ArrowUp'] && player.y > player.radius) player.y -= player.speed;
    if (keys['ArrowDown'] && player.y < h - player.radius) player.y += player.speed;
    if (keys['ArrowLeft'] && player.x > player.radius) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x < w - player.radius) player.x += player.speed;
    
    if (keys['KeyA']) player.angle -= 0.05;
    if (keys['KeyD']) player.angle += 0.05;

    // Chutar
    if (keys['Space']) {
        let dist = Math.hypot(ball.x - player.x, ball.y - player.y);
        if (dist < player.radius + ball.radius + 20) {
            ball.dx = Math.cos(player.angle) * 15;
            ball.dy = Math.sin(player.angle) * 15;
        }
    }

    // IA de los Bots y Porteros
    const allAI = [...bots, playerGoalkeeper];
    allAI.forEach(b => {
        if (!botsCanMove) return;
        
        let targetX, targetY;
        if (b.type === 'portero_rojo') { 
            targetX = w * 0.95; targetY = Math.max(goalTop, Math.min(goalBot, ball.y)); 
        } else if (b.type === 'portero_azul') { 
            targetX = w * 0.05; targetY = Math.max(goalTop, Math.min(goalBot, ball.y)); 
        } else { 
            targetX = ball.x; targetY = ball.y; 
        }

        if (b.x < targetX) b.x += b.speed;
        if (b.x > targetX) b.x -= b.speed;
        if (b.y < targetY) b.y += b.speed;
        if (b.y > targetY) b.y -= b.speed;

        let d = Math.hypot(ball.x - b.x, ball.y - b.y);
        if (d < b.radius + ball.radius) {
            ball.dx = (ball.x - b.x) * 0.5;
            ball.dy = (ball.y - b.y) * 0.5;
        }
    });

    // Colisión Jugador-Balón
    let dPl = Math.hypot(ball.x - player.x, ball.y - player.y);
    if (dPl < player.radius + ball.radius) {
        ball.dx = (ball.x - player.x) * 0.5;
        ball.dy = (ball.y - player.y) * 0.5;
    }

    // Movimiento y fricción del balón
    ball.x += ball.dx; ball.y += ball.dy;
    ball.dx *= ball.friction; ball.dy *= ball.friction;

    // Goles y límites
    if (ball.x < 0 || ball.x > w) {
        if (ball.y > goalTop && ball.y < goalBot) {
            if (ball.x < 0) { scoreBot++; showMessage("¡GOL RIVAL!"); }
            else { scorePlayer++; showMessage("¡GOOOL!"); }
        } else { 
            ball.dx *= -1;
            ball.x = ball.x < 0 ? 5 : w - 5;
        }
    }
    if (ball.y < 0 || ball.y > h) {
        ball.dy *= -1;
        ball.y = ball.y < 0 ? 5 : h - 5;
    }
}

function showMessage(txt) {
    gameRunning = false;
    document.getElementById('score-player').innerText = scorePlayer;
    document.getElementById('score-bot').innerText = scoreBot;
    document.getElementById('status-text').innerText = txt;
    document.getElementById('overlay-message').classList.remove('hidden');
    
    // REPRODUCIR SONIDO DE GOL
    if (txt === "¡GOOOL!" || txt === "¡GOL RIVAL!") {
        goalSound.currentTime = 0;
        goalSound.play();
    }

    // Comprobar si alguien ha alcanzado el límite de goles
    const isGameOver = (gameMode === 1 && (scorePlayer >= 3 || scoreBot >= 3)) || 
                       (gameMode === 2 && (scorePlayer >= 1 || scoreBot >= 1));

    if (isGameOver) {
        setTimeout(() => {
            stopGoalSound(); // Detenemos el audio del gol antes de la victoria
            endGame();
        }, 1000);
    } else {
        setTimeout(() => { 
            resetPositions(); 
            startCountdown(); 
            stopGoalSound(); 
        }, 1500);
    }
}
// Función auxiliar para detener y resetear el audio
function stopGoalSound() {
    goalSound.pause();
    goalSound.currentTime = 0;
}

function endGame() {
    gameRunning = false;
    clearInterval(timerInterval);
    
    const win = scorePlayer > scoreBot;
    document.getElementById('status-text').innerText = win ? "¡VICTORIA!" : "DERROTA...";
    document.getElementById('final-buttons').classList.remove('hidden');

    // REPRODUCIR SONIDO DE VICTORIA
    // Solo suena si el jugador humano ha ganado
    if (win) {
        victorySound.currentTime = 0;
        victorySound.play();
    }
}


// Función auxiliar para detener sonidos si reinicias el juego
window.showMenu = function() {
    gameRunning = false;
    victorySound.pause(); // <--- Detener victoria al volver al menú
    victorySound.currentTime = 0;
    document.getElementById('overlay-message').classList.add('hidden');
    document.getElementById('overlay-menu').classList.remove('hidden');
    resetPositions();
};


function updateTimer() {
    if (!gameRunning) return; // Solo cuenta si el balón se está moviendo
    
    secondsElapsed++;
    const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const secs = (secondsElapsed % 60).toString().padStart(2, '0');
    document.getElementById('game-timer').innerText = `Tiempo: ${mins}:${secs}`;
}

function draw() {
    const w = canvas.width, h = canvas.height;
    const goalTop = h * 0.375, goalBot = h * 0.625;

    ctx.clearRect(0, 0, w, h);
    
    // Campo
    ctx.strokeStyle = "white"; ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, w-10, h-10);
    ctx.beginPath(); ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h); ctx.stroke();
    ctx.beginPath(); ctx.arc(w/2, h/2, h*0.15, 0, Math.PI*2); ctx.stroke();
    
    // Porterías
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(0, goalTop, 15, goalBot - goalTop);
    ctx.fillRect(w - 15, goalTop, 15, goalBot - goalTop);

    // Jugadores
    drawCircle(player.x, player.y, player.radius, player.color);
    drawCircle(playerGoalkeeper.x, playerGoalkeeper.y, playerGoalkeeper.radius, playerGoalkeeper.color);
    bots.forEach(b => drawCircle(b.x, b.y, b.radius, b.color));

    // Flecha dirección jugador
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(18, -6); ctx.lineTo(18, 6); ctx.fill();
    ctx.restore();

    // Balón
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.font = `${ball.radius * 2.5}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚽", 0, 0);
    ctx.restore();

    requestAnimationFrame(() => { update(); draw(); });
}

function drawCircle(x, y, r, c) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
}

draw();