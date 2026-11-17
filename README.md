# Nebula Books

Nebula Books es una tienda ficticia de libros de ciencia ficción, hecha como proyecto final de HTML, CSS y JavaScript.

🔗 Sitio publicado: https://emanuel97654.github.io/ProyectoFinal/

## Características

- **Catálogo dinámico:** los libros se cargan desde la API pública de [Open Library](https://openlibrary.org/developers/api) con `fetch` y `async/await`, con mensajes de carga, de error y de catálogo vacío.
- **Carrito de compras en un panel lateral:** se abre desde el ícono del header. Permite sumar o restar unidades, eliminar productos y vaciar el carrito, y muestra un resumen antes de confirmar la compra.
- **Carrito persistente:** se guarda en `localStorage`. Si los datos guardados están dañados, el carrito arranca vacío en vez de romper la página.
- **Formulario de contacto** con validación propia en JavaScript y envío con Formspree sin recargar la página.
- **Diseño responsive** con menú hamburguesa en celulares.
- **Accesibilidad:** HTML semántico, foco visible, mensajes `aria-live`, `aria-invalid` en los errores, panel del carrito con `<dialog>` (atrapa el foco y se cierra con Escape) y soporte para `prefers-reduced-motion`.
- Sección multimedia, reseñas y una tabla de consultas de ejemplo.

## Tecnologías utilizadas

- HTML5 (`<dialog>`, `<picture>`, `<video>`)
- CSS3: variables, Flexbox, Grid, transiciones y media queries
- JavaScript: `fetch`, `async/await`, delegación de eventos y `localStorage`
- Google Fonts (Roboto)
- Íconos SVG de [Font Awesome](https://fontawesome.com) (CC BY 4.0), incluidos en el HTML
- Formspree

## Formulario de contacto

El formulario usa Formspree para enviar mensajes sin necesidad de un servidor propio. JavaScript valida los campos y después hace el envío con `fetch` (`POST`) a la URL del atributo `action`.

Los datos enviados son:

- Nombre
- Correo electrónico
- Mensaje

## Estructura

```
index.html
styles.css
script.js
assets/
  logo.png / logo.webp      Logo optimizado
  favicon.png
  apple-touch-icon.png
  poster.webp               Imagen previa del video
  video.mp4                 Video de presentación (720p comprimido)
```
