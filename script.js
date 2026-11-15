// API REST de Open Library: libros del género ciencia ficción
const API_URL = "https://openlibrary.org/subjects/science_fiction.json?limit=20";
const CLAVE_CARRITO = "carritoNebula";

let carrito = JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || [];

document.addEventListener("DOMContentLoaded", () => {
    obtenerCatalogo();
    renderizarCarrito();
    configurarEventos();
});


async function obtenerCatalogo() {
    const estado = document.getElementById("estado-catalogo");

    try {
        const respuesta = await fetch(API_URL);

        if (!respuesta.ok) {
            throw new Error(`Error de servidor: ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        const libros = datos.works
            .filter((libro) => libro.cover_id)
            .map((libro) => ({
                id: "ol-" + libro.key.split("/").pop(),
                titulo: libro.title,
                autor: libro.authors.length > 0 ? libro.authors[0].name : "Autor desconocido",
                imagen: `https://covers.openlibrary.org/b/id/${libro.cover_id}-M.jpg`,
                precio: calcularPrecio(libro.edition_count),
            }));

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
    const contenedor = document.getElementById("catalogo");
    contenedor.innerHTML = "";

    libros.forEach((libro) => {
        contenedor.innerHTML += `
            <article class="producto">
                <img src="${libro.imagen}" alt="Portada del libro ${escaparHTML(libro.titulo)}" loading="lazy">
                <h3>${escaparHTML(libro.titulo)}</h3>
                <p class="autor">${escaparHTML(libro.autor)}</p>
                <p class="precio">${formatearPrecio(libro.precio)}</p>
                <button type="button" class="agregar-carrito"
                    data-id="${libro.id}"
                    data-titulo="${escaparHTML(libro.titulo)}"
                    data-precio="${libro.precio}"
                    data-imagen="${libro.imagen}">
                    <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> Agregar al carrito
                </button>
            </article>
        `;
    });
}

function configurarEventos() {
    // Un solo listener para todos los botones "Agregar al carrito"
    // (sirve también para las cards que llegan después desde la API)
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

    document.getElementById("vaciar-carrito").addEventListener("click", vaciarCarrito);
    document.getElementById("finalizar-compra").addEventListener("click", finalizarCompra);
    document.getElementById("form-contacto").addEventListener("submit", enviarFormulario);
}


function agregarAlCarrito(producto) {
    const existente = carrito.find((item) => item.id === producto.id);

    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }

    actualizarCarrito();
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
}

function eliminarDelCarrito(id) {
    const item = carrito.find((producto) => producto.id === id);
    carrito = carrito.filter((producto) => producto.id !== id);
    actualizarCarrito();

    if (item) mostrarMensaje(`Quitaste "${item.titulo}" del carrito`);
}

function vaciarCarrito() {
    if (carrito.length === 0) return;
    if (!confirm("¿Querés vaciar el carrito?")) return;

    carrito = [];
    actualizarCarrito();
    mostrarMensaje("Vaciaste el carrito");
}

function finalizarCompra() {
    if (carrito.length === 0) return;

    const total = calcularTotal();
    carrito = [];
    actualizarCarrito();
    mostrarMensaje(`¡Gracias por tu compra! Total abonado: ${formatearPrecio(total)}`);
}

function actualizarCarrito() {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    renderizarCarrito();
}

function renderizarCarrito() {
    const lista = document.getElementById("lista-carrito");
    lista.innerHTML = "";

    if (carrito.length === 0) {
        lista.innerHTML = `<li class="carrito-vacio">Tu carrito está vacío.</li>`;
    }

    carrito.forEach((item) => {
        const titulo = escaparHTML(item.titulo);
        lista.innerHTML += `
            <li class="item-carrito">
                <img src="${item.imagen}" alt="Portada de ${titulo}">
                <div class="item-info">
                    <h3>${titulo}</h3>
                    <p>${formatearPrecio(item.precio)} c/u</p>
                </div>
                <div class="item-cantidad">
                    <button type="button" data-accion="restar" data-id="${item.id}" aria-label="Restar una unidad de ${titulo}">−</button>
                    <span>${item.cantidad}</span>
                    <button type="button" data-accion="sumar" data-id="${item.id}" aria-label="Sumar una unidad de ${titulo}">+</button>
                </div>
                <p class="item-subtotal">${formatearPrecio(item.precio * item.cantidad)}</p>
                <button type="button" class="item-eliminar" data-accion="eliminar" data-id="${item.id}" aria-label="Eliminar ${titulo} del carrito">
                    <i class="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
            </li>
        `;
    });

    const cantidadTotal = carrito.reduce((suma, item) => suma + item.cantidad, 0);
    document.getElementById("contador-carrito").textContent = cantidadTotal;
    document.getElementById("total-carrito").textContent = formatearPrecio(calcularTotal());

    document.getElementById("vaciar-carrito").disabled = carrito.length === 0;
    document.getElementById("finalizar-compra").disabled = carrito.length === 0;
}

function calcularTotal() {
    return carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
}

async function enviarFormulario(evento) {
    evento.preventDefault();

    const formulario = evento.target;
    const estado = document.getElementById("estado-formulario");

    if (!validarFormulario()) {
        estado.textContent = "Revisá los campos marcados.";
        estado.className = "estado-formulario error";
        return;
    }

    estado.textContent = "Enviando…";
    estado.className = "estado-formulario";

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
    campo.setAttribute("aria-describedby", idError);
    document.getElementById(idError).textContent = texto;
}

function limpiarError(campo, idError) {
    campo.removeAttribute("aria-invalid");
    document.getElementById(idError).textContent = "";
}

let temporizadorMensaje;

function mostrarMensaje(texto) {
    const mensaje = document.getElementById("mensaje-usuario");
    mensaje.textContent = texto;
    mensaje.classList.add("visible");

    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(() => {
        mensaje.classList.remove("visible");
    }, 3000);
}

function formatearPrecio(valor) {
    return "$" + valor.toLocaleString("es-AR");
}

function escaparHTML(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}