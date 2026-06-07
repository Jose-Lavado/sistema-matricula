// libreria: winston — Logger (equivalente a Logback en Java)
// usuarioController.js — CRUD de usuarios, perfil propio, cambio de contraseña
const Usuario = require("../models/Usuario");
const Admin = require("../models/Admin");
const Apoderado = require("../models/Apoderado");
const logger = require("../services/logger");

const usuarioController = {
  listar: async (req, res) => {
    try {
      const usuarios = await Usuario.findAll();
      return res.json(usuarios);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al listar usuarios." });
    }
  },

  obtener: async (req, res) => {
    try {
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

  eliminar: async (req, res) => {
    try {
      await Usuario.delete(req.params.id, req.user.id);
      return res.json({ message: "Usuario eliminado." });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al eliminar usuario." });
    }
  },

  actualizar: async (req, res) => {
    try {
      const { nombre, apellido, correo, telefono, direccion, dni, parentesco } = req.body;
      const usuario = await Usuario.findById(req.params.id);
      if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });
      const u = new Usuario(usuario);

      const pool = require("../config/db");

      if (nombre !== undefined || apellido !== undefined || correo !== undefined) {
        const updates = [];
        const params = [];
        if (nombre !== undefined) { updates.push("nombre = ?"); params.push(nombre); }
        if (apellido !== undefined) { updates.push("apellido = ?"); params.push(apellido); }
        if (correo !== undefined) { updates.push("correo = ?"); params.push(correo); }
        params.push(req.params.id);
        await pool.query(
          "UPDATE Usuario SET " + updates.join(", ") + " WHERE idUsuario = ?",
          params
        );
      }

      if (usuario.rol === "APODERADO") {
        const updates = [];
        const params = [];
        if (telefono !== undefined) { updates.push("telefono = ?"); params.push(telefono); }
        if (direccion !== undefined) { updates.push("direccion = ?"); params.push(direccion); }
        if (parentesco !== undefined) {
          const VALID_PARENTESCOS = ['PADRE', 'MADRE', 'TUTOR', 'APODERADO LEGAL', 'OTRO'];
          if (!parentesco || !VALID_PARENTESCOS.includes(parentesco.toUpperCase())) {
            return res.status(400).json({ message: "El parentesco debe ser uno de: PADRE, MADRE, TUTOR, APODERADO LEGAL, OTRO" });
          }
          updates.push("parentesco = ?"); params.push(parentesco);
        }
        if (dni !== undefined) {
          const [dup] = await pool.query(
            "SELECT idApoderado FROM Apoderado WHERE dni = ? AND idUsuario != ?",
            [dni, req.params.id]
          );
          if (dup.length > 0) {
            return res.status(400).json({ message: "El DNI ya está registrado por otro usuario." });
          }
          updates.push("dni = ?");
          params.push(dni);
        }
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
        return res.status(400).json({ message: "La contraseña debe tener: " + errs.join(", ") + "." });
      }
      const pool = require("../config/db");
      const bcrypt = require("bcryptjs");
      const [rows] = await pool.query("SELECT contraseña FROM Usuario WHERE idUsuario = ?", [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado." });
      const ok = await bcrypt.compare(passwordActual, rows[0].contraseña);
      if (!ok) return res.status(400).json({ message: "Contraseña actual incorrecta." });
      const hashed = bcrypt.hashSync(passwordNuevo, 10);
      await pool.query("UPDATE Usuario SET contraseña = ? WHERE idUsuario = ?", [hashed, req.params.id]);
      return res.json({ message: "Contraseña actualizada." });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al cambiar contraseña." });
    }
  },

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
