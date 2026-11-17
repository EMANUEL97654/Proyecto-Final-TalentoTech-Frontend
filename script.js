const LIMITE_LIBROS = 25;

const API_URL = "https://openlibrary.org/search.json?" + new URLSearchParams({
    q: 'subject:"science fiction"',
    language: "spa",
    limit: 50,
    fields: "key,title,author_name,cover_i,edition_count,editions",
});

const CLAVE_CARRITO = "carritoNebula";
const TIEMPO_MAXIMO_API = 10000; // 10 segundos

const formatoPrecio = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

let carrito = cargarCarrito();
let elementoAntesDelPanel = null; 

document.addEventListener("DOMContentLoaded", () => {
    obtenerCatalogo();
    renderizarCarrito();
    configurarEventos();
});


async function obtenerCatalogo() {
    const estado = document.getElementById("estado-catalogo");

    try {
        const respuesta = await fetch(API_URL, { signal: AbortSignal.timeout(TIEMPO_MAXIMO_API) });

        if (!respuesta.ok) {
            throw new Error(`Error de servidor: ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        const libros = (datos.docs ?? [])
            .map((libro) => {
                // Edición en español (si la API la devuelve), para mostrar el título y la portada en español
                const edicion = libro.editions?.docs?.[0];
                return {
                    key: libro.key,
                    titulo: edicion?.title ?? libro.title,
                    autor: libro.author_name?.[0] ?? "Autor desconocido",
                    portada: edicion?.cover_i ?? libro.cover_i,
                    ediciones: libro.edition_count ?? 0,
                };
            })
            .filter((libro) => libro.portada && libro.key && libro.titulo)
            .slice(0, LIMITE_LIBROS)
            .map((libro) => ({
                id: "ol-" + libro.key.split("/").pop(),
                titulo: libro.titulo,
                autor: libro.autor,
                imagen: `https://covers.openlibrary.org/b/id/${libro.portada}-M.jpg`,
                precio: calcularPrecio(libro.ediciones),
            }));

        if (libros.length === 0) {
            estado.textContent = "Por ahora no hay libros disponibles. Volvé a intentar más tarde.";
            return;
        }

        renderizarCatalogo(libros);
        estado.textContent = "";
    } catch (error) {
        console.error("Error al obtener productos:", error);
        estado.textContent = "Hubo un problema al cargar el catálogo. Por favor, intentá más tarde.";
    }
}

function calcularPrecio(ediciones) {
    return 80 + (ediciones % 8) * 10;
}

function renderizarCatalogo(libros) {
    document.getElementById("catalogo").innerHTML = libros.map((libro) => {
        const titulo = escaparHTML(libro.titulo);
        const imagen = escaparHTML(libro.imagen);

        return `
            <article class="producto">
                <img src="${imagen}" alt="Portada del libro ${titulo}" loading="lazy" width="180" height="270">
                <h3>${titulo}</h3>
                <p class="autor">${escaparHTML(libro.autor)}</p>
                <p class="precio">${formatearPrecio(libro.precio)}</p>
                <button type="button" class="boton agregar-carrito"
                    data-id="${escaparHTML(libro.id)}"
                    data-titulo="${titulo}"
                    data-precio="${libro.precio}"
                    data-imagen="${imagen}">
                    <svg class="icono" aria-hidden="true"><use href="#i-carrito"></use></svg> Agregar al carrito
                </button>
            </article>
        `;
    }).join("");
}


/* ---------- EVENTOS ---------- */

function configurarEventos() {
    document.getElementById("productos").addEventListener("click", (evento) => {
        const boton = evento.target.closest(".agregar-carrito");
        if (!boton) return;

        agregarAlCarrito({
            id: boton.dataset.id,
            titulo: boton.dataset.titulo,
            precio: Number(boton.dataset.precio),
            imagen: boton.dataset.imagen,
        });
    });

    document.getElementById("lista-carrito").addEventListener("click", (evento) => {
        const boton = evento.target.closest("button[data-accion]");
        if (!boton) return;

        const id = boton.dataset.id;
        const accion = boton.dataset.accion;

        if (accion === "sumar") cambiarCantidad(id, 1);
        if (accion === "restar") cambiarCantidad(id, -1);
        if (accion === "eliminar") eliminarDelCarrito(id);
    });

    const panel = document.getElementById("carrito");
    document.getElementById("abrir-carrito").addEventListener("click", abrirCarrito);
    document.getElementById("cerrar-carrito").addEventListener("click", cerrarCarrito);
    document.getElementById("seguir-comprando").addEventListener("click", cerrarCarrito);

    panel.addEventListener("cancel", (evento) => {
        evento.preventDefault();
        cerrarCarrito();
    });

    panel.addEventListener("click", (evento) => {
        if (evento.target === panel) cerrarCarrito();
    });

    document.getElementById("vaciar-carrito").addEventListener("click", vaciarCarrito);
    document.getElementById("finalizar-compra").addEventListener("click", mostrarResumen);
    document.getElementById("volver-carrito").addEventListener("click", () => mostrarVista("lista"));
    document.getElementById("confirmar-compra").addEventListener("click", confirmarCompra);

    const botonMenu = document.getElementById("boton-menu");
    const menu = document.getElementById("menu-principal");

    botonMenu.addEventListener("click", () => {
        const abierto = menu.classList.toggle("abierto");
        botonMenu.setAttribute("aria-expanded", abierto);
        botonMenu.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
    });

    menu.addEventListener("click", (evento) => {
        if (evento.target.closest("a")) cerrarMenu();
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && menu.classList.contains("abierto")) {
            cerrarMenu();
            botonMenu.focus();
        }
    });

    document.getElementById("form-contacto").addEventListener("submit", enviarFormulario);
}

function cerrarMenu() {
    const botonMenu = document.getElementById("boton-menu");
    document.getElementById("menu-principal").classList.remove("abierto");
    botonMenu.setAttribute("aria-expanded", "false");
    botonMenu.setAttribute("aria-label", "Abrir menú");
}


function abrirCarrito() {
    const panel = document.getElementById("carrito");
    if (panel.open) return;

    elementoAntesDelPanel = document.activeElement;
    mostrarVista("lista");
    cerrarMenu();

    panel.showModal();
    document.body.classList.add("sin-scroll");

    void panel.offsetWidth;
    panel.classList.add("abierto");
}

function cerrarCarrito() {
    const panel = document.getElementById("carrito");
    if (!panel.open || !panel.classList.contains("abierto")) return;

    panel.classList.remove("abierto");

    const contenido = panel.querySelector(".panel-contenido");
    let terminado = false;

    const terminar = () => {
        if (terminado) return;
        terminado = true;
        panel.close();
        document.body.classList.remove("sin-scroll");
        elementoAntesDelPanel?.focus();
    };

    contenido.addEventListener("transitionend", terminar, { once: true });
    setTimeout(terminar, 400); // por si la transición no se dispara (animaciones reducidas)
}

function mostrarVista(nombre) {
    document.getElementById("vista-lista").hidden = nombre !== "lista";
    document.getElementById("vista-resumen").hidden = nombre !== "resumen";
    document.getElementById("vista-gracias").hidden = nombre !== "gracias";
}

function mostrarResumen() {
    if (carrito.length === 0) return;

    document.getElementById("lista-resumen").innerHTML = carrito.map((item) => `
        <li>
            <span>${item.cantidad} × ${escaparHTML(item.titulo)}</span>
            <span>${formatearPrecio(item.precio * item.cantidad)}</span>
        </li>
    `).join("");

    document.getElementById("total-resumen").textContent = formatearPrecio(calcularTotal());
    mostrarVista("resumen");
    document.getElementById("confirmar-compra").focus();
}

function confirmarCompra() {
    if (carrito.length === 0) return;

    const total = calcularTotal();
    const cantidad = contarProductos();

    carrito = [];
    actualizarCarrito();

    document.getElementById("texto-gracias").textContent =
        `Compraste ${cantidad} ${cantidad === 1 ? "libro" : "libros"} por un total de ${formatearPrecio(total)}.`;
    mostrarVista("gracias");
    document.getElementById("seguir-comprando").focus();
}


function cargarCarrito() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_CARRITO));
        if (!Array.isArray(datos)) return [];

        return datos.filter((item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.titulo === "string" &&
            typeof item.imagen === "string" &&
            Number.isFinite(item.precio) &&
            Number.isInteger(item.cantidad) &&
            item.cantidad > 0
        );
    } catch {
        return [];
    }
}

function guardarCarrito() {
    try {
        localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    } catch (error) {
        console.warn("No se pudo guardar el carrito:", error);
    }
}

function agregarAlCarrito(producto) {
    const existente = carrito.find((item) => item.id === producto.id);

    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }

    actualizarCarrito();
    animarContador();
    mostrarMensaje(`Agregaste "${producto.titulo}" al carrito`);
}

function cambiarCantidad(id, cambio) {
    const item = carrito.find((producto) => producto.id === id);
    if (!item) return;

    item.cantidad += cambio;

    if (item.cantidad <= 0) {
        eliminarDelCarrito(id);
        return;
    }

    actualizarCarrito();
    enfocarBoton(id, cambio > 0 ? "sumar" : "restar");
}

function eliminarDelCarrito(id) {
    const item = carrito.find((producto) => producto.id === id);
    carrito = carrito.filter((producto) => producto.id !== id);
    actualizarCarrito();

    if (item) mostrarMensaje(`Quitaste "${item.titulo}" del carrito`);

    const siguiente = document.querySelector("#lista-carrito button")
        ?? document.getElementById("cerrar-carrito");
    siguiente.focus();
}

function vaciarCarrito() {
    if (carrito.length === 0) return;
    if (!confirm("¿Querés vaciar el carrito?")) return;

    carrito = [];
    actualizarCarrito();
    mostrarMensaje("Vaciaste el carrito");
    document.getElementById("cerrar-carrito").focus();
}

function actualizarCarrito() {
    guardarCarrito();
    renderizarCarrito();
}

function renderizarCarrito() {
    const lista = document.getElementById("lista-carrito");

    if (carrito.length === 0) {
        lista.innerHTML = `<li class="carrito-vacio">Tu carrito está vacío.</li>`;
    } else {
        lista.innerHTML = carrito.map((item) => {
            const titulo = escaparHTML(item.titulo);
            const id = escaparHTML(item.id);

            return `
                <li class="item-carrito">
                    <img src="${escaparHTML(item.imagen)}" alt="" width="60" height="90">
                    <div class="item-info">
                        <h3>${titulo}</h3>
                        <p>${formatearPrecio(item.precio)} c/u</p>
                    </div>
                    <div class="item-cantidad">
                        <button type="button" data-accion="restar" data-id="${id}" aria-label="Restar una unidad de ${titulo}">
                            <svg class="icono" aria-hidden="true"><use href="#i-menos"></use></svg>
                        </button>
                        <span aria-label="Cantidad">${item.cantidad}</span>
                        <button type="button" data-accion="sumar" data-id="${id}" aria-label="Sumar una unidad de ${titulo}">
                            <svg class="icono" aria-hidden="true"><use href="#i-mas"></use></svg>
                        </button>
                    </div>
                    <p class="item-subtotal">${formatearPrecio(item.precio * item.cantidad)}</p>
                    <button type="button" class="item-eliminar" data-accion="eliminar" data-id="${id}" aria-label="Eliminar ${titulo} del carrito">
                        <svg class="icono" aria-hidden="true"><use href="#i-basura"></use></svg>
                    </button>
                </li>
            `;
        }).join("");
    }

    const cantidadTotal = contarProductos();
    const contador = document.getElementById("contador-carrito");
    contador.textContent = cantidadTotal;
    contador.dataset.cantidad = cantidadTotal;

    document.getElementById("total-carrito").textContent = formatearPrecio(calcularTotal());
    document.getElementById("vaciar-carrito").disabled = carrito.length === 0;
    document.getElementById("finalizar-compra").disabled = carrito.length === 0;
}

function enfocarBoton(id, accion) {
    const botones = document.querySelectorAll(`#lista-carrito button[data-accion="${accion}"]`);
    [...botones].find((boton) => boton.dataset.id === id)?.focus();
}

function animarContador() {
    const contador = document.getElementById("contador-carrito");
    contador.classList.remove("rebote");
    void contador.offsetWidth; 
    contador.classList.add("rebote");
}

function calcularTotal() {
    return carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
}

function contarProductos() {
    return carrito.reduce((suma, item) => suma + item.cantidad, 0);
}


async function enviarFormulario(evento) {
    evento.preventDefault();

    const formulario = evento.target;
    const estado = document.getElementById("estado-formulario");
    const botonEnviar = formulario.querySelector("button[type='submit']");

    if (!validarFormulario()) {
        estado.textContent = "Revisá los campos marcados.";
        estado.className = "estado-formulario error";
        formulario.querySelector("[aria-invalid='true']")?.focus();
        return;
    }

    estado.textContent = "Enviando…";
    estado.className = "estado-formulario";
    botonEnviar.disabled = true;

    try {
        const respuesta = await fetch(formulario.action, {
            method: "POST",
            body: new FormData(formulario),
            headers: { Accept: "application/json" },
        });

        if (!respuesta.ok) {
            throw new Error(`Error de servidor: ${respuesta.status}`);
        }

        formulario.reset();
        estado.textContent = "¡Gracias! Recibimos tu mensaje y te vamos a responder pronto.";
        estado.className = "estado-formulario exito";
    } catch (error) {
        console.error("Error al enviar el formulario:", error);
        estado.textContent = "No pudimos enviar tu mensaje. Intentá de nuevo más tarde.";
        estado.className = "estado-formulario error";
    } finally {
        botonEnviar.disabled = false;
    }
}

function validarFormulario() {
    const nombre = document.getElementById("nombre");
    const email = document.getElementById("email");
    const mensaje = document.getElementById("mensaje");
    const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let valido = true;

    if (nombre.value.trim().length < 2) {
        marcarError(nombre, "error-nombre", "Ingresá tu nombre (mínimo 2 letras).");
        valido = false;
    } else {
        limpiarError(nombre, "error-nombre");
    }

    if (email.value.trim() === "") {
        marcarError(email, "error-email", "Ingresá tu email.");
        valido = false;
    } else if (!formatoEmail.test(email.value.trim())) {
        marcarError(email, "error-email", "El email no tiene un formato válido (ej: nombre@mail.com).");
        valido = false;
    } else {
        limpiarError(email, "error-email");
    }

    if (mensaje.value.trim().length < 10) {
        marcarError(mensaje, "error-mensaje", "El mensaje debe tener al menos 10 caracteres.");
        valido = false;
    } else {
        limpiarError(mensaje, "error-mensaje");
    }

    return valido;
}

function marcarError(campo, idError, texto) {
    campo.setAttribute("aria-invalid", "true");
    document.getElementById(idError).textContent = texto;
}

function limpiarError(campo, idError) {
    campo.removeAttribute("aria-invalid");
    document.getElementById(idError).textContent = "";
}



let temporizadorMensaje;

function mostrarMensaje(texto) {
    if (document.getElementById("carrito").open) {
        document.getElementById("aviso-carrito").textContent = texto;
        return;
    }

    const mensaje = document.getElementById("mensaje-usuario");
    mensaje.textContent = texto;
    mensaje.classList.add("visible");

    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(() => {
        mensaje.classList.remove("visible");
    }, 3000);
}

function formatearPrecio(valor) {
    return formatoPrecio.format(valor);
}

function escaparHTML(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}