// libreria: express-validator — Validación de entrada de datos
// /api/usuarios — CRUD de usuarios (protegido, solo ADMIN para listar/eliminar)
const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const verifyToken = require("../middleware/verifyToken");
const verifyRole = require("../middleware/verifyRole");
const usuarioController = require("../controllers/usuarioController");

router.get("/", verifyToken, verifyRole("Administrador"), usuarioController.listar);
router.get("/:id", verifyToken, usuarioController.obtener);
// Validación de correo al actualizar usuario
router.put("/:id", verifyToken, [
  body("correo").optional().isEmail().withMessage("Correo inválido").normalizeEmail(),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
  },
], usuarioController.actualizar);
// Validación de nueva contrasena (mínimo 8 caracteres)
router.put("/:id/password", verifyToken, [
  body("passwordNuevo").isLength({ min: 8 }).withMessage("Contraseña debe tener mínimo 8 caracteres"),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
  },
], usuarioController.cambiarPassword);
router.delete("/:id", verifyToken, verifyRole("Administrador"), usuarioController.eliminar);

module.exports = router;
