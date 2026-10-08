/* =========================================================
   MEDIOS IGLESIA
   APP.JS
========================================================= */


/* =========================================================
   CONFIGURACIÓN
========================================================= */

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL = "https://derrrsjvymbnvqgsnaxv.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_P9BhDSgqnOimC5RNVi2Nkg_y2vpcFWw";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

console.log("Supabase conectado:", SUPABASE_URL);




const STORAGE_KEY = "medios_iglesia_final";

const USUARIO_INICIAL = {
    id: "usuario-esteban",
    nombre: "Esteban",
    username: "esteban",
    password: "1234",
    rol: "Administrador",
    personaId: "persona-esteban",
    activo: true
};

const AREAS_INICIALES = [
    "Multimedia",
    "Sonido",
    "Streaming",
    "Cámara",
    "Fotografía"
];

const HORARIOS_CULTO = [
    { dia: 3, hora: "18:30" }, // Miércoles
    { dia: 5, hora: "18:30" }, // Viernes
    { dia: 0, hora: "08:00" }, // Domingo
    { dia: 0, hora: "11:00" }  // Domingo
];

const ICONOS_AREA = {
    "Multimedia": "💻",
    "Sonido": "🎙️",
    "Streaming": "📡",
    "Cámara": "🎥",
    "Fotografía": "📷"
};

const DIAS = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado"
];

const MESES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"
];


/* =========================================================
   ESTADO
========================================================= */

let estado = {
    usuarios: [],
    personas: [],
    areas: [],
    servicios: [],
    asignaciones: [],
    publicaciones: {
        publicado: false,
        fecha: null
    }
};

let usuarioActual = null;

let fechaCalendario = new Date();

let asignacionReemplazoActual = null;


/* =========================================================
   UTILIDADES
========================================================= */

function idUnico(prefijo = "id") {

    return (
        prefijo +
        "-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).substring(2, 8)
    );
}


function escapar(texto) {

    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function guardarEstado() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(estado)
    );
}


function cargarEstado() {

    const guardado =
        localStorage.getItem(STORAGE_KEY);

    if (!guardado) {

        crearEstadoInicial();

        return;
    }

    try {

        const datos = JSON.parse(guardado);

        estado = {
            usuarios: Array.isArray(datos.usuarios)
                ? datos.usuarios
                : [],

            personas: Array.isArray(datos.personas)
                ? datos.personas
                : [],

            areas: Array.isArray(datos.areas)
                ? datos.areas
                : [],

            servicios: Array.isArray(datos.servicios)
                ? datos.servicios
                : [],

            asignaciones: Array.isArray(datos.asignaciones)
                ? datos.asignaciones
                : [],

            publicaciones: datos.publicaciones || {
                publicado: false,
                fecha: null
            }
        };

        normalizarEstado();

    } catch (error) {

        console.error(error);

        crearEstadoInicial();
    }
}


async function cargarAreasDesdeSupabase() {

    const { data, error } =
        await supabaseClient
            .from("areas")
            .select("id, nombre, activo")
            .eq("activo", true)
            .order("nombre");

    if (error) {

        console.error(
            "Error cargando áreas desde Supabase:",
            error
        );

        return;
    }

    if (!Array.isArray(data)) {
        return;
    }

    estado.areas = data.map(area => ({
        id: area.id,
        nombre: area.nombre,
        activo: area.activo
    }));

    console.log(
        "Áreas cargadas desde Supabase:",
        estado.areas
    );
}


/* =========================================================
   ESTADO INICIAL
========================================================= */

function crearEstadoInicial() {

    estado = {
        usuarios: [
            { ...USUARIO_INICIAL }
        ],

        personas: [
            {
                id: "persona-esteban",
                nombre: "Esteban",
                rol: "Administrador",
                areas: ["Multimedia"]
            },

            {
                id: "persona-carlos",
                nombre: "Carlos",
                rol: "Servidor",
                areas: ["Sonido"]
            },

            {
                id: "persona-juan",
                nombre: "Juan",
                rol: "Servidor",
                areas: ["Streaming", "Sonido"]
            },

            {
                id: "persona-miguel",
                nombre: "Miguel",
                rol: "Servidor",
                areas: ["Cámara"]
            },

            {
                id: "persona-pedro",
                nombre: "Pedro",
                rol: "Administrador",
                areas: ["Fotografía", "Multimedia"]
            }
        ],

        areas: AREAS_INICIALES.map(
            nombre => ({
                id: idUnico("area"),
                nombre
            })
        ),

        servicios: [],

        asignaciones: [],

        publicaciones: {
            publicado: false,
            fecha: null
        }
    };

    asegurarAdministrador();
    asegurarServiciosGenerales();

    guardarEstado();
}


function normalizarEstado() {

    asegurarAdministrador();

    asegurarAreasIniciales();

    estado.personas.forEach(persona => {

        if (!Array.isArray(persona.areas)) {
            persona.areas = [];
        }

        if (!persona.rol) {
            persona.rol = "Servidor";
        }
    });

    estado.asignaciones.forEach(asignacion => {

        if (!asignacion.asistencia) {
            asignacion.asistencia = "pendiente";
        }

        if (!asignacion.reemplazoEstado) {
            asignacion.reemplazoEstado = "ninguno";
        }

        if (!("reemplazoPersonaId" in asignacion)) {
            asignacion.reemplazoPersonaId = null;
        }
    });

    asegurarServiciosGenerales();

    guardarEstado();
}


function asegurarAdministrador() {

    let usuario =
        estado.usuarios.find(
            u => u.username === "esteban"
        );

    if (!usuario) {

        estado.usuarios.push({
            ...USUARIO_INICIAL
        });

    } else {

        usuario.rol = "Administrador";
        usuario.activo = true;
        usuario.personaId = "persona-esteban";
    }

    let persona =
        estado.personas.find(
            p => p.id === "persona-esteban"
        );

    if (!persona) {

        estado.personas.push({
            id: "persona-esteban",
            nombre: "Esteban",
            rol: "Administrador",
            areas: ["Multimedia"]
        });

    } else {

        persona.nombre = "Esteban";
        persona.rol = "Administrador";

        if (!persona.areas.includes("Multimedia")) {
            persona.areas.push("Multimedia");
        }
    }
}


function asegurarAreasIniciales() {

    AREAS_INICIALES.forEach(nombre => {

        const existe =
            estado.areas.some(
                area => area.nombre.toLowerCase() === nombre.toLowerCase()
            );

        if (!existe) {

            estado.areas.push({
                id: idUnico("area"),
                nombre
            });
        }
    });
}


/* =========================================================
   CULTOS AUTOMÁTICOS
========================================================= */

function asegurarServiciosGenerales() {

    const hoy = new Date();

    for (let i = 0; i < 120; i++) {

        const fecha = new Date(hoy);

        fecha.setDate(
            hoy.getDate() + i
        );

        const dia = fecha.getDay();

        const horarios =
            HORARIOS_CULTO.filter(
                h => h.dia === dia
            );

        horarios.forEach(horario => {

            const fechaTexto =
                formatoFechaISO(fecha);

            const clave =
                fechaTexto + "-" + horario.hora;

            const existe =
                estado.servicios.some(
                    servicio => servicio.clave === clave
                );

            if (!existe) {

                estado.servicios.push({

                    id: "culto-" +
                        clave.replaceAll("-", "") +
                        "-" +
                        horario.hora.replace(":", ""),

                    clave,

                    nombre: "Culto",

                    fecha: fechaTexto,

                    hora: horario.hora,

                    tipo: "general",

                    icono: "⛪",

                    descripcion: "Culto de la iglesia"
                });
            }
        });
    }

    estado.servicios.sort(
        (a, b) =>
            `${a.fecha} ${a.hora}`
                .localeCompare(
                    `${b.fecha} ${b.hora}`
                )
    );
}


/* =========================================================
   FECHAS
========================================================= */

function formatoFechaISO(fecha) {

    const año = fecha.getFullYear();

    const mes =
        String(fecha.getMonth() + 1)
            .padStart(2, "0");

    const dia =
        String(fecha.getDate())
            .padStart(2, "0");

    return `${año}-${mes}-${dia}`;
}


function fechaDesdeISO(texto) {

    const [año, mes, dia] =
        texto.split("-").map(Number);

    return new Date(
        año,
        mes - 1,
        dia
    );
}


function fechaBonita(texto) {

    const fecha =
        fechaDesdeISO(texto);

    return (
        DIAS[fecha.getDay()] +
        " " +
        fecha.getDate() +
        " de " +
        MESES[fecha.getMonth()]
    );
}


function horaBonita(hora) {

    const [h, m] =
        hora.split(":").map(Number);

    const periodo =
        h >= 12 ? "PM" : "AM";

    let hora12 = h % 12;

    if (hora12 === 0) {
        hora12 = 12;
    }

    return `${hora12}:${String(m).padStart(2, "0")} ${periodo}`;
}


/* =========================================================
   PERSONAS / SERVICIOS / ASIGNACIONES
========================================================= */

function buscarPersona(id) {

    return estado.personas.find(
        p => p.id === id
    );
}


function buscarServicio(id) {

    return estado.servicios.find(
        s => s.id === id
    );
}


function buscarAsignacion(id) {

    return estado.asignaciones.find(
        a => a.id === id
    );
}


function iconoFuncion(funcion) {

    const f =
        String(funcion || "").toLowerCase();

    if (f.includes("cámara")) return "🎥";
    if (f.includes("camara")) return "🎥";

    if (f.includes("sonido")) return "🎙️";

    if (f.includes("stream")) return "📡";

    if (f.includes("multimedia")) return "💻";

    if (f.includes("foto")) return "📷";

    return "🎛️";
}


function textoEstado(asignacion) {

    if (asignacion.asistencia === "confirmado") {

        return `
            <span class="estado estado-confirmado">
                ✔️ Confirmado
            </span>
        `;
    }

    if (asignacion.asistencia === "no_asistira") {

        if (
            asignacion.reemplazoEstado ===
            "encontrado"
        ) {

            const reemplazo =
                buscarPersona(
                    asignacion.reemplazoPersonaId
                );

            return `
                <span class="estado estado-no">
                    ❌ No asistirá
                </span>

                <span class="estado estado-reemplazo">
                    🔄 Reemplazo: ${escapar(
                        reemplazo
                            ? reemplazo.nombre
                            : "Asignado"
                    )}
                </span>
            `;
        }

        return `
            <span class="estado estado-no">
                ❌ No asistirá
            </span>

            <span class="estado estado-reemplazo">
                🔄 Reemplazo pendiente
            </span>
        `;
    }

    return `
        <span class="estado estado-pendiente">
            ⏳ Pendiente
        </span>
    `;
}


/* =========================================================
   LOGIN
========================================================= */

async function iniciarSesion(usuario, password) {

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: usuario.trim(),
            password: password
        });

    if (error) {

        console.error("Error de inicio de sesión:", error);

        mostrarMensajeLogin(
            "Correo o contraseña incorrectos."
        );

        return;
    }

    const { data: perfil, error: errorPerfil } =
        await supabaseClient
            .from("perfiles")
            .select(`
                id,
                persona_id,
                rol,
                nombre,
                activo
            `)
            .eq("id", data.user.id)
            .single();

    if (errorPerfil || !perfil) {

        console.error(
            "No se encontró el perfil:",
            errorPerfil
        );

        await supabaseClient.auth.signOut();

        mostrarMensajeLogin(
            "No se encontró el perfil de este usuario."
        );

        return;
    }

    if (perfil.activo !== true) {

        await supabaseClient.auth.signOut();

        mostrarMensajeLogin(
            "Esta cuenta está desactivada."
        );

        return;
    }

    usuarioActual = {
        id: perfil.id,
        personaId: perfil.persona_id,
        nombre: perfil.nombre,
        username: usuario.trim(),
        rol: perfil.rol,
        activo: perfil.activo
    };

    localStorage.setItem(
        "medios_iglesia_sesion",
        usuarioActual.id
    );

    mostrarApp();
}


function mostrarMensajeLogin(texto) {

    const elemento =
        document.getElementById(
            "login-mensaje"
        );

    if (elemento) {
        elemento.textContent = texto;
    }
}


function cerrarSesion() {

    usuarioActual = null;

    localStorage.removeItem(
        "medios_iglesia_sesion"
    );

    document
        .getElementById("app")
        .classList.add("oculta");

    document
        .getElementById("pantalla-login")
        .classList.remove("oculta");
}


function recuperarSesion() {

    const id =
        localStorage.getItem(
            "medios_iglesia_sesion"
        );

    if (!id) {
        return;
    }

    const usuario =
        estado.usuarios.find(
            u => u.id === id
        );

    if (
        usuario &&
        usuario.activo
    ) {

        usuarioActual = usuario;

        mostrarApp();
    }
}


/* =========================================================
   MOSTRAR APP
========================================================= */

function mostrarApp() {

    document
        .getElementById("pantalla-login")
        .classList.add("oculta");

    document
        .getElementById("pantalla-registro")
        .classList.add("oculta");

    document
        .getElementById("app")
        .classList.remove("oculta");

    actualizarPermisos();

    renderizarTodo();

    navegar("inicio");
}


function actualizarPermisos() {

    const esAdmin =
        usuarioActual &&
        usuarioActual.rol === "Administrador";

    document
        .querySelectorAll(".solo-admin")
        .forEach(elemento => {

            elemento.classList.toggle(
                "oculta",
                !esAdmin
            );
        });
}


/* =========================================================
   NAVEGACIÓN
========================================================= */

function navegar(seccion) {

    document
        .querySelectorAll(".seccion")
        .forEach(s => {

            s.classList.remove("activa");
        });

    const objetivo =
        document.getElementById(
            `seccion-${seccion}`
        );

    if (!objetivo) {
        return;
    }

    objetivo.classList.add("activa");

    document
        .querySelectorAll(".nav-btn")
        .forEach(btn => {

            btn.classList.toggle(
                "activo",
                btn.dataset.section === seccion
            );
        });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   RENDER GENERAL
========================================================= */

function renderizarTodo() {

    if (!usuarioActual) {
        return;
    }

    document.getElementById(
        "header-usuario"
    ).textContent =
        usuarioActual.nombre;

    document.getElementById(
        "inicio-nombre"
    ).textContent =
        usuarioActual.nombre;

    document.getElementById(
        "inicio-rol"
    ).textContent =
        usuarioActual.rol;

    renderizarInicio();

    renderizarPersonas();

    renderizarAreas();

    renderizarServicios();

    renderizarAsignaciones();

    renderizarPrivilegios();

    renderizarCalendario();

    renderizarPublicacion();

    renderizarPerfil();

    renderizarCuentas();

    actualizarResumen();
}


/* =========================================================
   INICIO
========================================================= */

function renderizarInicio() {

    const contenedor =
        document.getElementById(
            "inicio-privilegios"
        );

    const personaId =
        usuarioActual.personaId;

    const hoy =
        formatoFechaISO(new Date());

    const asignaciones =
        estado.asignaciones
            .filter(
                a =>
                    a.personaId === personaId &&
                    buscarServicio(a.servicioId) &&
                    buscarServicio(a.servicioId).fecha >= hoy
            )
            .sort((a, b) => {

                const sa = buscarServicio(a.servicioId);
                const sb = buscarServicio(b.servicioId);

                return `${sa.fecha} ${sa.hora}`
                    .localeCompare(
                        `${sb.fecha} ${sb.hora}`
                    );
            })
            .slice(0, 6);

    if (!asignaciones.length) {

        contenedor.innerHTML = `
            <div class="lista-vacia">
                No tienes privilegios asignados próximamente.
            </div>
        `;

        return;
    }

    contenedor.innerHTML =
        asignaciones
            .map(renderPrivilegioUsuario)
            .join("");
}


function renderPrivilegioUsuario(asignacion) {

    const servicio =
        buscarServicio(
            asignacion.servicioId
        );

    if (!servicio) {
        return "";
    }

    const icono =
        iconoFuncion(
            asignacion.funcion
        );

    let acciones = "";

    if (
        asignacion.asistencia ===
        "pendiente"
    ) {

        acciones = `
            <button
                class="btn btn-success btn-small"
                data-action="confirmar-asistencia"
                data-id="${asignacion.id}"
            >
                ✔️ Confirmar asistencia
            </button>

            <button
                class="btn btn-danger btn-small"
                data-action="no-asistir"
                data-id="${asignacion.id}"
            >
                ❌ No voy a asistir
            </button>
        `;
    }

    if (
        asignacion.asistencia ===
        "confirmado"
    ) {

        acciones = `
            <button
                class="btn btn-success btn-small"
                disabled
            >
                ✔️ Asistencia confirmada
            </button>

            <button
                class="btn btn-warning btn-small"
                data-action="no-asistir"
                data-id="${asignacion.id}"
            >
                Cambiar
            </button>
        `;
    }

    if (
        asignacion.asistencia ===
        "no_asistira"
    ) {

        acciones = `

            ${
                asignacion.reemplazoEstado ===
                "encontrado"

                ? `
                    <button
                        class="btn btn-success btn-small"
                        disabled
                    >
                        🔄 Reemplazo asignado
                    </button>
                `

                : `
                    <button
                        class="btn btn-principal btn-small"
                        data-action="buscar-reemplazo"
                        data-id="${asignacion.id}"
                    >
                        🔄 Buscar reemplazo
                    </button>
                `
            }

        `;
    }

    return `
        <article class="card privilegio-card">

            <div class="card-top">

                <div>

                    <div class="privilegio-culto">
                        ⛪ ${escapar(servicio.nombre)}
                    </div>

                    <h3>
                        ${escapar(asignacion.funcion)}
                    </h3>

                </div>

                <div class="card-icon">
                    ${icono}
                </div>

            </div>

            <div class="privilegio-fecha">

                <span class="etiqueta">
                    📅 ${escapar(
                        fechaBonita(servicio.fecha)
                    )}
                </span>

                <span class="etiqueta">
                    🕐 ${escapar(
                        horaBonita(servicio.hora)
                    )}
                </span>

            </div>

            <div class="funcion">

                <div class="funcion-icono">
                    ${icono}
                </div>

                <div>
                    <strong>
                        ${escapar(asignacion.funcion)}
                    </strong>

                    <small>
                        Tu privilegio de servicio
                    </small>
                </div>

            </div>

            ${textoEstado(asignacion)}

            ${
                asignacion.reemplazoEstado ===
                "encontrado"

                ? `
                    <div class="estado estado-reemplazo">
                        🔄 Reemplaza:
                        ${
                            buscarPersona(
                                asignacion.reemplazoPersonaId
                            )
                                ? escapar(
                                    buscarPersona(
                                        asignacion.reemplazoPersonaId
                                    ).nombre
                                )
                                : "Servidor"
                        }
                    </div>
                `
                : ""
            }

            <div class="card-actions">
                ${acciones}
            </div>

        </article>
    `;
}


/* =========================================================
   CONFIRMACIÓN
========================================================= */

function confirmarAsistencia(id) {

    const asignacion =
        buscarAsignacion(id);

    if (!asignacion) {
        return;
    }

    asignacion.asistencia =
        "confirmado";

    asignacion.reemplazoEstado =
        "ninguno";

    asignacion.reemplazoPersonaId =
        null;

    guardarEstado();

    renderizarTodo();

    mostrarToast(
        "Asistencia confirmada correctamente."
    );
}


function noAsistir(id) {

    const asignacion =
        buscarAsignacion(id);

    if (!asignacion) {
        return;
    }

    asignacion.asistencia =
        "no_asistira";

    asignacion.reemplazoEstado =
        "buscando";

    asignacion.reemplazoPersonaId =
        null;

    guardarEstado();

    renderizarTodo();

    mostrarToast(
        "Se marcó que no asistirás. Ahora puedes buscar reemplazo."
    );
}


/* =========================================================
   REEMPLAZO
========================================================= */

function abrirBuscarReemplazo(id) {

    const asignacion =
        buscarAsignacion(id);

    if (!asignacion) {
        return;
    }

    asignacionReemplazoActual = id;

    const servicio =
        buscarServicio(
            asignacion.servicioId
        );

    if (!servicio) {
        return;
    }

    const personasAsignadas =
        estado.asignaciones
            .filter(
                a =>
                    a.servicioId ===
                    asignacion.servicioId &&
                    a.id !== asignacion.id
            )
            .map(
                a => a.personaId
            );

    const candidatos =
        estado.personas.filter(persona => {

            if (
                persona.id ===
                asignacion.personaId
            ) {
                return false;
            }

            if (
                personasAsignadas.includes(
                    persona.id
                )
            ) {
                return false;
            }

            return true;
        });

    abrirModal(
        "Buscar reemplazo",
        `
            <div class="form-grid">

                <div>
                    <span class="eyebrow">
                        PRIVILEGIO
                    </span>

                    <h3>
                        ${iconoFuncion(asignacion.funcion)}
                        ${escapar(asignacion.funcion)}
                    </h3>

                    <p>
                        ⛪ ${escapar(servicio.nombre)}
                        <br>
                        📅 ${escapar(
                            fechaBonita(servicio.fecha)
                        )}
                        <br>
                        🕐 ${escapar(
                            horaBonita(servicio.hora)
                        )}
                    </p>
                </div>

                ${
                    candidatos.length
                    ? `
                        <div class="campo">

                            <label>
                                Selecciona quién te reemplazará
                            </label>

                            <select id="reemplazo-persona">

                                <option value="">
                                    Seleccionar servidor
                                </option>

                                ${
                                    candidatos
                                        .map(
                                            persona => `
                                                <option value="${persona.id}">
                                                    ${escapar(persona.nombre)}
                                                    ${
                                                        persona.areas?.length
                                                        ? " — " +
                                                            escapar(
                                                                persona.areas.join(", ")
                                                            )
                                                        : ""
                                                    }
                                                </option>
                                            `
                                        )
                                        .join("")
                                }

                            </select>

                        </div>

                        <div class="form-actions">

                            <button
                                type="button"
                                class="btn btn-secundario"
                                data-action="cerrar-modal"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                class="btn btn-principal"
                                data-action="guardar-reemplazo"
                            >
                                🔄 Asignar reemplazo
                            </button>

                        </div>
                    `
                    : `
                        <div class="lista-vacia">
                            No hay servidores disponibles
                            para este culto.
                        </div>

                        <div class="form-actions">

                            <button
                                type="button"
                                class="btn btn-secundario"
                                data-action="cerrar-modal"
                            >
                                Cerrar
                            </button>

                        </div>
                    `
                }

            </div>
        `
    );
}


function guardarReemplazo() {

    if (!asignacionReemplazoActual) {
        return;
    }

    const asignacion =
        buscarAsignacion(
            asignacionReemplazoActual
        );

    const select =
        document.getElementById(
            "reemplazo-persona"
        );

    if (!asignacion || !select) {
        return;
    }

    const personaId =
        select.value;

    if (!personaId) {

        mostrarToast(
            "Selecciona un reemplazo."
        );

        return;
    }

    const persona =
        buscarPersona(personaId);

    if (!persona) {
        return;
    }

    /*
       IMPORTANTE:

       La asignación original se conserva
       para saber quién era responsable.

       Además creamos una NUEVA asignación
       para que el reemplazo aparezca
       realmente en Inicio, Privilegios
       y Calendario.
    */

    asignacion.asistencia =
        "no_asistira";

    asignacion.reemplazoEstado =
        "encontrado";

    asignacion.reemplazoPersonaId =
        personaId;


    const yaExiste =
        estado.asignaciones.some(
            a =>
                a.reemplazaAsignacionId ===
                    asignacion.id
        );

    if (!yaExiste) {

        estado.asignaciones.push({

            id: idUnico("asignacion"),

            servicioId:
                asignacion.servicioId,

            personaId,

            funcion:
                asignacion.funcion,

            asistencia:
                "pendiente",

            reemplazoEstado:
                "ninguno",

            reemplazoPersonaId:
                null,

            esReemplazo:
                true,

            reemplazaAsignacionId:
                asignacion.id
        });
    }

    guardarEstado();

    cerrarModal();

    renderizarTodo();

    mostrarToast(
        `${persona.nombre} quedó asignado como reemplazo.`
    );

    asignacionReemplazoActual = null;
}


/* =========================================================
   PERSONAS
========================================================= */

function renderizarPersonas() {

    const contenedor =
        document.getElementById(
            "lista-personas"
        );

    if (!estado.personas.length) {

        contenedor.innerHTML =
            `<div class="lista-vacia">
                No hay personas registradas.
            </div>`;

        return;
    }

    contenedor.innerHTML =
        estado.personas
            .map(persona => `

                <div class="fila">

                    <div class="fila-info">

                        <h3>
                            ${escapar(persona.nombre)}
                        </h3>

                        <p>
                            ${escapar(persona.rol)}
                            ${
                                persona.areas.length
                                ? " · " +
                                  escapar(
                                    persona.areas.join(", ")
                                  )
                                : ""
                            }
                        </p>

                    </div>

                    <div class="fila-actions solo-admin">

                        <button
                            class="btn btn-secundario btn-small"
                            data-action="editar-persona"
                            data-id="${persona.id}"
                        >
                            Editar
                        </button>

                        <button
                            class="btn btn-danger btn-small"
                            data-action="eliminar-persona"
                            data-id="${persona.id}"
                        >
                            Eliminar
                        </button>

                    </div>

                </div>

            `)
            .join("");
}


function abrirFormularioPersona(id = null) {

    const persona =
        id
            ? buscarPersona(id)
            : null;

    abrirModal(
        persona
            ? "Editar persona"
            : "Agregar persona",

        `
            <form
                id="form-persona"
                class="form-grid"
            >

                <input
                    type="hidden"
                    id="persona-id"
                    value="${persona ? persona.id : ""}"
                >

                <div class="campo">

                    <label>
                        Nombre completo
                    </label>

                    <input
                        type="text"
                        id="persona-nombre"
                        value="${persona ? escapar(persona.nombre) : ""}"
                        required
                    >

                </div>

                <div class="campo">

                    <label>
                        Rol
                    </label>

                    <select id="persona-rol">

                        <option
                            value="Servidor"
                            ${
                                persona?.rol === "Servidor"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Servidor
                        </option>

                        <option
                            value="Administrador"
                            ${
                                persona?.rol === "Administrador"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Administrador
                        </option>

                    </select>

                </div>

                <div class="campo">

                    <label>
                        Áreas
                    </label>

                    <div class="lista">

                        ${
                            estado.areas
                                .map(area => {

                                    const nombreArea =
                                        typeof area === "string"
                                            ? area
                                            : area.nombre;

                                    return `

                                        <label
                                            style="
                                                display:flex;
                                                gap:8px;
                                                align-items:center;
                                                margin:0;
                                            "
                                        >

                                            <input
                                                type="checkbox"
                                                name="persona-area"
                                                value="${escapar(nombreArea)}"
                                                ${
                                                    persona?.areas?.includes(nombreArea)
                                                        ? "checked"
                                                        : ""
                                                }
                                            >

                                            <span>
                                                ${iconoFuncion(nombreArea)}
                                                ${escapar(nombreArea)}
                                            </span>

                                        </label>

                                    `;

                                })
                                .join("")
                        }

                    </div>

                </div>

                <div class="form-actions">

                    <button
                        type="button"
                        class="btn btn-secundario"
                        data-action="cerrar-modal"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="btn btn-principal"
                    >
                        Guardar
                    </button>

                </div>

            </form>
        `
    );

    document
        .getElementById("form-persona")
        .addEventListener(
            "submit",
            guardarPersona
        );
}



async function guardarPersona(evento) {

    evento.preventDefault();

    const id =
        document.getElementById(
            "persona-id"
        ).value;

    const nombre =
        document.getElementById(
            "persona-nombre"
        ).value.trim();

    const rol =
        document.getElementById(
            "persona-rol"
        ).value;

    const areasSeleccionadasNombres =
        [...document.querySelectorAll(
            'input[name="persona-area"]:checked'
        )].map(
            input => input.value.trim()
        );

    if (!nombre) {

        mostrarToast(
            "Escribe el nombre."
        );

        return;
    }


    /* =====================================================
       OBTENER ÁREAS DIRECTAMENTE DESDE SUPABASE
    ===================================================== */

    const { data: areasSupabase, error: errorAreasSupabase } =
        await supabaseClient
            .from("areas")
            .select("id, nombre, activo")
            .eq("activo", true);

    if (errorAreasSupabase) {

        console.error(
            "Error obteniendo áreas desde Supabase:",
            errorAreasSupabase
        );

        mostrarToast(
            "No se pudieron cargar las áreas."
        );

        return;
    }


    /* =====================================================
       CONVERTIR NOMBRES SELECCIONADOS A IDs
    ===================================================== */

    const areasSeleccionadas =
        (areasSupabase || []).filter(area =>
            areasSeleccionadasNombres.some(
                nombreArea =>
                    nombreArea.trim() ===
                    area.nombre.trim()
            )
        );


    console.log(
        "Áreas seleccionadas:",
        areasSeleccionadasNombres
    );

    console.log(
        "Áreas encontradas en Supabase:",
        areasSeleccionadas
    );


    /* =====================================================
       EDITAR PERSONA
    ===================================================== */

    if (id) {

        const persona =
            buscarPersona(id);

        if (!persona) {

            mostrarToast(
                "No se encontró la persona."
            );

            return;
        }


        /* =================================================
           ACTUALIZAR PERSONA
        ================================================= */

        const { error } =
            await supabaseClient
                .from("personas")
                .update({
                    nombre: nombre,
                    rol: rol,
                    activo: true
                })
                .eq("id", id);

        if (error) {

            console.error(
                "Error actualizando persona:",
                error
            );

            mostrarToast(
                "No se pudo actualizar la persona."
            );

            return;
        }


        /* =================================================
           ELIMINAR RELACIONES ANTERIORES
        ================================================= */

        const { error: errorEliminarAreas } =
            await supabaseClient
                .from("persona_areas")
                .delete()
                .eq("persona_id", id);

        if (errorEliminarAreas) {

            console.error(
                "Error eliminando áreas anteriores:",
                errorEliminarAreas
            );

            mostrarToast(
                "La persona se actualizó, pero no se pudieron actualizar sus áreas."
            );

            return;
        }


        /* =================================================
           GUARDAR NUEVAS RELACIONES
        ================================================= */

        if (areasSeleccionadas.length > 0) {

            const relaciones =
                areasSeleccionadas.map(area => ({
                    persona_id: id,
                    area_id: area.id
                }));

            const { error: errorInsertAreas } =
                await supabaseClient
                    .from("persona_areas")
                    .insert(relaciones);

            if (errorInsertAreas) {

                console.error(
                    "Error guardando áreas:",
                    errorInsertAreas
                );

                mostrarToast(
                    "La persona se actualizó, pero no se pudieron guardar sus áreas."
                );

                return;
            }
        }


        /* =================================================
           ACTUALIZAR ESTADO LOCAL
        ================================================= */

        persona.nombre = nombre;
        persona.rol = rol;
        persona.areas =
            areasSeleccionadas.map(
                area => area.nombre
            );

    }


    /* =====================================================
       CREAR PERSONA
    ===================================================== */

    else {

        const { data, error } =
            await supabaseClient
                .from("personas")
                .insert({
                    nombre: nombre,
                    rol: rol,
                    activo: true
                })
                .select()
                .single();

        if (error) {

            console.error(
                "Error creando persona:",
                error
            );

            mostrarToast(
                "No se pudo guardar la persona."
            );

            return;
        }


        /* =================================================
           GUARDAR ÁREAS DE LA NUEVA PERSONA
        ================================================= */

        if (areasSeleccionadas.length > 0) {

            const relaciones =
                areasSeleccionadas.map(area => ({
                    persona_id: data.id,
                    area_id: area.id
                }));

            const { error: errorInsertAreas } =
                await supabaseClient
                    .from("persona_areas")
                    .insert(relaciones);

            if (errorInsertAreas) {

                console.error(
                    "Error guardando áreas:",
                    errorInsertAreas
                );

                mostrarToast(
                    "La persona se creó, pero no se pudieron guardar sus áreas."
                );

                return;
            }
        }


        /* =================================================
           ACTUALIZAR ESTADO LOCAL
        ================================================= */

        estado.personas.push({

            id: data.id,

            nombre: data.nombre,

            rol: data.rol,

            areas:
                areasSeleccionadas.map(
                    area => area.nombre
                )
        });
    }


    /* =====================================================
       FINALIZAR
    ================================================= */

    guardarEstado();

    cerrarModal();

    renderizarTodo();

    mostrarToast(
        "Persona guardada correctamente."
    );
}
```


function eliminarPersona(id) {

    const persona =
        buscarPersona(id);

    if (!persona) {
        return;
    }

    if (
        persona.id ===
        "persona-esteban"
    ) {

        mostrarToast(
            "El administrador principal no puede eliminarse."
        );

        return;
    }

    if (
        !confirm(
            `¿Eliminar a ${persona.nombre}?`
        )
    ) {
        return;
    }

    estado.personas =
        estado.personas.filter(
            p => p.id !== id
        );

    estado.usuarios =
        estado.usuarios.filter(
            u => u.personaId !== id
        );

    guardarEstado();

    renderizarTodo();

    mostrarToast(
        "Persona eliminada."
    );
}


/* =========================================================
   ÁREAS
========================================================= */

function renderizarAreas() {

    const contenedor =
        document.getElementById(
            "lista-areas"
        );

    contenedor.innerHTML =
        estado.areas
            .map(area => `

                <div class="card">

                    <div class="card-top">

                        <div>
                            <h3>
                                ${escapar(area.nombre)}
                            </h3>

                            <p>
                                Área de servicio
                            </p>
                        </div>

                        <div class="card-icon">
                            ${iconoFuncion(area.nombre)}
                        </div>

                    </div>

                    <div class="card-actions solo-admin">

                        <button
                            class="btn btn-secundario btn-small"
                            data-action="editar-area"
                            data-id="${area.id}"
                        >
                            Editar
                        </button>

                        <button
                            class="btn btn-danger btn-small"
                            data-action="eliminar-area"
                            data-id="${area.id}"
                        >
                            Eliminar
                        </button>

                    </div>

                </div>

            `)
            .join("");
}


function abrirFormularioArea(id = null) {

    const area =
        id
            ? estado.areas.find(
                a => a.id === id
            )
            : null;

    abrirModal(
        area
            ? "Editar área"
            : "Agregar área",

        `
            <form
                id="form-area"
                class="form-grid"
            >

                <div class="campo">

                    <label>
                        Nombre del área
                    </label>

                    <input
                        id="area-nombre"
                        value="${area ? escapar(area.nombre) : ""}"
                        required
                    >

                </div>

                <div class="form-actions">

                    <button
                        type="button"
                        class="btn btn-secundario"
                        data-action="cerrar-modal"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="btn btn-principal"
                    >
                        Guardar
                    </button>

                </div>

            </form>
        `
    );

    document
        .getElementById("form-area")
        .addEventListener(
            "submit",
            event => {

                event.preventDefault();

                const nombre =
                    document
                        .getElementById(
                            "area-nombre"
                        )
                        .value
                        .trim();

                if (!nombre) {
                    return;
                }

                if (area) {

                    const anterior =
                        area.nombre;

                    area.nombre =
                        nombre;

                    estado.personas.forEach(
                        persona => {

                            persona.areas =
                                persona.areas.map(
                                    a =>
                                        a === anterior
                                            ? nombre
                                            : a
                                );
                        }
                    );

                } else {

                    estado.areas.push({

                        id: idUnico("area"),

                        nombre
                    });
                }

                guardarEstado();

                cerrarModal();

                renderizarTodo();

                mostrarToast(
                    "Área guardada correctamente."
                );
            }
        );
}


function eliminarArea(id) {

    const area =
        estado.areas.find(
            a => a.id === id
        );

    if (!area) {
        return;
    }

    if (
        !confirm(
            `¿Eliminar el área ${area.nombre}?`
        )
    ) {
        return;
    }

    estado.areas =
        estado.areas.filter(
            a => a.id !== id
        );

    estado.personas.forEach(
        persona => {

            persona.areas =
                persona.areas.filter(
                    a =>
                        a !== area.nombre
                );
        }
    );

    guardarEstado();

    renderizarTodo();

    mostrarToast(
        "Área eliminada."
    );
}


/* =========================================================
   CULTOS
========================================================= */

function renderizarServicios() {

    const contenedor =
        document.getElementById(
            "lista-servicios"
        );

    const hoy =
        formatoFechaISO(new Date());

    const servicios =
        estado.servicios
            .filter(
                s => s.fecha >= hoy
            )
            .slice(0, 30);

    if (!servicios.length) {

        contenedor.innerHTML =
            `<div class="lista-vacia">
                No hay cultos próximos.
            </div>`;

        return;
    }

    contenedor.innerHTML =
        servicios.map(servicio => {

            const asignaciones =
                estado.asignaciones.filter(
                    a =>
                        a.servicioId ===
                        servicio.id
                );

            return `

                <div class="fila">

                    <div class="fila-info">

                        <h3>
                            ⛪ ${escapar(servicio.nombre)}
                        </h3>

                        <p>
                            📅 ${escapar(
                                fechaBonita(servicio.fecha)
                            )}
                            ·
                            🕐 ${escapar(
                                horaBonita(servicio.hora)
                            )}
                            ·
                            ${asignaciones.length}
                            privilegio(s)
                        </p>

                    </div>

                    <div class="fila-actions solo-admin">

                        ${
                            servicio.tipo !== "general"
                            ? `
                                <button
                                    class="btn btn-danger btn-small"
                                    data-action="eliminar-servicio"
                                    data-id="${servicio.id}"
                                >
                                    Eliminar
                                </button>
                            `
                            : `
                                <span class="etiqueta">
                                    Culto regular
                                </span>
                            `
                        }

                    </div>

                </div>
            `;

        }).join("");
}


function abrirFormularioServicio() {

    abrirModal(
        "Agregar culto",

        `
            <form
                id="form-servicio"
                class="form-grid"
            >

                <div class="campo">

                    <label>
                        Fecha
                    </label>

                    <input
                        type="date"
                        id="servicio-fecha"
                        required
                    >

                </div>

                <div class="campo">

                    <label>
                        Hora
                    </label>

                    <input
                        type="time"
                        id="servicio-hora"
                        required
                    >

                </div>

                <div class="form-actions">

                    <button
                        type="button"
                        class="btn btn-secundario"
                        data-action="cerrar-modal"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="btn btn-principal"
                    >
                        Crear culto
                    </button>

                </div>

            </form>
        `
    );

    document
        .getElementById("form-servicio")
        .addEventListener(
            "submit",
            event => {

                event.preventDefault();

                const fecha =
                    document
                        .getElementById(
                            "servicio-fecha"
                        )
                        .value;

                const hora =
                    document
                        .getElementById(
                            "servicio-hora"
                        )
                        .value;

                if (!fecha || !hora) {
                    return;
                }

                const clave =
                    `${fecha}-${hora}`;

                if (
                    estado.servicios.some(
                        s =>
                            s.clave === clave
                    )
                ) {

                    mostrarToast(
                        "Ese culto ya existe."
                    );

                    return;
                }

                estado.servicios.push({

                    id: idUnico("culto"),

                    clave,

                    nombre: "Culto",

                    fecha,

                    hora,

                    tipo: "manual",

                    icono: "⛪",

                    descripcion:
                        "Culto de la iglesia"
                });

                estado.servicios.sort(
                    (a, b) =>
                        `${a.fecha} ${a.hora}`
                            .localeCompare(
                                `${b.fecha} ${b.hora}`
                            )
                );

                guardarEstado();

                cerrarModal();

                renderizarTodo();

                mostrarToast(
                    "Culto creado correctamente."
                );
            }
        );
}


function eliminarServicio(id) {

    const servicio =
        buscarServicio(id);

    if (!servicio) {
        return;
    }

    if (
        servicio.tipo === "general"
    ) {

        mostrarToast(
            "Los cultos regulares no se eliminan."
        );

        return;
    }

    if (
        !confirm(
            "¿Eliminar este culto?"
        )
    ) {
        return;
    }

    estado.servicios =
        estado.servicios.filter(
            s => s.id !== id
        );

    estado.asignaciones =
        estado.asignaciones.filter(
            a => a.servicioId !== id
        );

    guardarEstado();

    renderizarTodo();

    mostrarToast(
        "Culto eliminado."
    );
}


/* =========================================================
   ASIGNACIONES
========================================================= */

function renderizarAsignaciones() {

    const contenedor =
        document.getElementById(
            "lista-asignaciones"
        );

    if (!estado.asignaciones.length) {

        contenedor.innerHTML =
            `<div class="lista-vacia">
                No hay asignaciones todavía.
            </div>`;

        return;
    }

    const ordenadas =
        [...estado.asignaciones]
            .sort((a, b) => {

                const sa =
                    buscarServicio(a.servicioId);

                const sb =
                    buscarServicio(b.servicioId);

                if (!sa || !sb) {
                    return 0;
                }

                return `${sa.fecha} ${sa.hora}`
                    .localeCompare(
                        `${sb.fecha} ${sb.hora}`
                    );
            });

    contenedor.innerHTML =
        ordenadas.map(asignacion => {

            const servicio =
                buscarServicio(
                    asignacion.servicioId
                );

            const persona =
                buscarPersona(
                    asignacion.personaId
                );

            if (!servicio || !persona) {
                return "";
            }

            return `

                <div class="fila">

                    <div class="fila-info">

                        <h3>

                            ${
                                iconoFuncion(
                                    asignacion.funcion
                                )
                            }

                            ${escapar(
                                asignacion.funcion
                            )}

                            ${
                                asignacion.esReemplazo
                                    ? " · 🔄 Reemplazo"
                                    : ""
                            }

                        </h3>

                        <p>

                            ⛪ ${escapar(
                                servicio.nombre
                            )}

                            ·

                            📅 ${escapar(
                                fechaBonita(
                                    servicio.fecha
                                )
                            )}

                            ·

                            🕐 ${escapar(
                                horaBonita(
                                    servicio.hora
                                )
                            )}

                            <br>

                            👤 ${escapar(
                                persona.nombre
                            )}

                        </p>

                        ${textoEstado(asignacion)}

                    </div>

                    <div class="fila-actions">

                        ${
                            asignacion.asistencia ===
                                "no_asistira" &&
                            !asignacion.esReemplazo &&
                            asignacion.reemplazoEstado !==
                                "encontrado"

                            ? `
                                <button
                                    class="btn btn-principal btn-small"
                                    data-action="buscar-reemplazo"
                                    data-id="${asignacion.id}"
                                >
                                    🔄 Buscar reemplazo
                                </button>
                            `
                            : ""
                        }

                        ${
                            usuarioActual?.rol ===
                            "Administrador"

                            ? `
                                <button
                                    class="btn btn-danger btn-small"
                                    data-action="eliminar-asignacion"
                                    data-id="${asignacion.id}"
                                >
                                    Eliminar
                                </button>
                            `
                            : ""
                        }

                    </div>

                </div>
            `;

        }).join("");
}


function abrirFormularioAsignacion() {

    const hoy =
        formatoFechaISO(new Date());

    const servicios =
        estado.servicios.filter(
            s => s.fecha >= hoy
        ).slice(0, 40);

    abrirModal(
        "Nueva asignación",

        `
            <form
                id="form-asignacion"
                class="form-grid"
            >

                <div class="campo">

                    <label>
                        Culto
                    </label>

                    <select
                        id="asignacion-servicio"
                        required
                    >

                        <option value="">
                            Seleccionar culto
                        </option>

                        ${
                            servicios.map(
                                servicio => `
                                    <option value="${servicio.id}">
                                        ${escapar(
                                            fechaBonita(
                                                servicio.fecha
                                            )
                                        )}
                                        —
                                        ${escapar(
                                            horaBonita(
                                                servicio.hora
                                            )
                                        )}
                                    </option>
                                `
                            ).join("")
                        }

                    </select>

                </div>


                <div class="campo">

                    <label>
                        Persona
                    </label>

                    <select
                        id="asignacion-persona"
                        required
                    >

                        <option value="">
                            Seleccionar persona
                        </option>

                        ${
                            estado.personas.map(
                                persona => `
                                    <option value="${persona.id}">
                                        ${escapar(
                                            persona.nombre
                                        )}
                                    </option>
                                `
                            ).join("")
                        }

                    </select>

                </div>


                <div class="campo">

                    <label>
                        Área / función
                    </label>

                    <select
                        id="asignacion-funcion"
                        required
                    >

                        <option value="">
                            Seleccionar área
                        </option>

                        ${
                            estado.areas.map(
                                area => `
                                    <option value="${escapar(area.nombre)}">
                                        ${iconoFuncion(area.nombre)}
                                        ${escapar(area.nombre)}
                                    </option>
                                `
                            ).join("")
                        }

                    </select>

                </div>


                <div class="form-actions">

                    <button
                        type="button"
                        class="btn btn-secundario"
                        data-action="cerrar-modal"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="btn btn-principal"
                    >
                        Asignar privilegio
                    </button>

                </div>

            </form>
        `
    );

    document
        .getElementById(
            "form-asignacion"
        )
        .addEventListener(
            "submit",
            guardarAsignacion
        );
}


function guardarAsignacion(evento) {

    evento.preventDefault();

    const servicioId =
        document.getElementById(
            "asignacion-servicio"
        ).value;

    const personaId =
        document.getElementById(
            "asignacion-persona"
        ).value;

    const funcion =
        document.getElementById(
            "asignacion-funcion"
        ).value;

    if (
        !servicioId ||
        !personaId ||
        !funcion
    ) {

        mostrarToast(
            "Completa todos los campos."
        );

        return;
    }

    const yaAsignado =
        estado.asignaciones.some(
            a =>
                a.servicioId === servicioId &&
                a.personaId === personaId
        );

    if (yaAsignado) {

        mostrarToast(
            "Esta persona ya tiene una asignación en ese culto."
        );

        return;
    }

    estado.asignaciones.push({

        id: idUnico("asignacion"),

        servicioId,

        personaId,

        funcion,

        asistencia: "pendiente",

        reemplazoEstado: "ninguno",

        reemplazoPersonaId: null,

        esReemplazo: false,

        reemplazaAsignacionId: null
    });

    guardarEstado();

    cerrarModal();

    renderizarTodo();

    mostrarToast(
        "Privilegio asignado correctamente."
    );
}


function eliminarAsignacion(id) {

    const asignacion =
        buscarAsignacion(id);

    if (!asignacion) {
        return;
    }

    if (
        !confirm(
            "¿Eliminar esta asignación?"
        )
    ) {
        return;
    }

    estado.asignaciones =
        estado.asignaciones.filter(
            a => a.id !== id
        );

    /*
       Si era una asignación original,
       también eliminamos su reemplazo.
    */

    estado.asignaciones =
        estado.asignaciones.filter(
            a =>
                a.reemplazaAsignacionId !== id
        );

    guardarEstado();

    renderizarTodo();

    mostrarToast(
        "Asignación eliminada."
    );
}


/* =========================================================
   PRIVILEGIOS
========================================================= */

function renderizarPrivilegios() {

    const contenedor =
        document.getElementById(
            "lista-privilegios"
        );

    const hoy =
        formatoFechaISO(new Date());

    let asignaciones =
        estado.asignaciones
            .filter(
                a => {

                    const servicio =
                        buscarServicio(
                            a.servicioId
                        );

                    return (
                        servicio &&
                        servicio.fecha >= hoy
                    );
                }
            );

    if (
        usuarioActual.rol !==
        "Administrador"
    ) {

        asignaciones =
            asignaciones.filter(
                a =>
                    a.personaId ===
                    usuarioActual.personaId
            );
    }

    if (!asignaciones.length) {

        contenedor.innerHTML =
            `<div class="lista-vacia">
                No hay privilegios próximos.
            </div>`;

        return;
    }

    asignaciones.sort(
        (a, b) => {

            const sa =
                buscarServicio(a.servicioId);

            const sb =
                buscarServicio(b.servicioId);

            return `${sa.fecha} ${sa.hora}`
                .localeCompare(
                    `${sb.fecha} ${sb.hora}`
                );
        }
    );

    contenedor.innerHTML =
        asignaciones
            .map(asignacion => {

                const servicio =
                    buscarServicio(
                        asignacion.servicioId
                    );

                const persona =
                    buscarPersona(
                        asignacion.personaId
                    );

                return `

                    <div class="card privilegio-card">

                        <div class="card-top">

                            <div>

                                <div class="privilegio-culto">
                                    ⛪ ${escapar(
                                        servicio.nombre
                                    )}
                                </div>

                                <h3>
                                    ${iconoFuncion(
                                        asignacion.funcion
                                    )}
                                    ${escapar(
                                        asignacion.funcion
                                    )}
                                </h3>

                            </div>

                            <div class="card-icon">
                                ${
                                    asignacion.esReemplazo
                                        ? "🔄"
                                        : "⭐"
                                }
                            </div>

                        </div>

                        <div class="privilegio-fecha">

                            <span class="etiqueta">
                                📅 ${escapar(
                                    fechaBonita(
                                        servicio.fecha
                                    )
                                )}
                            </span>

                            <span class="etiqueta">
                                🕐 ${escapar(
                                    horaBonita(
                                        servicio.hora
                                    )
                                )}
                            </span>

                            <span class="etiqueta">
                                👤 ${escapar(
                                    persona?.nombre ||
                                    "Sin persona"
                                )}
                            </span>

                        </div>

                        ${textoEstado(asignacion)}

                    </div>

                `;
            })
            .join("");
}


/* =========================================================
   CALENDARIO
========================================================= */

function renderizarCalendario() {

    const contenedor =
        document.getElementById(
            "calendario"
        );

    const año =
        fechaCalendario.getFullYear();

    const mes =
        fechaCalendario.getMonth();

    document.getElementById(
        "calendario-mes"
    ).textContent =
        `${MESES[mes]} ${año}`;

    let html = "";

    const nombresDias = [
        "Dom",
        "Lun",
        "Mar",
        "Mié",
        "Jue",
        "Vie",
        "Sáb"
    ];

    nombresDias.forEach(
        dia => {

            html += `
                <div class="dia-semana">
                    ${dia}
                </div>
            `;
        }
    );

    const primerDia =
        new Date(
            año,
            mes,
            1
        ).getDay();

    const cantidadDias =
        new Date(
            año,
            mes + 1,
            0
        ).getDate();

    for (
        let i = 0;
        i < primerDia;
        i++
    ) {

        html += `
            <div class="dia dia-vacio"></div>
        `;
    }

    for (
        let dia = 1;
        dia <= cantidadDias;
        dia++
    ) {

        const fecha =
            new Date(
                año,
                mes,
                dia
            );

        const fechaISO =
            formatoFechaISO(fecha);

        const hoy =
            formatoFechaISO(
                new Date()
            );

        const servicios =
            estado.servicios.filter(
                servicio =>
                    servicio.fecha ===
                    fechaISO
            );

        html += `

            <div class="dia ${
                fechaISO === hoy
                    ? "dia-hoy"
                    : ""
            }">

                <div class="dia-numero">
                    ${dia}
                </div>

                ${
                    servicios.map(
                        servicio =>
                            renderEventoCalendario(
                                servicio
                            )
                    ).join("")
                }

            </div>

        `;
    }

    contenedor.innerHTML = html;
}


function renderEventoCalendario(servicio) {

    const asignaciones =
        estado.asignaciones.filter(
            a =>
                a.servicioId ===
                servicio.id
        );

    return `

        <div class="evento-calendario">

            <div class="evento-titulo">
                ⛪ ${escapar(
                    servicio.nombre
                )}
            </div>

            <div class="evento-hora">
                🕐 ${escapar(
                    horaBonita(
                        servicio.hora
                    )
                )}
            </div>

            ${
                asignaciones.length
                    ? asignaciones
                        .map(
                            asignacion =>
                                renderAsignacionCalendario(
                                    asignacion
                                )
                        )
                        .join("")
                    : `
                        <div class="evento-asignacion pendiente">
                            Sin privilegios asignados
                        </div>
                    `
            }

        </div>

    `;
}


function renderAsignacionCalendario(
    asignacion
) {

    const persona =
        buscarPersona(
            asignacion.personaId
        );

    if (!persona) {
        return "";
    }

    let clase =
        "pendiente";

    if (
        asignacion.asistencia ===
        "confirmado"
    ) {
        clase = "confirmado";
    }

    if (
        asignacion.asistencia ===
        "no_asistira"
    ) {
        clase = "no-asistira";
    }

    return `

        <div class="evento-asignacion ${clase}">

            ${
                iconoFuncion(
                    asignacion.funcion
                )
            }

            <strong>
                ${escapar(
                    asignacion.funcion
                )}
            </strong>

            —

            ${escapar(
                persona.nombre
            )}

            ${
                asignacion.esReemplazo
                    ? " 🔄"
                    : ""
            }

            <br>

            ${
                asignacion.asistencia ===
                "confirmado"

                ? "✔️ Confirmado"

                : asignacion.asistencia ===
                    "no_asistira"

                    ? `
                        ❌ No asistirá

                        ${
                            asignacion.reemplazaAsignacionId
                                ? " · 🔄 Reemplazo"
                                : ""
                        }
                    `

                    : "⏳ Pendiente"
            }

        </div>

    `;
}


/* =========================================================
   CAMBIO DE MES
========================================================= */

function mesAnterior() {

    fechaCalendario.setMonth(
        fechaCalendario.getMonth() - 1
    );

    renderizarCalendario();
}


function mesSiguiente() {

    fechaCalendario.setMonth(
        fechaCalendario.getMonth() + 1
    );

    renderizarCalendario();
}


/* =========================================================
   PUBLICACIÓN
========================================================= */

function renderizarPublicacion() {

    const contenedor =
        document.getElementById(
            "estado-publicacion"
        );

    if (
        estado.publicaciones.publicado
    ) {

        contenedor.innerHTML = `

            <div class="card">

                <h3>
                    📢 Calendario publicado
                </h3>

                <p>
                    Última publicación:
                    ${escapar(
                        new Date(
                            estado.publicaciones.fecha
                        ).toLocaleString(
                            "es-GT"
                        )
                    )}
                </p>

            </div>

        `;

    } else {

        contenedor.innerHTML = `

            <div class="card">

                <h3>
                    📋 Calendario pendiente de publicación
                </h3>

                <p>
                    Todavía no se ha publicado.
                </p>

            </div>

        `;
    }
}


function publicarCalendario() {

    estado.publicaciones = {

        publicado: true,

        fecha: new Date().toISOString()
    };

    guardarEstado();

    renderizarTodo();

    mostrarToast(
        "Calendario publicado correctamente."
    );
}


/* =========================================================
   PERFIL
========================================================= */

function renderizarPerfil() {

    const persona =
        buscarPersona(
            usuarioActual.personaId
        );

    const contenedor =
        document.getElementById(
            "perfil-contenido"
        );

    contenedor.innerHTML = `

        <div class="card">

            <div class="card-top">

                <div>

                    <span class="eyebrow">
                        CUENTA
                    </span>

                    <h2>
                        ${escapar(
                            usuarioActual.nombre
                        )}
                    </h2>

                    <p>
                        @${escapar(
                            usuarioActual.username
                        )}
                    </p>

                </div>

                <div class="card-icon">
                    ⚙️
                </div>

            </div>

            <p>
                <strong>Rol:</strong>
                ${escapar(
                    usuarioActual.rol
                )}
            </p>

            <br>

            <p>
                <strong>Áreas:</strong>
                ${
                    persona?.areas?.length
                        ? escapar(
                            persona.areas.join(", ")
                        )
                        : "Sin áreas"
                }
            </p>

        </div>

    `;
}


/* =========================================================
   CUENTAS
========================================================= */

function renderizarCuentas() {

    const contenedor =
        document.getElementById(
            "lista-cuentas"
        );

    if (
        usuarioActual?.rol !==
        "Administrador"
    ) {
        return;
    }

    const pendientes =
        estado.usuarios.filter(
            u =>
                u.activo === false &&
                u.pendiente === true
        );

    if (!pendientes.length) {

        contenedor.innerHTML =
            `<div class="lista-vacia">
                No hay solicitudes pendientes.
            </div>`;

        return;
    }

    contenedor.innerHTML =
        pendientes.map(usuario => `

            <div class="fila">

                <div class="fila-info">

                    <h3>
                        ${escapar(usuario.nombre)}
                    </h3>

                    <p>
                        @${escapar(
                            usuario.username
                        )}
                    </p>

                </div>

                <div class="fila-actions">

                    <button
                        class="btn btn-success btn-small"
                        data-action="aprobar-cuenta"
                        data-id="${usuario.id}"
                    >
                        ✔️ Aprobar
                    </button>

                    <button
                        class="btn btn-danger btn-small"
                        data-action="rechazar-cuenta"
                        data-id="${usuario.id}"
                    >
                        Rechazar
                    </button>

                </div>

            </div>

        `).join("");
}


function aprobarCuenta(id) {

    const usuario =
        estado.usuarios.find(
            u => u.id === id
        );

    if (!usuario) {
        return;
    }

    let persona =
        estado.personas.find(
            p =>
                p.id ===
                usuario.personaId
        );

    if (!persona) {

        persona = {

            id:
                usuario.personaId ||
                idUnico("persona"),

            nombre:
                usuario.nombre,

            rol:
                "Servidor",

            areas: []
        };

        usuario.personaId =
            persona.id;

        estado.personas.push(
            persona
        );
    }

    usuario.activo = true;

    usuario.pendiente = false;

    guardarEstado();

    renderizarTodo();

    mostrarToast(
        "Cuenta aprobada."
    );
}


function rechazarCuenta(id) {

    estado.usuarios =
        estado.usuarios.filter(
            u => u.id !== id
        );

    guardarEstado();

    renderizarTodo();

    mostrarToast(
        "Solicitud rechazada."
    );
}


/* =========================================================
   REGISTRO
========================================================= */

function registrarCuenta(evento) {

    evento.preventDefault();

    const nombre =
        document.getElementById(
            "registro-nombre"
        ).value.trim();

    const username =
        document.getElementById(
            "registro-usuario"
        ).value.trim();

    const password =
        document.getElementById(
            "registro-password"
        ).value;

    if (
        !nombre ||
        !username ||
        !password
    ) {
        return;
    }

    const existe =
        estado.usuarios.some(
            u =>
                u.username.toLowerCase() ===
                username.toLowerCase()
        );

    if (existe) {

        document.getElementById(
            "registro-mensaje"
        ).textContent =
            "Ese usuario ya existe.";

        return;
    }

    const personaId =
        idUnico("persona");

    const usuarioId =
        idUnico("usuario");

    estado.personas.push({

        id: personaId,

        nombre,

        rol: "Servidor",

        areas: []
    });

    estado.usuarios.push({

        id: usuarioId,

        nombre,

        username,

        password,

        rol: "Servidor",

        personaId,

        activo: false,

        pendiente: true
    });

    guardarEstado();

    document.getElementById(
        "registro-mensaje"
    ).textContent =
        "Solicitud enviada. Espera aprobación del administrador.";

    document
        .getElementById(
            "form-registro"
        )
        .reset();
}


/* =========================================================
   MODAL
========================================================= */

function abrirModal(
    titulo,
    contenido
) {

    document.getElementById(
        "modal-titulo"
    ).textContent = titulo;

    document.getElementById(
        "modal-cuerpo"
    ).innerHTML = contenido;

    document.getElementById(
        "modal"
    ).classList.remove(
        "oculta"
    );
}


function cerrarModal() {

    document.getElementById(
        "modal"
    ).classList.add(
        "oculta"
    );

    document.getElementById(
        "modal-cuerpo"
    ).innerHTML = "";

    asignacionReemplazoActual = null;
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function mostrarToast(mensaje) {

    const toast =
        document.getElementById(
            "toast"
        );

    toast.textContent =
        mensaje;

    toast.classList.add(
        "visible"
    );

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "visible"
                );

            },
            3000
        );
}


/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {


    /* LOGIN */

    document
        .getElementById(
            "form-login"
        )
        .addEventListener(
            "submit",
            evento => {

                evento.preventDefault();

                const usuario =
                    document.getElementById(
                        "login-usuario"
                    ).value.trim();

                const password =
                    document.getElementById(
                        "login-password"
                    ).value;

                iniciarSesion(
                    usuario,
                    password
                );
            }
        );


    /* REGISTRO */

    document
        .getElementById(
            "form-registro"
        )
        .addEventListener(
            "submit",
            registrarCuenta
        );


    /*
       NAVEGACIÓN
    */

    document
        .querySelectorAll(
            ".nav-btn"
        )
        .forEach(
            boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        navegar(
                            boton.dataset.section
                        );
                    }
                );

            }
        );


    /*
       TODOS LOS BOTONES CON DATA-ACTION
    */

    document.addEventListener(
        "click",
        manejarAccion
    );


    /*
       TECLA ESC
    */

    document.addEventListener(
        "keydown",
        evento => {

            if (
                evento.key === "Escape"
            ) {

                cerrarModal();
            }
        }
    );
}


/* =========================================================
   CONTROL CENTRAL DE BOTONES
========================================================= */

function manejarAccion(evento) {

    const boton =
        evento.target.closest(
            "[data-action]"
        );

    if (!boton) {
        return;
    }

    const accion =
        boton.dataset.action;

    const id =
        boton.dataset.id;


    switch (accion) {


        case "mostrar-registro":

            document
                .getElementById(
                    "pantalla-login"
                )
                .classList.add(
                    "oculta"
                );

            document
                .getElementById(
                    "pantalla-registro"
                )
                .classList.remove(
                    "oculta"
                );

            break;


        case "mostrar-login":

            document
                .getElementById(
                    "pantalla-registro"
                )
                .classList.add(
                    "oculta"
                );

            document
                .getElementById(
                    "pantalla-login"
                )
                .classList.remove(
                    "oculta"
                );

            break;


        case "cerrar-sesion":

            cerrarSesion();

            break;


        case "toggle-sidebar":

            document
                .getElementById(
                    "sidebar"
                )
                .classList.toggle(
                    "abierta"
                );

            break;


        case "cerrar-modal":

            cerrarModal();

            break;


        case "agregar-persona":

            if (
                usuarioActual?.rol ===
                "Administrador"
            ) {
                abrirFormularioPersona();
            }

            break;


        case "editar-persona":

            if (
                usuarioActual?.rol ===
                "Administrador"
            ) {
                abrirFormularioPersona(id);
            }

            break;


        case "eliminar-persona":

            if (
                usuarioActual?.rol ===
                "Administrador"
            ) {
                eliminarPersona(id);
            }

            break;


        case "agregar-area":

            if (
                usuarioActual?.rol ===
                "Administrador"
            ) {
                abrirFormularioArea();
            }

            break;


        case "editar-area":

            if (
                usuarioActual?.rol ===
                "Administrador"
            ) {
                abrirFormularioArea(id);
            }

            break;


        case "eliminar-area":

            if (
                usuarioActual?.rol ===
                "Administrador"
            ) {
                eliminarArea(id);
            }

            break;


        case "agregar-servicio":

            if (
                usuarioActual?.rol ===
                "Administrador"
            ) {
                abrirFormularioServicio();
            }

            break;


        case "eliminar-servicio":

            if (
                usuarioActual?.rol ===
                "Administrador"
            ) {
                eliminarServicio(id);
            }

            break;


        case "agregar-asignacion":

            if (
                usuarioActual?.rol ===
                "Administrador"
            ) {
                abrirFormularioAsignacion();
            }

            break;


        case "eliminar-asignacion":

            if (
                usuarioActual?.rol ===
                "Administrador"
            ) {
                eliminarAsignacion(id);
            }

            break;


        case "confirmar-asistencia":

            confirmarAsistencia(id);

            break;


        case "no-asistir":

            noAsistir(id);

            break;


        case "buscar-reemplazo":

            abrirBuscarReemplazo(id);

            break;


        case "guardar-reemplazo":

            guardarReemplazo();

            break;


        case "mes-anterior":

            mesAnterior();

            break;


        case "mes-siguiente":

            mesSiguiente();

            break;


        case "publicar-calendario":

            if (
                usuarioActual?.rol ===
                "Administrador"
            ) {
                publicarCalendario();
            }

            break;


        case "aprobar-cuenta":

            if (
                usuarioActual?.rol ===
                "Administrador"
            ) {
                aprobarCuenta(id);
            }

            break;


        case "rechazar-cuenta":

            if (
                usuarioActual?.rol ===
                "Administrador"
            ) {
                rechazarCuenta(id);
            }

            break;

    }
}


/* =========================================================
   RESUMEN
========================================================= */

function actualizarResumen() {

    document.getElementById(
        "resumen-personas"
    ).textContent =
        estado.personas.length;

    document.getElementById(
        "resumen-areas"
    ).textContent =
        estado.areas.length;

    const hoy =
        formatoFechaISO(new Date());

    document.getElementById(
        "resumen-servicios"
    ).textContent =
        estado.servicios.filter(
            s => s.fecha >= hoy
        ).length;

    document.getElementById(
        "resumen-asignaciones"
    ).textContent =
        estado.asignaciones.length;
}


/* =========================================================
   INICIALIZACIÓN
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        cargarEstado();

        configurarEventos();

        recuperarSesion();

        await cargarAreasDesdeSupabase();

    }
);
