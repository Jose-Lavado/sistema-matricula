// libreria: express-validator — Validación de datos de entrada (seguridad)
// /api/auth — login, registro, verificación y restablecimiento de contrasena
const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const authController = require("../controllers/authController");

// Validación de credenciales (email + contrasena)
router.post("/login", [
  body("email").isEmail().withMessage("Correo inválido").normalizeEmail(),
  body("password").notEmpty().withMessage("Contraseña requerida"),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
  },
], authController.login);

router.post("/logout", authController.logout);

// Validación de registro (correo, contrasena, nombre, apellido)
router.post("/register", [
  body("correo").isEmail().withMessage("Correo inválido").normalizeEmail(),
  body("contrasena").isLength({ min: 8 }).withMessage("Contraseña debe tener mínimo 8 caracteres"),
  body("nombre").notEmpty().withMessage("Nombre requerido"),
  body("apellido").notEmpty().withMessage("Apellido requerido"),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
  },
], authController.register);

// Validación de identidad (DNI 8 dígitos + correo)
router.post("/verificar", [
  body("dni").matches(/^\d{8}$/).withMessage("DNI debe tener 8 dígitos"),
  body("correo").isEmail().withMessage("Correo inválido").normalizeEmail(),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
  },
], authController.verificarIdentidad);

// Validación de nueva contrasena (mínimo 8 caracteres)
router.post("/restablecer", [
  body("nuevaContrasena").isLength({ min: 8 }).withMessage("Contraseña debe tener mínimo 8 caracteres"),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
  },
], authController.restablecerContrasena);

module.exports = router;
