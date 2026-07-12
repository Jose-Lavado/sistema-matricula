// /api/reportes — reportes del sistema de matrículas (protegido, solo ADMIN)
const express = require("express");
const router = express.Router();
const { query, validationResult } = require("express-validator");
const verifyToken = require("../middleware/verifyToken");
const verifyRole = require("../middleware/verifyRole");
const reporteController = require("../controllers/reporteController");

const validarPeriodo = [
  query("periodo").optional().isInt({ min: 2000, max: 2100 }).withMessage("Periodo inválido"),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
  },
];

router.get("/matriculas", verifyToken, verifyRole("Administrador"), reporteController.matriculas);
router.get("/stats", verifyToken, reporteController.stats);
router.get("/productividad", verifyToken, verifyRole("Administrador"), reporteController.productividad);
router.get("/eliminadas", verifyToken, verifyRole("Administrador"), reporteController.eliminadas);
router.get("/cumplimiento", verifyToken, verifyRole("Administrador"), reporteController.cumplimiento);
router.get("/vacantes", verifyToken, verifyRole("Administrador"), reporteController.vacantes);
router.get("/descargar-excel", verifyToken, verifyRole("Administrador"), reporteController.descargarExcel);

module.exports = router;