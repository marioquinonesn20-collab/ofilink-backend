// server.js (OFILINK Backend + AIConta Fiscal Shield v1) - CommonJS
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

/* =========================================================
   1) CORS (TIENE QUE IR ANTES DE CUALQUIER RUTA)
   En Railway configura:
   CORS_ORIGINS="https://ofilink-frontend.vercel.app,https://ofilink-frontend-xxxx.vercel.app,http://localhost:5173"
========================================================= */
const corsOriginsEnv = process.env.CORS_ORIGINS || "http://localhost:5173";
const allowedOrigins = corsOriginsEnv
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Postman / server-to-server
      if (!origin) return cb(null, true);

      // si no hay whitelist (no recomendado prod), permite todo
      if (allowedOrigins.length === 0) return cb(null, true);

      if (!allowedOrigins.includes(origin)) {
        return cb(new Error(`CORS bloqueado: ${origin}`), false);
      }
      return cb(null, true);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

// Preflight
app.options("*", cors());

// Body JSON
app.use(express.json({ limit: "10mb" }));

/* =========================================================
   2) Persistencia JSON
========================================================= */
const DATA_FILE = process.env.DATA_FILE || "./data/data.json";
const dataPath = path.resolve(DATA_FILE);

function ensureDataFile() {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(dataPath)) {
    const seed = { nextClienteId: 1, nextTicketId: 1, clientes: [], tickets: [] };
    fs.writeFileSync(dataPath, JSON.stringify(seed, null, 2), "utf-8");
  }
}

function readData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf-8");
}

/* =========================================================
   3) Routes - Core OFILINK
========================================================= */
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "OFILINK 2.0 API viva" });
});

app.get("/api/clientes", (req, res) => {
  const data = readData();
  res.json(data.clientes || []);
});

app.post("/api/clientes", (req, res) => {
  const { empresa, nombre, monto, etapa, origen, asesor } = req.body || {};
  if (!empresa || !nombre) {
    return res.status(400).json({ ok: false, message: "empresa y nombre son obligatorios" });
  }

  const data = readData();
  const nuevo = {
    id: data.nextClienteId++,
    empresa,
    nombre,
    monto: Number(monto) || 0,
    etapa: etapa || "prospecto",
    origen: origen || "",
    asesor: asesor || "",
  };

  data.clientes.push(nuevo);
  writeData(data);
  res.status(201).json(nuevo);
});

app.get("/api/tickets", (req, res) => {
  const data = readData();
  res.json(data.tickets || []);
});

app.post("/api/tickets", (req, res) => {
  const { canal, empresa, cliente, asunto, prioridad, asignadoA, estado, creadoEn } = req.body || {};
  if (!empresa || !cliente || !asunto) {
    return res.status(400).json({ ok: false, message: "empresa, cliente y asunto son obligatorios" });
  }

  const data = readData();
  const nuevo = {
    id: data.nextTicketId++,
    canal: canal || "Otro",
    empresa,
    cliente,
    asunto,
    prioridad: prioridad || "Media",
    asignadoA: asignadoA || "",
    estado: estado || "Abierto",
    creadoEn: creadoEn || new Date().toISOString().slice(0, 16).replace("T", " "),
  };

  data.tickets.unshift(nuevo);
  writeData(data);
  res.status(201).json(nuevo);
});

/* =========================================================
   4) AIConta - Fiscal Shield v1
========================================================= */
const aiconta = express.Router();

aiconta.get("/health", (req, res) => {
  res.json({ ok: true, service: "aiconta", message: "AIConta API viva" });
});

aiconta.get("/companies", (req, res) => {
  res.json({
    ok: true,
    items: [
      {
        id: "contax",
        legalName: "CONTAX SOLUTIONS AND BUSINESS ADMINISTRATION SAS DE CV",
        country: "MX",
        defaultCurrency: "MXN",
        active: true,
      },
    ],
  });
});

aiconta.post("/compliance/analyze", (req, res) => {
  const payload = req.body || {};
  res.json({
    ok: true,
    bot: "FiscalShield",
    version: "v1",
    inputEcho: payload,
    result: {
      overall: "yellow",
      summary:
        "V1 demo: estructura lista. Pendiente motor experto + EFOS/69-B + expediente materialidad.",
      findings: [
        {
          code: "MATERIALIDAD_BASE",
          severity: "medium",
          title: "Expediente incompleto",
          detail: "Faltan evidencias mínimas ligadas a contrato/OC/pedido.",
          suggestedNext: [
            "Subir contrato firmado",
            "Adjuntar orden de compra/pedido",
            "Evidencia de entrega/servicio (correo, fotos, bitácora)",
          ],
        },
      ],
      citations: [],
    },
  });
});

app.use("/api/aiconta", aiconta);

/* =========================================================
   5) 404 + Error Handler
========================================================= */
app.use((req, res) => res.status(404).json({ ok: false, message: "Ruta no encontrada" }));

app.use((err, req, res, next) => {
  console.error("API Error:", err.message);
  res.status(500).json({ ok: false, message: err.message || "Error interno de servidor" });
});

/* =========================================================
   6) Start
========================================================= */
app.listen(PORT, () => {
  console.log("OFILINK 2.0 API escuchando en puerto", PORT);
  console.log("DATA_FILE:", dataPath);
  console.log("CORS_ORIGINS:", allowedOrigins);
});

module.exports = app;
