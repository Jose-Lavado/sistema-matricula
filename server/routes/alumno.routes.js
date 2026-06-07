// libreria: express-validator — Validación de entrada de datos
// /api/alumnos — búsqueda, creación y verificación de duplicados (protegido)
const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const verifyToken = require("../middleware/verifyToken");
const verifyRole = require("../middleware/verifyRole");
const alumnoController = require("../controllers/alumnoController");

router.get("/", verifyToken, alumnoController.listar);
router.get("/buscar", verifyToken, [
  param("dni").optional().matches(/^\d{8}$/).withMessage("DNI debe tener 8 dígitos"),
  (req, res, next) => { const errs = validationResult(req); if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() }); next(); },
], alumnoController.buscarPorDniQuery);
router.get("/dni/:dni", verifyToken, [
  param("dni").matches(/^\d{8}$/).withMessage("DNI debe tener 8 dígitos"),
  (req, res, next) => { const errs = validationResult(req); if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() }); next(); },
], alumnoController.buscarPorDni);
router.get("/duplicado/:dni", verifyToken, [
  param("dni").matches(/^\d{8}$/).withMessage("DNI debe tener 8 dígitos"),
  (req, res, next) => { const errs = validationResult(req); if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() }); next(); },
], alumnoController.verificarDuplicado);
router.post("/", verifyToken, verifyRole("Administrador", "Apoderado"), [
  body("dni").matches(/^\d{8}$/).withMessage("DNI debe tener 8 dígitos"),
  body("nombre").notEmpty().withMessage("Nombre requerido"),
  body("apellido").notEmpty().withMessage("Apellido requerido"),
  (req, res, next) => { const errs = validationResult(req); if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() }); next(); },
], alumnoController.crear);

module.exports = router;
