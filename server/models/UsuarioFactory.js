// UsuarioFactory.js — crea Admin o Apoderado según rol (patrón Factory)
const Usuario = require("./Usuario");
const Admin = require("./Admin");
const Apoderado = require("./Apoderado");
const pool = require("../config/db");

class UsuarioFactory {
  // Crear instancia de Admin o Apoderado según rol (Factory)
  static crearUsuario(rol, datos) {
    if (!UsuarioFactory.validarRol(rol)) {
      throw new Error(`Rol no válido: ${rol}`);
    }
    switch (rol) {
      case "ADMIN":
        return new Admin(datos);
      case "APODERADO":
        return new Apoderado(datos);
      default:
        throw new Error(`Rol no implementado: ${rol}`);
    }
  }

  // Validar que el rol sea ADMIN o APODERADO
  static validarRol(rol) {
    return ["ADMIN", "APODERADO"].includes(rol);
  }

  // Iniciar sesión — verifica credenciales, devuelve instancia con datos extra según rol
  static async login(correo, contrasena) {
    const [rows] = await pool.query(
      "SELECT * FROM Usuario WHERE correo = ?", [correo]
    );
    if (rows.length === 0) return null;

    const usuario = rows[0];
    const bcrypt = require("bcryptjs");

    const ok = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!ok) return null;

    const userInstance = UsuarioFactory.crearUsuario(usuario.rol, usuario);
    userInstance.idUsuario = usuario.idUsuario;

    if (usuario.rol === "ADMIN") {
      const [adminRows] = await pool.query(
        "SELECT idAdmin FROM Admin WHERE idUsuario = ?", [usuario.idUsuario]
      );
      if (adminRows.length) userInstance.idAdmin = adminRows[0].idAdmin;
    } else if (usuario.rol === "APODERADO") {
      const [apoRows] = await pool.query(
        "SELECT idApoderado, dni, telefono, direccion, parentesco FROM Apoderado WHERE idUsuario = ?",
        [usuario.idUsuario]
      );
      if (apoRows.length) {
        userInstance.idApoderado = apoRows[0].idApoderado;
        userInstance.dni = apoRows[0].dni;
        userInstance.telefono = apoRows[0].telefono;
        userInstance.direccion = apoRows[0].direccion;
        userInstance.parentesco = apoRows[0].parentesco;
      }
    }

    return userInstance;
  }
}

module.exports = UsuarioFactory;
