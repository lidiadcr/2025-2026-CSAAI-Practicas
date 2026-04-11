/* jshint esversion: 8 */
const BPM = 140; 
const BEAT_DURATION = (60 / BPM) * 1000; 
const VIDEO_INTRO_DELAY = 2700; 

const levelData = {
    1: { map: [0, 0, 0, 0, 1, 1, 1, 1], speedMultiplier: 0.7 },
    2: { map: [0, 1, 0, 1, 0, 1, 0, 1], speedMultiplier: 0.69 },
    3: { map: [0, 0, 1, 1, 0, 0, 1, 1], speedMultiplier: 0.65 },
    4: { map: [1, 0, 1, 1, 0, 1, 0, 0], speedMultiplier: 0.6 },
    5: { map: [0, 1, 1, 0, 1, 0, 0, 1], speedMultiplier: 0.59 },
    6: { map: [1, 1, 0, 1, 0, 0, 1, 0], speedMultiplier: 0.5 }
};

const wordsData = {
    "cama-casa": { 0: "CAMA", 1: "CASA", img0: "cama.png", img1: "casa.png" },
    "queso-beso": { 0: "QUESO", 1: "BESO", img0: "queso.png", img1: "beso.png" },
    "palo-pelo": { 0: "PALO", 1: "PELO", img0: "palo.png", img1: "pelo.png" },
    "moto-mono": { 0: "MOTO", 1: "MONO", img0: "moto.png", img1: "mono.png" }
};

let isPlaying = false;
let isPaused = false;
let startTime = 0;
let pausedTime = 0;
let pauseStart = 0;
let timerInterval = null;
let pauseResolve = null;

const audio = document.getElementById('bg-music');
const victoryAudio = document.getElementById('victory-music');

function toggleControls(disabled) {
    document.getElementById('select-nivel').disabled = disabled;
    document.getElementById('select-secuencia').disabled = disabled;
    document.getElementById('show-titles').disabled = disabled;
}

function updateTimer() {
    if (!isPlaying || isPaused) return;
    const now = Date.now();
    const diff = (now - startTime - pausedTime) / 1000;
    document.getElementById('display-tiempo').innerText = `${diff.toFixed(1)}s`;
}

// Espera que se puede congelar si isPaused es true
function pausableDelay(ms) {
    return new Promise(resolve => {
        let remaining = ms;
        let stepStart = Date.now();

        function tick() {
            if (!isPlaying) { resolve(); return; }

            if (isPaused) {
                remaining -= (Date.now() - stepStart);
                pauseResolve = () => {
                    pauseResolve = null;
                    stepStart = Date.now();
                    tick();
                };
            } else {
                const elapsed = Date.now() - stepStart;
                if (elapsed >= remaining) {
                    resolve();
                } else {
                    setTimeout(tick, Math.min(50, remaining - elapsed));
                }
            }
        }
        tick();
    });
}

function renderGrid(level) {
    const grid = document.getElementById('game-grid');
    grid.innerHTML = '';
    const seqKey = document.getElementById('select-secuencia').value;
    const showTitles = document.getElementById('show-titles').checked;
    
    levelData[level].map.forEach((type, index) => {
        const word = wordsData[seqKey][type];
        const imgFile = wordsData[seqKey][`img${type}`];
        
        const card = document.createElement('div');
        card.className = `card type-${type}`;
        card.id = `card-${index}`;
        
        card.innerHTML = `
            <img class="custom-icon" src="${imgFile}" alt="${word}">
            ${showTitles ? `<span class="card-label">${word}</span>` : ''}
        `;
        grid.appendChild(card);
    });
}

async function playLevel(level) {
    if (!isPlaying) return;
    renderGrid(level);
    document.getElementById('display-nivel').innerText = `${level}/6`;

    await pausableDelay(VIDEO_INTRO_DELAY);

    const { map, speedMultiplier } = levelData[level];
    const stepDuration = BEAT_DURATION * speedMultiplier;

    for (let i = 0; i < 8; i++) {
        if (!isPlaying) break;

        document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
        const card = document.getElementById(`card-${i}`);
        if (card) card.classList.add('active');

        const seqKey = document.getElementById('select-secuencia').value;
        const type = map[i];
        
        document.getElementById('feedback-word').innerText = wordsData[seqKey][type];
        document.querySelector('.emoji-preview').innerHTML = `<img class="feedback-emoji-img" src="${wordsData[seqKey][`img${type}`]}">`;

        await pausableDelay(stepDuration);
    }
}

async function startPartida() {
    if (isPlaying) return;
    isPlaying = true;
    isPaused = false;
    pausedTime = 0;
    audio.currentTime = 0;
    audio.play();

    const feedbackWord = document.getElementById('feedback-word');
    feedbackWord.classList.remove('fin-partida-anim');
    feedbackWord.innerText = '1/5';
    document.querySelector('.emoji-preview').innerHTML = '😆';

    if (victoryAudio) {
        victoryAudio.pause();
        victoryAudio.currentTime = 0;
    }

    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 100);

    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-stop').innerText = 'Detener';
    document.getElementById('display-estado').innerText = "JUGANDO";
    
    toggleControls(true);

    const lvlInicial = parseInt(document.getElementById('select-nivel').value);
    for (let l = lvlInicial; l <= 6; l++) {
        if (!isPlaying) break;
        await playLevel(l);
    }
    if (isPlaying) {  
        endGame("FIN DE LA PARTIDA");
    }
}

function togglePause() {
    const btnStop = document.getElementById('btn-stop');

    if (!isPaused) {
        isPaused = true;
        pauseStart = Date.now();
        audio.pause();
        btnStop.innerText = 'Reanudar';
        document.getElementById('display-estado').innerText = "PAUSADO";
        clearInterval(timerInterval);
    } else {
        isPaused = false;
        pausedTime += Date.now() - pauseStart;
        audio.play();
        btnStop.innerText = 'Detener';
        document.getElementById('display-estado').innerText = "JUGANDO";
        timerInterval = setInterval(updateTimer, 100);
        if (pauseResolve) pauseResolve();
    }
}

function endGame(msg) {
    isPlaying = false;
    isPaused = false;
    clearInterval(timerInterval);
    audio.pause();

    const feedbackWord = document.getElementById('feedback-word');
    const emojiPreview = document.querySelector('.emoji-preview');

    if (msg === "FIN DE LA PARTIDA") {
        feedbackWord.innerText = "¡FIN DE LA PARTIDA!";
        feedbackWord.classList.add('fin-partida-anim');
        emojiPreview.innerHTML = "🏆"; 
        document.getElementById('display-estado').innerText = "¡GANASTE!";
        if (victoryAudio) {
            victoryAudio.muted = audio.muted;
            victoryAudio.play();
        }


    } else {
        feedbackWord.innerText = "Pulsa 'Empezar'";
        emojiPreview.innerHTML = "🏁";
        document.getElementById('display-estado').innerText = "PARADO";
    }

    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-stop').innerText = 'Detener';
    toggleControls(false);
}

document.getElementById('btn-start').addEventListener('click', startPartida);
document.getElementById('btn-stop').addEventListener('click', togglePause);
document.getElementById('btn-music').addEventListener('click', function() {
    audio.muted = !audio.muted;
    this.innerText = `🎵 Música: ${audio.muted ? 'OFF' : 'ON'}`;
});

window.onload = () => renderGrid(1);