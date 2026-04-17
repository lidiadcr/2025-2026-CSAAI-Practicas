/* jshint esversion: 6 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas responsivo
function resizeCanvas() {
    const maxW = Math.min(800, window.innerWidth - 10);
    canvas.width = maxW;
    canvas.height = Math.round(maxW * 0.5);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const keys = {};

//CONTROL PARA EL MOVIL 
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
        btn.addEventListener('mousedown', () => { keys[mobileBtnMapping[btnId]] = true; });
        btn.addEventListener('mouseup', () => { keys[mobileBtnMapping[btnId]] = false; });
    }
});


let gameRunning = false;
let gameMode = 0;
let scorePlayer = 0;
let scoreBot = 0;
let botsCanMove = false;
let secondsElapsed = 0;
let timerInterval = null;
const goalSound = new Audio('gol.m4a');
const victorySound = new Audio('victoria.mp3');


function resetPositions() {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const w = canvas.width;
    ball.x = cx; ball.y = cy; ball.dx = 0; ball.dy = 0;
    player.x = cx * 0.6; player.y = cy;
    playerGoalkeeper.x = w * 0.06; playerGoalkeeper.y = cy;
    bots[0].x = cx * 1.4; bots[0].y = cy;
    bots[1].x = w * 0.94; bots[1].y = cy;
}

function showMenu() {
    gameRunning = false;
    victorySound.pause();
    victorySound.currentTime = 0;
    document.getElementById('overlay-message').classList.add('hidden');
    document.getElementById('overlay-menu').classList.remove('hidden');
    resetPositions();
}
window.showMenu = showMenu;


window.startGame = function(mode) {
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


const ball = { x: 0, y: 0, radius: 12, dx: 0, dy: 0, friction: 0.98 };
const player = { x: 0, y: 0, radius: 15, color: '#2196F3', speed: 4, angle: 0 };
const playerGoalkeeper = { x: 0, y: 0, radius: 15, color: '#0D47A1', speed: 2, type: 'portero_azul' };
const bots = [
    { x: 0, y: 0, radius: 15, color: '#f44336', speed: 2.2, type: 'jugador_rojo', stuckTimer: 0, lastX: 0, lastY: 0, detourDir: 1 },
    { x: 0, y: 0, radius: 15, color: '#b71c1c', speed: 2, type: 'portero_rojo' }
];

window.addEventListener('keydown', e => { keys[e.code] = true; e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.code] = false; });

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

function update() {
    if (!gameRunning) return;
    const w = canvas.width, h = canvas.height;
    const goalTop = h * 0.375, goalBot = h * 0.625;

    // Cambiado a notación de punto para el validador
    if (keys.ArrowUp && player.y > player.radius) player.y -= player.speed;
    if (keys.ArrowDown && player.y < h - player.radius) player.y += player.speed;
    if (keys.ArrowLeft && player.x > player.radius) player.x -= player.speed;
    if (keys.ArrowRight && player.x < w - player.radius) player.x += player.speed;
   
    keepInBounds(player);
    if (keys.KeyA) player.angle -= 0.05;
    if (keys.KeyD) player.angle += 0.05;

    if (keys.Space) {
        let dist = Math.hypot(ball.x - player.x, ball.y - player.y);
        if (dist < player.radius + ball.radius + 20) {
            ball.dx = Math.cos(player.angle) * 15;
            ball.dy = Math.sin(player.angle) * 15;
        }
    }

    const allAI = [...bots, playerGoalkeeper];
    allAI.forEach(b => {
        if (!botsCanMove) return;
        let targetX, targetY;
        if (b.type === 'portero_rojo') {
            targetX = w * 0.95; targetY = Math.max(goalTop, Math.min(goalBot, ball.y));
        } else if (b.type === 'portero_azul') {
            targetX = w * 0.05; targetY = Math.max(goalTop, Math.min(goalBot, ball.y));
        } else {
            const movedDist = Math.hypot(b.x - b.lastX, b.y - b.lastY);
            if (movedDist < 0.4) b.stuckTimer++;
            else b.stuckTimer = Math.max(0, b.stuckTimer - 3);
            b.lastX = b.x; b.lastY = b.y;
            if (b.stuckTimer > 50) { b.stuckTimer = 0; b.detourDir *= -1; }
            if (b.x > ball.x) { targetX = ball.x - 5; targetY = ball.y; }
            else { targetX = ball.x + 50; targetY = ball.y; }
            if (b.stuckTimer > 20) { targetX += 30 * b.detourDir; targetY += 60 * b.detourDir; }
        }
        const dx = targetX - b.x, dy = targetY - b.y, dist = Math.hypot(dx, dy);
        if (dist > 1) { b.x += (dx / dist) * b.speed; b.y += (dy / dist) * b.speed; }
        keepInBounds(b);
        let d = Math.hypot(ball.x - b.x, ball.y - b.y);
        let minDist = b.radius + ball.radius;
        if (d < minDist) {
            let angle = Math.atan2(ball.y - b.y, ball.x - b.x);
            let overlap = minDist - d;
            ball.x += Math.cos(angle) * (overlap + 2);
            ball.y += Math.sin(angle) * (overlap + 2);
            ball.dx = Math.cos(angle) * 4; ball.dy = Math.sin(angle) * 4;
        }
    });

    let dPl = Math.hypot(ball.x - player.x, ball.y - player.y);
    if (dPl < player.radius + ball.radius) {
        let angle = Math.atan2(ball.y - player.y, ball.x - player.x);
        ball.dx = Math.cos(angle) * 2 + (ball.x - player.x) * 0.5;
        ball.dy = Math.sin(angle) * 2 + (ball.y - player.y) * 0.5;
    }

    ball.x += ball.dx; ball.y += ball.dy;
    ball.dx *= ball.friction; ball.dy *= ball.friction;

    if (ball.x < 0 || ball.x > w) {
        if (ball.y > goalTop && ball.y < goalBot) {
            if (ball.x < 0) { scoreBot++; showMessage("¡GOL RIVAL!"); }
            else { scorePlayer++; showMessage("¡GOOOL!"); }
        } else {
            ball.dx *= -1.2; ball.x = ball.x < 0 ? 15 : w - 15;
        }
    }
    if (ball.y < 0 || ball.y > h) {
        ball.dy *= -1.2; ball.y = ball.y < 0 ? 15 : h - 15;
        if (Math.abs(ball.dx) < 1) ball.dx = (ball.x > w/2 ? -2 : 2);
    }
}

function showMessage(txt) {
    gameRunning = false;
    document.getElementById('score-player').innerText = scorePlayer;
    document.getElementById('score-bot').innerText = scoreBot;
    document.getElementById('status-text').innerText = txt;
    document.getElementById('overlay-message').classList.remove('hidden');
   
    if (txt === "¡GOOOL!" || txt === "¡GOL RIVAL!") {
        goalSound.currentTime = 0;
        goalSound.play();
    }

    const isGameOver = (gameMode === 1 && (scorePlayer >= 3 || scoreBot >= 3)) ||
                       (gameMode === 2 && (scorePlayer >= 1 || scoreBot >= 1));

    if (isGameOver) {
        
        const playerScored = (txt === "¡GOOOL!");
        setTimeout(() => { stopGoalSound(); endGame(playerScored); }, 1000);
    } else {
        setTimeout(() => { resetPositions(); startCountdown(); stopGoalSound(); }, 1500);
    }
}

function stopGoalSound() {
    goalSound.pause();
    goalSound.currentTime = 0;
}

function endGame(playerScored) {
    gameRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    const win = (gameMode === 2) ? playerScored : (scorePlayer > scoreBot);
    console.log(`endGame: scorePlayer=${scorePlayer}, scoreBot=${scoreBot}, win=${win}`);
    document.getElementById('status-text').innerText = win ? "¡VICTORIA!" : "DERROTA...";
    document.getElementById('final-buttons').classList.remove('hidden');
    if (win) {
        victorySound.currentTime = 0;
        victorySound.play();
    }
}

function updateTimer() {
    if (!gameRunning) return;
    secondsElapsed++;
    const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const secs = (secondsElapsed % 60).toString().padStart(2, '0');
    document.getElementById('game-timer').innerText = `Tiempo: ${mins}:${secs}`;
}

function keepInBounds(obj) {
    const w = canvas.width, h = canvas.height;
    if (obj.x < obj.radius) obj.x = obj.radius;
    if (obj.x > w - obj.radius) obj.x = w - obj.radius;
    if (obj.y < obj.radius) obj.y = obj.radius;
    if (obj.y > h - obj.radius) obj.y = h - obj.radius;
}

function draw() {
    const w = canvas.width, h = canvas.height;
    const goalTop = h * 0.375, goalBot = h * 0.625;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "white"; ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, w-10, h-10);
    ctx.beginPath(); ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h); ctx.stroke();
    ctx.beginPath(); ctx.arc(w/2, h/2, h*0.15, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(0, goalTop, 15, goalBot - goalTop);
    ctx.fillRect(w - 15, goalTop, 15, goalBot - goalTop);
    drawCircle(player.x, player.y, player.radius, player.color);
    drawCircle(playerGoalkeeper.x, playerGoalkeeper.y, playerGoalkeeper.radius, playerGoalkeeper.color);
    bots.forEach(b => drawCircle(b.x, b.y, b.radius, b.color));
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(18, -6); ctx.lineTo(18, 6); ctx.fill();
    ctx.restore();
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