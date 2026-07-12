// libreria: winston — Logger (equivalente a Logback en Java)
// usuarioController.js — CRUD de usuarios, perfil propio, cambio de contrasena
const Usuario = require("../models/Usuario");
const Admin = require("../models/Admin");
const Apoderado = require("../models/Apoderado");
const logger = require("../services/logger");
const { registrarUsoClase } = require("../metrics/prometheus");

const usuarioController = {
  // Listar todos los usuarios
  listar: async (req, res) => {
    try {
      registrarUsoClase("Usuario", "findAll");
      const usuarios = await Usuario.findAll();
      return res.json(usuarios);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al listar usuarios." });
    }
  },

  // Obtener usuario por ID (incluye datos extra según rol)
  obtener: async (req, res) => {
    try {
      registrarUsoClase("Usuario", "findById");
      const usuario = await Usuario.findById(req.params.id);
      if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });

      let extra = {};
      if (usuario.rol === "ADMIN") {
        const a = await Admin.findById(req.params.id);
        if (a) extra = { idAdmin: a.idAdmin };
      } else if (usuario.rol === "APODERADO") {
        const a = await Apoderado.findByIdUsuario(req.params.id);
        if (a) {
          const hijos = await a.getTodosHijos();
          extra = { idApoderado: a.idApoderado, dni: a.dni, telefono: a.telefono, direccion: a.direccion, parentesco: a.parentesco, hijos };
        }
      }

      return res.json({ ...usuario, ...extra });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener usuario." });
    }
  },

  // Eliminar usuario por ID
  eliminar: async (req, res) => {
    try {
      await Usuario.delete(req.params.id, req.user.id);
      return res.json({ message: "Usuario eliminado." });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al eliminar usuario." });
    }
  },

  // Actualizar usuario — solo correo (Usuario) y teléfono/dirección (Apoderado)
  actualizar: async (req, res) => {
    try {
      const { correo, telefono, direccion } = req.body;
      const usuario = await Usuario.findById(req.params.id);
      if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });

      const pool = require("../config/db");

      if (correo !== undefined) {
        await pool.query("UPDATE Usuario SET correo = ? WHERE idUsuario = ?", [correo, req.params.id]);
      }

      if (usuario.rol === "APODERADO") {
        const updates = [];
        const params = [];
        if (telefono !== undefined) { updates.push("telefono = ?"); params.push(telefono); }
        if (direccion !== undefined) { updates.push("direccion = ?"); params.push(direccion); }
        if (updates.length > 0) {
          params.push(req.params.id);
          await pool.query(
            "UPDATE Apoderado SET " + updates.join(", ") + " WHERE idUsuario = ?",
            params
          );
        }
      }

      return res.json({ message: "Usuario actualizado." });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al actualizar usuario." });
    }
  },

  // Cambiar contrasena — valida actual y formato de la nueva, luego actualiza
  cambiarPassword: async (req, res) => {
    try {
      const { passwordActual, passwordNuevo } = req.body;
      const errs = [];
      if (!passwordNuevo || passwordNuevo.length < 8) errs.push("mínimo 8 caracteres");
      if (!/[a-z]/.test(passwordNuevo)) errs.push("una minúscula");
      if (!/[A-Z]/.test(passwordNuevo)) errs.push("una mayúscula");
      if (!/[0-9]/.test(passwordNuevo)) errs.push("un número");
      if (!/[^A-Za-z0-9]/.test(passwordNuevo)) errs.push("un carácter especial");
      if (errs.length) {
        return res.status(400).json({ message: "La contrasena debe tener: " + errs.join(", ") + "." });
      }
      const pool = require("../config/db");
      const bcrypt = require("bcryptjs");
      const [rows] = await pool.query("SELECT contrasena FROM Usuario WHERE idUsuario = ?", [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado." });
      const ok = await bcrypt.compare(passwordActual, rows[0].contrasena);
      if (!ok) return res.status(400).json({ message: "Contraseña actual incorrecta." });
      const hashed = bcrypt.hashSync(passwordNuevo, 10);
      await pool.query("UPDATE Usuario SET contrasena = ? WHERE idUsuario = ?", [hashed, req.params.id]);
      return res.json({ message: "Contraseña actualizada." });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al cambiar contrasena." });
    }
  },

  // Obtener perfil del usuario autenticado
  obtenerPropio: async (req, res) => {
    try {
      const usuario = await Usuario.findById(req.user.id);
      if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });
      let extra = {};
      if (usuario.rol === "APODERADO") {
        const a = await Apoderado.findByIdUsuario(req.user.id);
        if (a) extra = { idApoderado: a.idApoderado, dni: a.dni, telefono: a.telefono, direccion: a.direccion, parentesco: a.parentesco };
      }
      return res.json({ ...usuario, ...extra });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener perfil." });
    }
  },

};

module.exports = usuarioController;
