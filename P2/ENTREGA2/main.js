/* jshint esversion: 6 */
/* global stopCrono, resetCrono, startCrono */
// Variables de estado
let claveSecreta = [];
let intentos = 7;
let juegoIniciado = false;
let juegoTerminado = false;

// Al cargar la página
window.onload = () => {
    prepararNuevaPartida();
    configurarBotones();
};

function prepararNuevaPartida() {
    // 1. Resetear variables de estado
    claveSecreta = [];
    intentos = 7;
    juegoIniciado = false;
    juegoTerminado = false;
    
    // 2. Generar clave de 4 dígitos únicos
    while(claveSecreta.length < 4) {
        let num = Math.floor(Math.random() * 10);
        if(!claveSecreta.includes(num)) claveSecreta.push(num);
    }

    // 3. Actualizar UI
    document.getElementById('attempts-count').innerText = intentos;
    document.getElementById('message-display').innerText = "Nueva partida preparada. Pulsa un número para comenzar.";
    document.getElementById('message-display').className = "message";

    
    // Reactivar teclado numérico
    const botones = document.querySelectorAll('.num-btn');
    botones.forEach(btn => btn.disabled = false);

    // Reactivar botones de acción (Start/Stop) que bloqueamos al perder
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-stop').disabled = false;

    // Limpiar estilos de los slots (quitar el naranja/rojo del final)
    const slots = document.querySelectorAll('.slot');
    slots.forEach(slot => {
        slot.innerText = '*';
        slot.classList.remove('acierto');
        slot.style.color = ""; // Resetea el color inline que pusimos al perder
        slot.style.borderColor = ""; // Resetea el borde
    });

    // 4. Resetear cronómetro
    stopCrono(); 
    resetCrono(); 
    document.getElementById('cuenta-atrás').innerText = "0:00:00";
    
}

function configurarBotones() {
    // Botones numéricos
    const botonesNum = document.querySelectorAll('.num-btn');
    botonesNum.forEach(btn => {
        btn.onclick = () => {
            const num = parseInt(btn.getAttribute('data-number'));
            comprobarNumero(num, btn); 
        };
    });

    // Botones de acción Start
    document.getElementById('btn-start').onclick = () => {
        if (!juegoTerminado) {
            startCrono();
            juegoIniciado = true; 
        }
    }; // <-- ESTA LLAVE faltaba por cerrar correctamente

    // Botón Stop
    document.getElementById('btn-stop').onclick = () => {
        stopCrono();
    };

    // Botón Reset (Ahora sí funcionará)
    document.getElementById('btn-reset').onclick = () => {
        prepararNuevaPartida();
    };
}


function comprobarNumero(num, botonPulsado) {
    if (juegoTerminado) return;

    // Iniciar cronómetro al primer clic si no estaba ya en marcha
    if (!juegoIniciado) {
        startCrono();
        juegoIniciado = true; 
    }

    botonPulsado.disabled = true;
    intentos--;
    document.getElementById('attempts-count').innerText = intentos;

    let esAcierto = false;
    claveSecreta.forEach((digito, index) => {
        if (digito === num) {
            const slot = document.getElementById(`slot-${index}`);
            slot.innerText = num;
            slot.classList.add('acierto'); 
            esAcierto = true;
        }
    });

    gestionarEstadoJuego(esAcierto);
}

function gestionarEstadoJuego(esAcierto) {
    const msg = document.getElementById('message-display');
    const slotsAcertados = document.querySelectorAll('.slot.acierto').length;

    if (slotsAcertados === 4) {
        finalizarJuego(true);
    } else if (intentos <= 0) {
        finalizarJuego(false);
    } else {
        msg.innerText = esAcierto ? "¡NÚMERO CORRECTO!" : "ESE NÚMERO NO ESTÁ.";
        msg.className = "message " + (esAcierto ? "success-msg" : "error-msg");
    }
}

const sonidoExplosion = new Audio('videoplayback.m4a');

function finalizarJuego(victoria) {
    juegoTerminado = true;
    stopCrono(); 
    const msg = document.getElementById('message-display');
    const tiempoFinal = document.getElementById('cuenta-atrás').innerText;
    
    if (victoria) {
        const intentosConsumidos = 7 - intentos;
        msg.innerHTML = `¡GANASTE!<br>Tiempo: ${tiempoFinal}<br>Gastados: ${intentosConsumidos} | Restantes: ${intentos}`;
        msg.className = "message success-msg";
    } else {
        // REPRODUCCIÓN DE AUDIO 
        sonidoExplosion.play();
        

        msg.innerHTML = `¡BOOM! Perdiste. La clave era: ${claveSecreta.join('')}`;
        msg.className = "message error-msg";
        
        // Revelar la clave en los slots
        claveSecreta.forEach((digito, index) => {
            const slot = document.getElementById(`slot-${index}`);
            if (!slot.classList.contains('acierto')) {
                slot.innerText = digito;
                slot.style.color = "#FFA500";
                slot.style.borderColor = "#FFA500";
            }
        });
    }

    // Bloquear teclado
    document.querySelectorAll('.num-btn').forEach(btn => btn.disabled = true);
}