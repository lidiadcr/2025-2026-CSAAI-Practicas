/* jshint esversion: 6 */
/* exported startCrono, stopCrono, resetCrono */

let tiempo = 0;
let intervalo = null;

function startCrono() {
    if (intervalo) return;
    intervalo = setInterval(() => {
        tiempo++;
        visualizarTiempo();
    }, 1000);
}

function stopCrono() {
    clearInterval(intervalo);
    intervalo = null;
}

function resetCrono() {
    stopCrono();
    tiempo = 0;
    visualizarTiempo();
}

function visualizarTiempo() {
    const horas = Math.floor(tiempo / 3600);
    const minutos = Math.floor((tiempo % 3600) / 60);
    const segundos = tiempo % 60;
    
    // Formato de tiempo limpio: 0:00:00
    const formato = `${horas}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;

    const display = document.getElementById('cuenta-atrás');
    if (display) {
        display.innerText = formato;
    }
} 