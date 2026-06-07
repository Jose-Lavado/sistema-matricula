// libreria: express-validator — Validación de entrada de datos
// /api/apoderados — perfil, solicitar matrícula, listar hijos (protegido por rol)
const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const verifyToken = require("../middleware/verifyToken");
const verifyRole = require("../middleware/verifyRole");
const apoderadoController = require("../controllers/apoderadoController");

router.get("/perfil", verifyToken, verifyRole("Apoderado"), apoderadoController.perfil);
router.get("/dni/:dni", verifyToken, [
  param("dni").matches(/^\d{8}$/).withMessage("DNI debe tener 8 dígitos"),
  (req, res, next) => { const errs = validationResult(req); if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() }); next(); },
], apoderadoController.buscarPorDni);
router.post("/solicitar-matricula", verifyToken, verifyRole("Apoderado"), [
  body("grado").notEmpty().withMessage("Grado requerido"),
  (req, res, next) => { const errs = validationResult(req); if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() }); next(); },
], apoderadoController.solicitarMatricula);
router.get("/hijos", verifyToken, verifyRole("Apoderado"), apoderadoController.getHijos);
router.get("/todos-hijos", verifyToken, verifyRole("Apoderado"), apoderadoController.getTodosHijos);
router.get("/:id/hijos", verifyToken, verifyRole("Administrador"), apoderadoController.getHijosById);

module.exports = router;
