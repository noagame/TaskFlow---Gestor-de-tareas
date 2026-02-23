class Tarea {
    /**
     * Representa una tarea en el sistema.
     * @param {{id:number, descripcion:string, estado:string, fechaCreacion:Date|string, fechaInicio?:Date|string, fechaFin?:Date|string, esDiaria?:boolean}} param0
     */
    constructor({ id, descripcion, estado = 'pendiente', fechaCreacion = new Date(), fechaInicio = null, fechaFin = null, esDiaria = false }) {
        this.id = id;
        this.descripcion = descripcion;
        this.estado = estado;
        // convertir cadenas a objetos Date si es necesario
        this.fechaCreacion = fechaCreacion ? new Date(fechaCreacion) : null;
        this.fechaInicio = fechaInicio ? new Date(fechaInicio) : null;
        this.fechaFin = fechaFin ? new Date(fechaFin) : null;
        this.esDiaria = esDiaria;
    }

    cambiarEstado(nuevoEstado) {
        this.estado = nuevoEstado;
    }
}

class GestorTareas {
    constructor() {
        this.tareas = [];
        // cargamos las tareas previamente guardadas (si las hay)
        this.cargarDesdeStorage();
    }

    /**
     * Crea y agrega una nueva tarea al listado.
     * @param {string} descripcion
     * @param {Date|null} fechaInicio
     * @param {Date|null} fechaFin
     * @param {boolean} esDiaria
     * @returns {Tarea}
     */
    agregar(descripcion, fechaInicio = null, fechaFin = null, esDiaria = false) {
        const id = Date.now();
        const tarea = new Tarea({ id, descripcion, fechaInicio, fechaFin, esDiaria });
        this.tareas.push(tarea);
        this.guardarStorage();
        return tarea;
    }

    eliminar(id) {
        this.tareas = this.tareas.filter(t => t.id !== id);
        this.guardarStorage();
    }

    cambiarEstado(id, nuevoEstado) {
        const tarea = this.tareas.find(t => t.id === id);
        if (tarea) {
            tarea.cambiarEstado(nuevoEstado);
            this.guardarStorage();
        }
    }

    guardarStorage() {
        localStorage.setItem('tareas', JSON.stringify(this.tareas));
    }

    cargarDesdeStorage() {
        const json = localStorage.getItem('tareas');
        if (json) {
            // al parsear el JSON las fechas quedan como cadenas, pero el constructor
            // de Tarea ya se encarga de convertirlas a Date
            this.tareas = JSON.parse(json).map(obj => new Tarea(obj));
        }
    }

    async fetchTareasExternas() {
        try {
            const resp = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5');
            const datos = await resp.json();
            datos.forEach(d => {
                const tarea = new Tarea({ id: d.id, descripcion: d.title, estado: d.completed ? 'completa' : 'pendiente' });
                this.tareas.push(tarea);
            });
            this.guardarStorage();
        } catch (e) {
            console.error('Error al obtener tareas', e);
        }
    }
}

const gestor = new GestorTareas();


/**
 * Calcula los segundos restantes para una tarea.
 * Si es diaria, se cuenta hasta la medianoche siguiente.
 * Si tiene fechaFin se resta la hora actual de esa fecha. Si no hay información retorna null.
 */
function segundosRestantes(tarea) {
    const ahora = new Date();
    if (tarea.esDiaria) {
        const mañana = new Date(ahora);
        mañana.setHours(24, 0, 0, 0); // medianoche siguiente
        return Math.ceil((mañana - ahora) / 1000);
    }
    if (tarea.fechaFin) {
        return Math.ceil((tarea.fechaFin - ahora) / 1000);
    }
    return null;
}

/**
 * Formatea segundos en Hora(HH): Minutos (MM): Segundos (SS)
 */
function formatearSegundos(sec) {
    if (sec <= 0) return '00:00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function mostrarTareas() {
    const ul = $('#lista-tareas');
    ul.empty();
    gestor.tareas.forEach(t => {
        // construir una descripción de fechas
        let detalles = '';
        if (t.fechaInicio) detalles += `Inicio: ${t.fechaInicio.toLocaleString()} `;
        if (t.fechaFin) detalles += `Fin: ${t.fechaFin.toLocaleString()} `;
        if (t.esDiaria) detalles += ` (Diaria)`;

        const li = $(
`<li class="list-group-item" data-id="${t.id}">
    <div class="d-flex justify-content-between align-items-center">
        <span class="descripcion ${t.estado === 'completa' ? 'tarea-completada' : ''}">${t.descripcion}</span>
        <div>
            <button class="btn btn-sm btn-success btn-estado">${t.estado === 'pendiente' ? 'Completar' : 'Reabrir'}</button>
            <button class="btn btn-sm btn-danger btn-eliminar">Eliminar</button>
        </div>
    </div>
    <small class="text-muted d-block">${detalles}</small>
    <small class="text-info d-block contador"></small>
</li>`);
        ul.append(li);
    });
    // actualizar de inmediato los contadores tras reconstruir la lista
    actualizarContadores();
}

function mostrarNotificacion(msg) {
    const div = $('#notificacion');
    div.text(msg).removeClass('d-none');
    setTimeout(() => div.addClass('d-none'), 2000);
}

// la función antigua ya no se utiliza, se reemplaza por la actualización automática en cada tarea

$(document).ready(() => {
    mostrarTareas();
    setInterval(actualizarContadores, 1000);

    // cuando se envía el formulario creamos una nueva tarea
    $('#form-tarea').on('submit', async e => {
        e.preventDefault();
        // leer los valores ingresados por el usuario
        const desc = $('#descripcion').val();
        const fechaInicio = $('#fechaInicio').val() ? new Date($('#fechaInicio').val()) : null;
        const fechaFin = $('#fechaFin').val() ? new Date($('#fechaFin').val()) : null;
        const esDiaria = $('#esDiaria').is(':checked');

        // limpiar campos para próxima inserción
        $('#descripcion').val('');
        $('#fechaInicio').val('');
        $('#fechaFin').val('');
        $('#esDiaria').prop('checked', false);

        // Simular retardo asincrónico (por ejemplo un POST a un servidor)
        await new Promise(r => setTimeout(r, 500));
        gestor.agregar(desc, fechaInicio, fechaFin, esDiaria);
        mostrarTareas();
        mostrarNotificacion('Tarea agregada correctamente');
    });

    // delegado de evento para el botón eliminar en cada ítem
    $('#lista-tareas').on('click', '.btn-eliminar', function () {
        const id = Number($(this).closest('li').data('id'));
        gestor.eliminar(id);
        mostrarTareas();
    });

    // delegado para el botón de cambiar estado
    $('#lista-tareas').on('click', '.btn-estado', function () {
        const li = $(this).closest('li');
        const id = Number(li.data('id'));
        const tarea = gestor.tareas.find(t => t.id === id);
        const nuevoEstado = tarea.estado === 'pendiente' ? 'completa' : 'pendiente';
        // si vamos a completar, congelamos el tiempo restante
        if (nuevoEstado === 'completa') {
            tarea.segundosCongelados = segundosRestantes(tarea);
        } else {
            // al reabrir quitamos el valor congelado para que se recalculen contadores
            delete tarea.segundosCongelados;
        }
        gestor.cambiarEstado(id, nuevoEstado);
        mostrarTareas();
    });

    // ejemplo de evento keyup para la caja de texto; actualmente sólo escribe un log
    $('#descripcion').on('keyup', function () {
        console.log('Tecla presionada');
    });

    // pequeños efectos visuales al pasar el ratón por encima de un ítem
    $('#lista-tareas').on('mouseover', 'li', function () {
        $(this).addClass('bg-light');
    }).on('mouseout', 'li', function () {
        $(this).removeClass('bg-light');
    });

    // ya no usamos contador global, se gestiona dentro de cada tarea

    // cargar tareas desde API externa
    gestor.fetchTareasExternas().then(() => mostrarTareas());
});

/**
 * Recorre las tareas visibles y actualiza el contador en cada elemento.
 */
function actualizarContadores() {
    $('#lista-tareas li').each(function () {
        const id = Number($(this).data('id'));
        const tarea = gestor.tareas.find(t => t.id === id);
        const span = $(this).find('.contador');
        if (tarea.estado === 'completa') {
            // si la tarea está completa mantenemos el valor congelado (si existe)
            if (tarea.segundosCongelados != null) {
                span.text('Tiempo restante: ' + formatearSegundos(tarea.segundosCongelados));
            }
        } else {
            const cont = segundosRestantes(tarea);
            if (cont !== null) {
                span.text('Tiempo restante: ' + formatearSegundos(cont));
            } else {
                span.text('');
            }
        }
    });
}
