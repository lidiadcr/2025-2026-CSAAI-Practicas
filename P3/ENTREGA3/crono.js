/* exported iniciarCrono, detenerCrono, obtenerTiempoFinal */
/* jshint esversion: 6 */


// Variables del cronómetro
let startTime;
let timerInterval;
let elapsedTime = 0;

// Función para iniciar el tiempo
function iniciarCrono() {
    startTime = Date.now();
    timerInterval = setInterval(actualizarCrono, 1000);
}

// Función que calcula y muestra el tiempo
function actualizarCrono() {
    const ahora = Date.now();
    elapsedTime = Math.floor((ahora - startTime) / 1000);
    
    const minutos = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    const segundos = (elapsedTime % 60).toString().padStart(2, '0'); // Definida como 'segundos'
    
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        // CORRECCIÓN: Antes decía ${seconds}, ahora usa ${segundos}
        timerElement.innerText = `${minutos}:${segundos}`;
    }
}

// Función para detener el tiempo
function detenerCrono() {
    clearInterval(timerInterval);
}

// Función para obtener el tiempo final
function obtenerTiempoFinal() {
    const minutos = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    const segundos = (elapsedTime % 60).toString().padStart(2, '0');
    // CORRECCIÓN: Antes decía ${seconds}, ahora usa ${segundos}
    return `${minutos}:${segundos}`;
}