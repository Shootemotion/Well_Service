# 🛢️ Well Service — Drilling Command Center v2.0

Dashboard web para **monitoreo y registro de operaciones de perforación** (daily drilling), más una vista de **planificación de próximas locaciones**.

Aplicación 100% frontend (HTML + CSS + JavaScript vanilla), sin backend ni build. La app vive en [`drilling-app/`](drilling-app/).

---

## 🚀 Cómo correrlo

> ⚠️ **No abras `index.html` con doble clic.** La app carga los datos con `fetch('./data/wells.json')` y los navegadores bloquean ese pedido bajo el protocolo `file://`. Hay que servirlo con un servidor estático.

```bash
git clone https://github.com/Shootemotion/Well_Service.git
cd Well_Service/drilling-app
```

Levantá un servidor estático con cualquiera de estas opciones y abrí la URL que indique:

```bash
npx http-server -p 8080      # Node.js
python -m http.server 8080   # Python 3
php -S localhost:8000        # PHP
```

…o usá la extensión **Live Server** de VS Code (botón "Go Live").

Luego abrí **http://localhost:8080**.

> 🌐 **Requiere internet**: el gráfico usa **Chart.js** desde CDN y las tipografías (Inter / JetBrains Mono) desde Google Fonts. Sin conexión, el gráfico no se dibuja y se usan fuentes del sistema.

---

## ✨ Funcionalidades

- **Selector de pozo** con búsqueda por id, nombre, ubicación o RIG.
- **Selector de día operativo paginado** (7 días por página, con flechas) y modo **Play** que recorre el avance día a día.
- **Tabla DDR** (Drilling Day Report) con las operaciones del día.
- **Gráfico Días vs. Profundidad / Costo**:
  - Modo profundidad: real (sólido) + plan (punteado) + proyección.
  - Modo costo: costo acumulado real vs. plan, con línea de **AFE** (presupuesto autorizado, alineado al fin de la curva plan).
- **Wellbore schematic** con casings y profundidad actual.
- **BHA**, **Resumen de NPT** (acumulado por categoría) y **Resumen de Lodo**.
- **Panel de Sensores** del último evento del día, **paginado** (6 por página).
- **Vista de Próximas Locaciones** (botón en el header):
  - Tarjetas con semáforo de los 4 gates: **locación lista, programa asignado, AFE aprobado, permisos de ingreso**.
  - Estado general (Por iniciar / En preparación / Listo para DTM) y barra de preparación.
  - **Línea de tiempo de spuds** con marcador de "HOY".

---

## 📁 Estructura

```
Well_Service/
├── README.md                       # este archivo
├── drilling-app/                   # la aplicación
│   ├── index.html                  # daily drilling + vista de locaciones
│   ├── styles/main.css             # estilos (CSS Grid / Flexbox, tema oscuro)
│   ├── js/
│   │   ├── app.js                  # inicialización y orquestación
│   │   ├── dataManager.js          # carga de datos, helpers de costo/NPT/locaciones
│   │   ├── wellManager.js          # UI del dashboard, días, sensores
│   │   ├── chartManager.js         # gráfico profundidad/costo (Chart.js)
│   │   ├── schematicManager.js     # wellbore schematic (SVG)
│   │   └── locationsManager.js     # vista de próximas locaciones + timeline
│   ├── data/wells.json             # datos demo (pozos, operaciones, costos, locaciones)
│   └── assets/                     # imágenes/iconos (opcional)
├── Mockup_WellService.html         # mockup de referencia
└── drilling_command_center.html    # mockup de referencia
```

---

## 🗃️ Datos

Todo sale de [`drilling-app/data/wells.json`](drilling-app/data/wells.json):

- `wells[]` — pozos con `days[]` (operaciones, `planMD`/`actualMD`, `planCost`/`actualCost`), `casings`, `bha`, `mud`, `afe`.
- `upcomingLocations[]` — próximas locaciones con sus 4 `gates` (estado + fecha) y `estimatedSpud`.
- `nptCategories` — categorías de NPT y sus colores.

Es data de **demostración**. Para agregar/editar pozos o locaciones, modificá ese JSON.

---

## 💻 Tecnología

HTML5 · CSS3 · JavaScript (Vanilla, ES6+) · [Chart.js](https://www.chartjs.org/) · sin dependencias instalables ni paso de build.
