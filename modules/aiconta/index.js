import express from "express";
const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    module: "AI-CONTA",
    bots: ["FacturaBot", "ContaBot", "FiscalShield"],
  });
});

export default router;
