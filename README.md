# OFILINK 2.0 · Backend Node.js (PROD)

Este backend:
- Expone API REST multiempresa:
  - GET/POST /api/clientes
  - GET/POST /api/tickets
- Persiste datos en un archivo JSON (DATA_FILE), para que no se pierdan al reiniciar.

## 1) Instalar
```bash
npm install
```

## 2) Configurar
```bash
cp .env.example .env
```

Edita:
- PORT
- CORS_ORIGINS (tu dominio del frontend)
- DATA_FILE (ruta del JSON)

## 3) Ejecutar
DEV:
```bash
npm run dev
```

PROD:
```bash
npm start
```

## 4) Health
- /api/health
