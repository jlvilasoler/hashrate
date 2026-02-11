# HRS GROUP - Sistema de Facturación (Modernizado)

Este repo ahora está modernizado como **monorepo**:

- `client/`: Front moderno con **Vite + React + TypeScript**
- `server/`: Back moderno con **Express + TypeScript** (y soporte opcional para **MongoDB/Mongoose**)

## Requisitos

- Node.js **20+**
- npm **9+**

## Instalación

```bash
npm install
```

## Desarrollo (front + back a la vez)

```bash
npm run dev
```

- Front: `http://localhost:5173`
- API: `http://localhost:8080/api/health`

## Backend (MongoDB opcional)

Por defecto el backend puede arrancar sin Mongo.  
Si querés persistencia real, creá `server/.env` basado en `server/.env.example`:

```bash
# server/.env
NODE_ENV=development
PORT=8080
MONGODB_URI=mongodb://localhost:27017/facturacion_hrs
CORS_ORIGIN=http://localhost:5173
```

## Build

```bash
npm run build
```

## Scripts útiles

- `npm run dev`: corre `server` y `client` en paralelo
- `npm run start`: inicia el backend compilado (producción)
- `npm run legacy:dev`: corre el server anterior (`src/app.js`) por compatibilidad

## Desplegar en Vercel

El proyecto está listo para desplegar solo el **frontend** (client) en Vercel:

1. **Conectar el repo**
   - Entrá en [vercel.com](https://vercel.com) e iniciá sesión.
   - ?Add New?? ? ?Project? e importá el repositorio de GitHub/GitLab/Bitbucket.

2. **Configuración del proyecto**
   - **Root Directory:** dejalo en `.` (raíz del repo).
   - **Build Command:** `npm run build -w client` (ya viene en `vercel.json`).
   - **Output Directory:** `client/dist` (ya viene en `vercel.json`).
   - **Install Command:** `npm install` (por defecto).

3. **Deploy**
   - Hacé clic en ?Deploy?. Vercel va a instalar dependencias, construir el client y publicar el sitio.

4. **Nota**
   - Se despliega solo la app React (client). Si en producción la app usa una API, tenés que tener el backend desplegado en otro servicio (Railway, Render, etc.) y configurar la URL de la API en el client (variables de entorno si usás `Vite` env).

## Notas

- El front ya incluye pantallas en React para **Home / Facturación / Historial / Clientes / Reportes**.
- **Facturación** y **Historial** ya migraron la lógica principal (PDF, totales, filtros, gráfico y exportación a Excel).
- El siguiente paso natural es reemplazar `localStorage` por la API (`/api/invoices`, `/api/clients`) cuando tengas `MONGODB_URI` configurado.

