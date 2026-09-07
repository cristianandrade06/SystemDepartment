# Andrade Departamentos — Clean Architecture

Refactor del HTML original manteniendo el comportamiento general, pero separando responsabilidades:

- `domain/`: reglas de negocio, entidades y cálculos.
- `application/`: casos de uso y servicios.
- `infrastructure/`: LocalStorage y exportación CSV.
- `presentation/`: renderizado HTML y eventos.
- `index.html`: punto de entrada.
- `styles.css`: estilos.

Firma de desarrollo: ZETA.

Para ejecutarlo, sirve la carpeta con un servidor HTTP local porque utiliza ES Modules.
Por ejemplo:

    python3 -m http.server 8000

y abre:

    http://localhost:8000

Si el entorno abre el proyecto con la ruta `andrade-clean-architecture`,
también está disponible en:

    http://localhost:8000/andrade-clean-architecture/index.html

## Datos y publicación

La aplicación funciona como sitio estático y está lista para publicarse en
un hosting que sirva archivos estáticos. Los departamentos y pagos actuales
se guardan en `localStorage` del navegador. Además, se registra una bitácora
pequeña de acciones en la cookie `andrade_activity`, con una duración de un
año y sin guardar contraseñas ni importes.

Las cookies y `localStorage` pertenecen a cada navegador y dispositivo; no
sincronizan información entre teléfonos o computadoras. Para usar los mismos
datos desde varios dispositivos se necesita conectar los repositorios a una
API con base de datos, autenticación y HTTPS. Esa conexión requiere definir
el proveedor y las credenciales del propietario antes de activarla; no es
seguro simularla desde el frontend ni publicar credenciales privadas.
