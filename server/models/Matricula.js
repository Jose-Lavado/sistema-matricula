// Matricula.js — núcleo: registrar, cambiar estado, manejar vacantes + historial + notificaciones
const pool = require("../config/db");
const HistorialCambio = require("./HistorialCambio");
const notificador = require("../services/Notificador");

class Matricula {
  constructor(data = {}) {
    this.idMatricula = data.idMatricula || data.id || null;
    this.idAlumno = data.idAlumno || null;
    this.idSeccion = data.idSeccion || null;
    this.idUsuario = data.idUsuario || null;
    this.periodoAcademico = data.periodoAcademico || new Date().getFullYear();
    this.estado = data.estado || "PENDIENTE";
    this.fechaRegistro = data.fechaRegistro || data.fecha || null;
  }

  async registrar(idAlumno, grado, idSeccion) {
    const Seccion = require("./Seccion");
    if (!idSeccion) {
      const sec = await Seccion.asignarAutomatico(grado, idAlumno);
      if (!sec) throw new Error("No hay vacantes disponibles");
      idSeccion = sec.idSeccion;
    } else {
      const [sec] = await pool.query(
        "SELECT * FROM Seccion WHERE idSeccion = ?", [idSeccion]
      );
      if (!sec.length) throw new Error("La sección no existe.");
    }

    const [result] = await pool.query(
      `INSERT INTO Matricula (idAlumno, idSeccion, idUsuario, periodoAcademico, estado)
       VALUES (?, ?, ?, YEAR(CURDATE()), 'PENDIENTE')`,
      [idAlumno, idSeccion, this.idUsuario]
    );
    this.idMatricula = result.insertId;

    const hist = new HistorialCambio();
    await hist.registrarCambio(this.idMatricula, this.idUsuario, "PENDIENTE", "PENDIENTE", "Matrícula registrada");

    notificador.notificar("matricula_creada", {
      idMatricula: this.idMatricula,
      estado: "PENDIENTE",
    });

    return this.idMatricula;
  }

  async actualizar(datos) {
    const campos = Object.keys(datos).filter(k => k !== "idMatricula").map(k => `${k} = ?`).join(", ");
    const valores = Object.keys(datos).filter(k => k !== "idMatricula").map(k => datos[k]);
    await pool.query(
      `UPDATE Matricula SET ${campos} WHERE idMatricula = ?`,
      [...valores, this.idMatricula]
    );
    Object.assign(this, datos);
  }

  async cambiarSeccion(nuevoIdSeccion) {
    const [sec] = await pool.query("SELECT * FROM Seccion WHERE idSeccion = ? AND vacantes > 0", [nuevoIdSeccion]);
    if (!sec.length) throw new Error("No hay vacantes disponibles");

    // Si está APROBADA, devolver vacante de la sección anterior y descontar de la nueva
    if (this.estado === 'APROBADA') {
      await pool.query(
        "UPDATE Seccion SET vacantes = vacantes + 1 WHERE idSeccion = ?",
        [this.idSeccion]
      );
      await pool.query(
        "UPDATE Seccion SET vacantes = vacantes - 1 WHERE idSeccion = ? AND vacantes > 0",
        [nuevoIdSeccion]
      );
    }

    await pool.query("UPDATE Matricula SET idSeccion = ? WHERE idMatricula = ?", [nuevoIdSeccion, this.idMatricula]);
    this.idSeccion = nuevoIdSeccion;
  }

  async eliminar(idMatricula, idUsuarioAdmin) {
    const [rows] = await pool.query(
      "SELECT estado, idAlumno, idUsuario FROM Matricula WHERE idMatricula = ? AND fechaEliminacion IS NULL", [idMatricula]
    );
    if (rows.length === 0) throw new Error("Matrícula no encontrada.");
    if (rows[0].estado === "APROBADA") {
      throw new Error("No se puede eliminar una matrícula con estado APROBADA.");
    }
    const { idAlumno } = rows[0];

    const [alumno] = await pool.query(
      "SELECT nombre, apellido, idApoderado FROM Alumno WHERE idAlumno = ?", [idAlumno]
    );

    await pool.query(
      "UPDATE Matricula SET fechaEliminacion = NOW(), eliminadoPor = ? WHERE idMatricula = ?",
      [idUsuarioAdmin || null, idMatricula]
    );

    if (alumno.length) {
      const [apo] = await pool.query(
        "SELECT idUsuario FROM Apoderado WHERE idApoderado = ?", [alumno[0].idApoderado]
      );
      notificador.notificar("matricula_eliminada", {
        alumnoNombre: `${alumno[0].nombre} ${alumno[0].apellido}`,
        idUsuarioApoderado: apo.length ? apo[0].idUsuario : null,
      });
    }
  }

  async restaurar(idMatricula) {
    const [rows] = await pool.query(
      "SELECT idMatricula FROM Matricula WHERE idMatricula = ? AND fechaEliminacion IS NOT NULL", [idMatricula]
    );
    if (rows.length === 0) throw new Error("Matrícula no encontrada o no está eliminada.");
    await pool.query(
      "UPDATE Matricula SET fechaEliminacion = NULL, eliminadoPor = NULL WHERE idMatricula = ?",
      [idMatricula]
    );
  }

  async eliminarFisicamente(idMatricula) {
    const [rows] = await pool.query(
      "SELECT idMatricula FROM Matricula WHERE idMatricula = ? AND fechaEliminacion IS NOT NULL", [idMatricula]
    );
    if (rows.length === 0) throw new Error("Matrícula no encontrada o no está eliminada.");
    await pool.query("DELETE FROM Matricula WHERE idMatricula = ?", [idMatricula]);
  }

  static async consultar(idMatricula) {
    const [rows] = await pool.query(
      `SELECT m.idMatricula AS id,
              m.idSeccion,
              CONCAT(al.nombre, ' ', al.apellido) AS alumno,
              al.dni AS dni_alumno,
              al.fechaNacimiento,
              s.grado, s.seccion,
              m.fechaRegistro AS fecha,
              m.estado,
              CONCAT(u.nombre, ' ', u.apellido) AS apoderado,
              ap.dni AS apoderado_dni
       FROM Matricula m
       JOIN Alumno al ON m.idAlumno = al.idAlumno
       JOIN Seccion s ON m.idSeccion = s.idSeccion
       JOIN Apoderado ap ON al.idApoderado = ap.idApoderado
       JOIN Usuario u ON ap.idUsuario = u.idUsuario
       WHERE m.idMatricula = ?`, [idMatricula]
    );
    return rows.length ? rows[0] : null;
  }

  async validar() {
    return this.estado === "PENDIENTE";
  }

  generarFicha() {
    return {
      idMatricula: this.idMatricula,
      periodo: this.periodoAcademico,
      estado: this.estado,
      fecha: this.fechaRegistro,
    };
  }

  async cambiarEstado(nuevoEstado, idUsuario, descripcion) {
    const anterior = this.estado;

    // Descontar/devover vacantes según cambio de estado
    if (nuevoEstado === 'APROBADA' && anterior !== 'APROBADA') {
      await pool.query(
        "UPDATE Seccion SET vacantes = vacantes - 1 WHERE idSeccion = ? AND vacantes > 0",
        [this.idSeccion]
      );
    } else if (anterior === 'APROBADA' && nuevoEstado !== 'APROBADA') {
      await pool.query(
        "UPDATE Seccion SET vacantes = vacantes + 1 WHERE idSeccion = ?",
        [this.idSeccion]
      );
    }

    await pool.query(
      "UPDATE Matricula SET estado = ? WHERE idMatricula = ?",
      [nuevoEstado, this.idMatricula]
    );
    this.estado = nuevoEstado;

    const hist = new HistorialCambio();
    await hist.registrarCambio(this.idMatricula, idUsuario, anterior, nuevoEstado, descripcion);

    notificador.notificar("matricula_estado", {
      idMatricula: this.idMatricula,
      estadoAnterior: anterior,
      estadoNuevo: nuevoEstado,
      descripcion,
    });
  }

  async obtenerHistorialCambios() {
    return await HistorialCambio.obtenerPorMatricula(this.idMatricula);
  }

  static async findAll(filtros = {}) {
    const selectColumns = `m.idMatricula AS id,
      CONCAT(al.nombre, ' ', al.apellido) AS alumno,
      al.dni AS dni_alumno,
      s.grado, s.seccion,
      m.fechaRegistro AS fecha,
      m.estado,
      CONCAT(u.nombre, ' ', u.apellido) AS apoderado`;

    const joins = `FROM Matricula m
      JOIN Alumno al ON m.idAlumno = al.idAlumno
      JOIN Seccion s ON m.idSeccion = s.idSeccion
      JOIN Apoderado ap ON al.idApoderado = ap.idApoderado
      JOIN Usuario u ON ap.idUsuario = u.idUsuario`;

    const where = [];
    const params = [];

    if (filtros.grado) { where.push("s.grado = ?"); params.push(filtros.grado); }
    if (filtros.seccion) { where.push("s.seccion = ?"); params.push(filtros.seccion); }
    if (filtros.estado) { where.push("m.estado = ?"); params.push(filtros.estado); }
    if (filtros.search) { where.push("(CONCAT(al.nombre, ' ', al.apellido) LIKE ? OR al.dni LIKE ? OR CONCAT(u.nombre, ' ', u.apellido) LIKE ? OR ap.dni LIKE ?)"); params.push(`%${filtros.search}%`, `%${filtros.search}%`, `%${filtros.search}%`, `%${filtros.search}%`); }
    if (filtros.fecha) { where.push("DATE(m.fechaRegistro) = ?"); params.push(filtros.fecha); }
    if (filtros.alumno_id) { where.push("m.idAlumno = ?"); params.push(filtros.alumno_id); }
    if (filtros.anio) { where.push("m.periodoAcademico = ?"); params.push(filtros.anio); }
    if (!filtros.incluirEliminadas) { where.push("m.fechaEliminacion IS NULL"); }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const dir = filtros.order && filtros.order.toUpperCase() === "ASC" ? "ASC" : "DESC";
    const orderClause = "ORDER BY m.idMatricula " + dir;

    const countSql = `SELECT COUNT(*) AS total ${joins} ${whereClause}`;
    const [countRows] = await pool.query(countSql, [...params]);
    const total = countRows[0].total;
    const limit = filtros.limit || 999999;
    const offset = filtros.offset || 0;
    const totalPages = Math.ceil(total / limit);

    let dataSql = `SELECT ${selectColumns} ${joins} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(dataSql, [...params, limit, offset]);

    return { data: rows, totalPages };
  }

  static async getStats(periodo, grado, seccion) {
    const anio = periodo || new Date().getFullYear();
    const GRADOS_VALIDOS = ["1° Secundaria","2° Secundaria","3° Secundaria","4° Secundaria","5° Secundaria"];
    const SECCIONES_VALIDAS = ["A","B","C","D"];
    const gradoFiltro = GRADOS_VALIDOS.includes(grado) ? grado : null;
    const seccionFiltro = SECCIONES_VALIDAS.includes(seccion) ? seccion : null;
    const needJoin = gradoFiltro || seccionFiltro;

    const extraJoin = needJoin ? " JOIN Seccion s ON m.idSeccion = s.idSeccion" : "";
    const extraWhere = [];
    const extraParams = [];
    if (gradoFiltro) { extraWhere.push(" AND s.grado = ?"); extraParams.push(gradoFiltro); }
    if (seccionFiltro) { extraWhere.push(" AND s.seccion = ?"); extraParams.push(seccionFiltro); }
    const extraWhereStr = extraWhere.join("");
    const baseParams = [anio, ...extraParams];

    const buildQuery = (estadoFilter) => {
      return `SELECT COUNT(*) AS total FROM Matricula m${extraJoin} WHERE m.estado ${estadoFilter} AND m.periodoAcademico = ? AND m.fechaEliminacion IS NULL${extraWhereStr}`;
    };

    const [[totalRow]] = await pool.query(buildQuery("IN ('APROBADA','PENDIENTE','RECHAZADA')"), baseParams);
    const [[aprobadasRow]] = await pool.query(buildQuery("= 'APROBADA'"), baseParams);
    const [[pendientesRow]] = await pool.query(buildQuery("= 'PENDIENTE'"), baseParams);
    const [[rechazadasRow]] = await pool.query(buildQuery("= 'RECHAZADA'"), baseParams);

    const [[alumnosRow]] = await pool.query(
      `SELECT COUNT(DISTINCT m.idAlumno) AS total FROM Matricula m${extraJoin} WHERE m.periodoAcademico = ? AND m.fechaEliminacion IS NULL${extraWhereStr}`,
      baseParams
    );

    return {
      total_matriculas: totalRow.total,
      aprobadas: aprobadasRow.total,
      pendientes: pendientesRow.total,
      rechazadas: rechazadasRow.total,
      total_alumnos: alumnosRow.total,
    };
  }

  static async getEliminadas(periodo) {
    const [rows] = await pool.query(`
      SELECT m.idMatricula,
             CONCAT(al.nombre, ' ', al.apellido) AS alumno,
             m.estado AS estadoAnterior,
             m.fechaRegistro,
             m.fechaEliminacion,
             CONCAT(u.nombre, ' ', u.apellido) AS eliminadoPorNombre
      FROM Matricula m
      JOIN Alumno al ON m.idAlumno = al.idAlumno
      LEFT JOIN Usuario u ON m.eliminadoPor = u.idUsuario
      WHERE m.fechaEliminacion IS NOT NULL
        AND m.periodoAcademico = ?
      ORDER BY m.fechaEliminacion DESC
    `, [periodo]);
    return rows;
  }

  static async getProductividad(periodo, fechaDesde, fechaHasta) {
    const params = [];
    let fechaWhere = "";
    if (fechaDesde && fechaHasta) {
      fechaWhere = "AND hc.fechaCambio BETWEEN ? AND ?";
      params.push(fechaDesde, fechaHasta + " 23:59:59");
    } else if (fechaDesde) {
      fechaWhere = "AND hc.fechaCambio >= ?";
      params.push(fechaDesde);
    } else if (fechaHasta) {
      fechaWhere = "AND hc.fechaCambio <= ?";
      params.push(fechaHasta + " 23:59:59");
    }
    params.push(periodo);
    const [rows] = await pool.query(`
      SELECT u.idUsuario,
             CONCAT(u.nombre, ' ', u.apellido) AS admin,
             COUNT(DISTINCT hc.idMatricula) AS total,
             COUNT(DISTINCT CASE WHEN m.estado = 'APROBADA' THEN hc.idMatricula END) AS aprobadas,
             COUNT(DISTINCT CASE WHEN m.estado = 'PENDIENTE' THEN hc.idMatricula END) AS pendientes,
             COUNT(DISTINCT CASE WHEN m.estado = 'RECHAZADA' THEN hc.idMatricula END) AS rechazadas
      FROM Usuario u
      LEFT JOIN Historial_Cambios hc ON hc.idUsuario = u.idUsuario
        ${fechaWhere}
      LEFT JOIN Matricula m ON m.idMatricula = hc.idMatricula
        AND m.periodoAcademico = ?
        AND m.fechaEliminacion IS NULL
      WHERE u.rol = 'ADMIN'
      GROUP BY u.idUsuario
      ORDER BY total DESC
    `, params);
    return rows;
  }

  static async getCumplimiento(periodo) {
    const [rows] = await pool.query(`
      SELECT c.grado,
             COALESCE(m.realizadas, 0) AS realizadas,
             c.capacidad,
             ROUND(COALESCE(m.realizadas, 0) / c.capacidad * 100, 1) AS porcentaje
      FROM (
        SELECT grado, SUM(capacidad) AS capacidad
        FROM Seccion
        GROUP BY grado
      ) c
      LEFT JOIN (
        SELECT s.grado, COUNT(*) AS realizadas
        FROM Matricula m
        JOIN Seccion s ON m.idSeccion = s.idSeccion
        WHERE m.estado = 'APROBADA'
          AND m.fechaEliminacion IS NULL
          AND m.periodoAcademico = ?
        GROUP BY s.grado
      ) m ON c.grado = m.grado
      ORDER BY c.grado
    `, [periodo]);
    return rows;
  }


}

module.exports = Matricula;
