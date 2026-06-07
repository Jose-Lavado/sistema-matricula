// /api/matriculas — CRUD, cambio de estado/sección, historial, stats (protegido)
const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const verifyToken = require("../middleware/verifyToken");
const verifyRole = require("../middleware/verifyRole");
const matriculaController = require("../controllers/matriculaController");

router.get("/", verifyToken, matriculaController.listar);
router.get("/stats", verifyToken, matriculaController.stats);
router.get("/:id", verifyToken, matriculaController.obtener);
router.get("/:id/historial", verifyToken, matriculaController.historial);
router.post("/", verifyToken, verifyRole("Administrador", "Apoderado"), [
  body("grado").notEmpty().withMessage("Grado requerido"),
  (req, res, next) => { const errs = validationResult(req); if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() }); next(); },
], matriculaController.crear);
router.put("/:id/estado", verifyToken, verifyRole("Administrador"), [
  body("estado").isIn(["PENDIENTE", "APROBADA", "RECHAZADA"]).withMessage("Estado inválido"),
  (req, res, next) => { const errs = validationResult(req); if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() }); next(); },
], matriculaController.cambiarEstado);
router.put("/:id/seccion", verifyToken, verifyRole("Administrador"), matriculaController.actualizarSeccion);
router.delete("/:id", verifyToken, verifyRole("Administrador"), matriculaController.eliminar);
router.post("/solicitar-revision", verifyToken, verifyRole("Apoderado"), matriculaController.solicitarRevision);

module.exports = router;
