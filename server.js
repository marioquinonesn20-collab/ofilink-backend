require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

const corsOriginsEnv = process.env.CORS_ORIGINS || "http://localhost:5173";
const allowedOrigins = corsOriginsEnv.split(",").map((o) => o.trim()).filter(Boolean);

// Persistencia JSON
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
  const raw = fs.readFileSync(dataPath, "utf-8");
  return JSON.parse(raw);
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf-8");
}
import aiContaRouter from "./modules/aiconta/index.js";

app.use("/api/aiconta", aiconta);

app.use("/api/aiconta", aiContaRouter);

// Middlewares
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Postman / server-to-server
      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("Origen no permitido por CORS: " + origin), false);
      }
      return callback(null, true);
    },
  })
);
app.use(express.json());
// === AIConta (Fiscal Shield) Router v1 ===
import express from "express";

const aiconta = express.Router();

// health del módulo
aiconta.get("/health", (req, res) => {
  res.json({ ok: true, service: "aiconta", message: "AIConta API viva" });
});

// demo: empresa base (Contax Solutions...)
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

// Fiscal Shield v1: análisis compliance (placeholder)
aiconta.post("/compliance/analyze", express.json(), async (req, res) => {
  const payload = req.body || {};

  // v1: respondemos estructura (luego conectamos LLM + BD + evidencia)
  res.json({
    ok: true,
    bot: "FiscalShield",
    version: "v1",
    inputEcho: payload,
    result: {
      overall: "yellow", // green | yellow | red
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
      citations: [], // aquí luego van artículos cuando aplique
    },
  });
});

export default aiconta;


// Routes
app.get("/api/health", (req, res) => res.json({ ok: true, message: "OFILINK 2.0 API viva" }));

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

// 404
app.use((req, res) => res.status(404).json({ ok: false, message: "Ruta no encontrada" }));

// Error handler
app.use((err, req, res, next) => {
  console.error("API Error:", err.message);
  res.status(500).json({ ok: false, message: "Error interno de servidor" });
});

app.listen(PORT, () => {
  console.log("OFILINK 2.0 API escuchando en puerto", PORT);
  console.log("DATA_FILE:", dataPath);
});
