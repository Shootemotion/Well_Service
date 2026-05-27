# 🪛 Drilling Command Center v2.0

**Sistema profesional de monitoreo y registro de operaciones de perforación petrolera**

---

## 📋 Descripción

Plataforma web completa para:
- ✅ **Búsqueda de pozos** con autocompletado
- ✅ **Selector de días operacionales** con fechas
- ✅ **Tabla DDR** (Drilling Day Report) con detalles de operaciones
- ✅ **Gráficos** de profundidad vs. tiempo
- ✅ **Sensores en vivo** con parámetros operacionales
- ✅ **Información del pozo** (operador, RIG, estado, ubicación)

---

## 📁 Estructura del Proyecto

```
drilling-app/
├── index.html              # HTML principal
├── styles/
│   └── main.css           # Estilos modularizados (CSS Grid, Flexbox)
├── js/
│   ├── app.js             # Lógica principal de inicialización
│   ├── dataManager.js     # Gestión de datos de pozos (carga, búsqueda)
│   └── wellManager.js     # Gestión de UI y eventos
├── data/
│   └── wells.json         # Base de datos de pozos y operaciones
└── assets/                # (Imágenes, iconos - opcional)
```

---

## 🚀 Cómo Usar

### Abrir la aplicación
1. Abre el archivo `index.html` en tu navegador
2. La aplicación cargará automáticamente el **primer pozo**
3. Se mostrarán los datos del **primer día** de ese pozo

### Buscar un pozo
1. Escribe en el campo **🔍 Pozo** (ej: `C0.X-115`)
2. Aparecerá un dropdown con pozos coincidentes
3. Haz click en el pozo deseado
4. Los datos se actualizan automáticamente

### Cambiar de día
1. En la sección **📅 Seleccionar Día** verás botones para cada día
2. Muestra el número del día y su fecha
3. Haz click para cambiar el día
4. La tabla DDR se actualiza con las operaciones de ese día

### Ver detalles de operaciones
- Tabla DDR muestra:
  - **Hora Inicio/Fin** de operación
  - **Duración** en minutos
  - **Código** (DRILL, CONN, CIRC, NPT, etc.)
  - **Descripción** de operativa
  - **Parámetros**: MD, WOB, RPM, Torque, GPM, SPP

### Sensores
- Panel derecha muestra los **últimos valores del día**
- Código de colores: Verde (normal), Amarillo (precaución), Rojo (crítico)

---

## 📊 Datos de Prueba

La aplicación incluye **3 pozos de ejemplo**:

| Pozo | Ubicación | RIG | Estado | Días |
|------|-----------|-----|--------|------|
| C0.X-112 | Cuenca Central | H&P 405 | DRILLING 8-1/2" | 3 días |
| C0.X-115 | Bloque Sur | H&P 500 | DRILLING 6-1/8" | 3 días |
| C0.X-118 | Bloque Este | H&P 350 | CASING RUNNING | 2 días |

---

## 🔧 Personalización

### Agregar nuevos pozos
1. Edita `data/wells.json`
2. Agrega un nuevo objeto en el array `"wells"`
3. Estructura requerida:
```json
{
  "id": "C0.X-120",
  "name": "C0.X-120",
  "operator": "Operadora-Petroleo",
  "rig": "H&P 600",
  "status": "DRILLING 5-7/8\" HOLE",
  "location": "Bloque Oeste",
  "days": [
    {
      "dayNumber": 1,
      "date": "2026-05-26",
      "operations": [
        {
          "startTime": "08:00",
          "endTime": "12:00",
          "duration": 240,
          "code": "DRILL",
          "description": "Descripción de operación",
          "md": 1000.0,
          "wob": 35,
          "rpm": 120,
          "torque": 15.5,
          "gpm": 550,
          "spp": 3100
        }
      ]
    }
  ]
}
```

### Modificar estilos
- Colores definidos en `:root` de `styles/main.css`
- Flexibilidad con Flexbox y CSS Grid
- Responsive design (mobile-friendly)

---

## 💻 Tecnología

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Visualización**: Chart.js para gráficos
- **Fuentes**: Inter, JetBrains Mono
- **Datos**: JSON

---

## 🎨 Paleta de Colores

| Color | Uso |
|-------|-----|
| `#0d1117` | Fondo oscuro |
| `#00f6ff` | Azul eléctrico (acentos) |
| `#10b981` | Verde (OK/Normal) |
| `#ef4444` | Rojo (Alerta/Error) |
| `#eab308` | Amarillo (Precaución) |

---

## 📝 Códigos de Operación

| Código | Significado | Color |
|--------|-------------|-------|
| DRILL | Perforación | Verde |
| CONN | Conexión de tiro | Azul |
| CIRC | Circulación | Amarillo |
| NPT_M | No-Productive Time (Mecánico) | Rojo |
| TRIP | Viaje de tubería | Azul claro |
| CASING | Corrida de casing | Azul claro |

---

## 🐛 Debugging

Abre la consola del navegador (F12) y accede:
- `window.app` - Instancia de la aplicación
- `window.app.dataManager` - Gestor de datos
- `window.app.wellManager` - Gestor de UI

---

## 📦 Requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Soporte para ES6+ JavaScript
- Servidor local o conexión HTTP (requerida para cargar wells.json)

---

## 🔐 Notas de Seguridad

Para desarrollo local, puedes usar:
```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

---

## 📄 Licencia

Proyecto de demostración para Operadora-Petroleo

---

**Versión**: 2.0 | **Última actualización**: Mayo 2026
