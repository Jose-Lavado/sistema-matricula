// libreria: winston — Logger estructurado (equivalente a Logback en Java)
// libreria: lodash — Utilidades para validación de strings (equivalente a Google Guava)
// authController.js — login, register, verificar identidad, restablecer contrasena
const jwt = require("jsonwebtoken");
const UsuarioFactory = require("../models/UsuarioFactory");
const logger = require("../services/logger");
const { registrarAcceso, registrarUsoClase } = require("../metrics/prometheus");

// Validación de contrasena: 8+ caracteres, mayúscula, minúscula, dígito, carácter especial
function validarPassword(pass) {
  const faltan = [];
  if (!pass || pass.length < 8) faltan.push("mínimo 8 caracteres");
  if (!/[a-z]/.test(pass)) faltan.push("una minúscula");
  if (!/[A-Z]/.test(pass)) faltan.push("una mayúscula");
  if (!/[0-9]/.test(pass)) faltan.push("un número");
  if (!/[^A-Za-z0-9]/.test(pass)) faltan.push("un carácter especial");
  return faltan;
}

const authController = {
  // Iniciar sesión — autenticar usuario, generar JWT
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Correo y contrasena son requeridos." });
      }

      const user = await UsuarioFactory.login(email.toLowerCase().trim(), password);
      if (!user) {
        registrarAcceso("login", "fallido");
        return res.status(401).json({ message: "Correo o contrasena incorrectos." });
      }

      registrarAcceso("login", "exitoso");

      const token = jwt.sign(
        {
          id: user.idUsuario,
          name: `${user.nombre} ${user.apellido}`,
          role: user.rol === "ADMIN" ? "Administrador" : "Apoderado",
        },
        process.env.JWT_SECRET,
        { expiresIn: "8h" }
      );

      const parentesco = user.parentesco || null;

      return res.json({
        message: "Login exitoso.",
        token,
        user: {
          id: user.idUsuario,
          name: `${user.nombre} ${user.apellido}`,
          role: user.rol === "ADMIN" ? "Administrador" : "Apoderado",
          parentesco,
        },
      });
    } catch (err) {
      logger.error("Error en login:", err);
      return res.status(500).json({ message: "Error interno del servidor." });
    }
  },

  logout: (req, res) => {
    return res.json({ message: "Sesión cerrada correctamente." });
  },

  // Verificar identidad por DNI + correo (restablecer contrasena)
  verificarIdentidad: async (req, res) => {
    try {
      const { dni, correo } = req.body;
      if (!dni || !correo) {
        return res.status(400).json({ message: "DNI y correo son requeridos." });
      }

      const [rows] = await require("../config/db").query(
        `SELECT u.idUsuario, u.correo
         FROM Usuario u
         JOIN Apoderado a ON u.idUsuario = a.idUsuario
         WHERE a.dni = ? AND u.correo = ?`,
        [dni, correo.toLowerCase().trim()]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "No se encontró ningún usuario con esos datos." });
      }

      return res.json({ idUsuario: rows[0].idUsuario, message: "Identidad verificada." });
    } catch (err) {
      logger.error("Error en verificarIdentidad:", err);
      return res.status(500).json({ message: "Error interno del servidor." });
    }
  },

  // Restablecer contrasena — valida formato y actualiza en BD
  restablecerContrasena: async (req, res) => {
    try {
      const { idUsuario, nuevaContrasena } = req.body;
      const errPass = validarPassword(nuevaContrasena);
      if (!idUsuario || errPass.length) {
        return res.status(400).json({ message: "La contrasena debe tener: " + errPass.join(", ") + "." });
      }

      const bcrypt = require("bcryptjs");
      const hashed = bcrypt.hashSync(nuevaContrasena, 10);

      await require("../config/db").query(
        "UPDATE Usuario SET contrasena = ? WHERE idUsuario = ?",
        [hashed, idUsuario]
      );

      return res.json({ message: "Contraseña restablecida correctamente." });
    } catch (err) {
      logger.error("Error en restablecerContrasena:", err);
      return res.status(500).json({ message: "Error interno del servidor." });
    }
  },

  // Registrar usuario — llama a registrarAdmin o registrarApoderado según rol
  register: async (req, res) => {
    try {
      const { contrasena } = req.body;
      const errPass = validarPassword(contrasena);
      if (errPass.length) {
        return res.status(400).json({ message: "La contrasena debe tener: " + errPass.join(", ") + "." });
      }
      const { rol } = req.body;
      if (rol === "ADMIN") {
        registrarUsoClase("Admin", "registrar");
        const Admin = require("../models/Admin");
        const admin = new Admin();
        const result = await admin.registrarAdmin(req.body);
        registrarAcceso("registro", "exitoso");
        return res.status(201).json({
          message: "Administrador registrado correctamente.",
          idUsuario: result.idUsuario,
          idAdmin: result.idAdmin,
        });
      }
      const VALID_PARENTESCOS = ['PADRE', 'MADRE', 'TUTOR', 'APODERADO LEGAL', 'OTRO'];
      if (!req.body.parentesco || !VALID_PARENTESCOS.includes(req.body.parentesco.toUpperCase())) {
        return res.status(400).json({ message: "El parentesco debe ser uno de: PADRE, MADRE, TUTOR, APODERADO LEGAL, OTRO" });
      }
      registrarUsoClase("Apoderado", "registrar");
      const Apoderado = require("../models/Apoderado");
      const apoderado = new Apoderado();
      const result = await apoderado.registrarApoderado(req.body);
      registrarAcceso("registro", "exitoso");
      return res.status(201).json({
        message: "Apoderado registrado correctamente.",
        idUsuario: result.idUsuario,
        idApoderado: result.idApoderado,
      });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ message: "El correo o DNI ya están registrados." });
      }
      logger.error("Error en registro:", err);
      return res.status(500).json({ message: "Error interno del servidor." });
    }
  },
};

module.exports = authController;
