// Usuario.js — clase base: iniciarSesion(), permisos por rol, CRUD básico
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

class Usuario {
  constructor(data = {}) {
    this.idUsuario = data.idUsuario || null;
    this.nombre = data.nombre || "";
    this.apellido = data.apellido || "";
    this.correo = data.correo || "";
    this.contrasena = data.contrasena || "";
    this.rol = data.rol || "";
    this.fechaRegistro = data.fechaRegistro || null;
  }

  // Iniciar sesión — validar credenciales (correo + contrasena)
  async iniciarSesion(correo, contrasena) {
    const [rows] = await pool.query(
      "SELECT * FROM Usuario WHERE correo = ?", [correo]
    );
    if (rows.length === 0) return null;
    const usuario = rows[0];
    const ok = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!ok) return null;
    return usuario;
  }

  cerrarSesion() {
    return true;
  }

  // Modificar datos del usuario (nombre, correo)
  async modificarDatos(nombre, correo) {
    await pool.query(
      "UPDATE Usuario SET nombre = ?, correo = ? WHERE idUsuario = ?",
      [nombre, correo, this.idUsuario]
    );
    this.nombre = nombre;
    this.correo = correo;
  }

  tienePermiso(accion) {
    const permisos = {
      ADMIN: ["crear", "leer", "actualizar", "eliminar", "reportes", "gestionar_vacantes"],
      APODERADO: ["crear", "leer", "matricular_hijo"],
    };
    return (permisos[this.rol] || []).includes(accion);
  }

  getId() { return this.idUsuario; }
  getRol() { return this.rol; }

  // Obtener usuario por ID
  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM Usuario WHERE idUsuario = ?", [id]);
    return rows.length ? rows[0] : null;
  }

  // Listar todos los usuarios (con JOIN a Apoderado)
  static async findAll() {
    const [rows] = await pool.query(`
      SELECT u.idUsuario AS id, u.nombre, u.apellido, u.correo,
             CASE WHEN u.rol = 'ADMIN' THEN 'Admin' ELSE 'Apoderado' END AS rol,
             a.dni, a.telefono, a.direccion, a.parentesco,
             u.fechaRegistro
      FROM Usuario u
      LEFT JOIN Apoderado a ON u.idUsuario = a.idUsuario
      ORDER BY u.idUsuario ASC
    `);
    return rows;
  }

  // Eliminar usuario por ID
  static async delete(id) {
    await pool.query("DELETE FROM Usuario WHERE idUsuario = ?", [id]);
  }
}

module.exports = Usuario;
