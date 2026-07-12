DROP DATABASE IF EXISTS sistema_matricula;
CREATE DATABASE sistema_matricula;
USE sistema_matricula;
SET NAMES utf8mb4;
-- =============================================
-- TABLAS
-- =============================================

CREATE TABLE Usuario(
    idUsuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    rol ENUM('ADMIN','APODERADO') NOT NULL,
    fechaRegistro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Admin(
    idAdmin INT AUTO_INCREMENT PRIMARY KEY,
    idUsuario INT NOT NULL UNIQUE,
    CONSTRAINT fk_admin_usuario
        FOREIGN KEY(idUsuario) REFERENCES Usuario(idUsuario)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Apoderado(
    idApoderado INT AUTO_INCREMENT PRIMARY KEY,
    idUsuario INT NOT NULL,
    dni CHAR(8) NOT NULL UNIQUE,
    telefono VARCHAR(15) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    parentesco ENUM('PADRE','MADRE','TUTOR','APODERADO LEGAL','OTRO') NOT NULL,
    CONSTRAINT fk_apoderado_usuario
        FOREIGN KEY(idUsuario) REFERENCES Usuario(idUsuario)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Alumno(
    idAlumno INT AUTO_INCREMENT PRIMARY KEY,
    idApoderado INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni CHAR(8) UNIQUE,
    fechaNacimiento DATE NOT NULL,
    genero ENUM('M','F') NOT NULL,
    CONSTRAINT fk_alumno_apoderado
        FOREIGN KEY(idApoderado) REFERENCES Apoderado(idApoderado)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Seccion(
    idSeccion INT AUTO_INCREMENT PRIMARY KEY,
    grado ENUM(
        '1° Secundaria','2° Secundaria','3° Secundaria',
        '4° Secundaria','5° Secundaria'
    ) NOT NULL,
    seccion ENUM('A','B','C','D') NOT NULL,
    capacidad INT NOT NULL DEFAULT 30,
    vacantes INT NOT NULL DEFAULT 30,
    UNIQUE (grado, seccion),
    CONSTRAINT chk_vacantes CHECK (vacantes >= 0 AND vacantes <= capacidad)
);

CREATE TABLE Matricula(
    idMatricula INT AUTO_INCREMENT PRIMARY KEY,
    idAlumno INT NOT NULL,
    idSeccion INT NOT NULL,
    idUsuario INT NOT NULL,
    periodoAcademico YEAR NOT NULL,
    estado ENUM('PENDIENTE','APROBADA','RECHAZADA') DEFAULT 'PENDIENTE',
    fechaRegistro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fechaEliminacion TIMESTAMP NULL DEFAULT NULL,
    eliminadoPor INT NULL DEFAULT NULL,
    CONSTRAINT fk_matricula_alumno
        FOREIGN KEY(idAlumno) REFERENCES Alumno(idAlumno)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_matricula_seccion
        FOREIGN KEY(idSeccion) REFERENCES Seccion(idSeccion)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_matricula_usuario
        FOREIGN KEY(idUsuario) REFERENCES Usuario(idUsuario)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Historial_Cambios(
    idHistorial INT AUTO_INCREMENT PRIMARY KEY,
    idMatricula INT NOT NULL,
    idUsuario INT NOT NULL,
    estadoAnterior ENUM('PENDIENTE','APROBADA','RECHAZADA') NOT NULL,
    estadoNuevo ENUM('PENDIENTE','APROBADA','RECHAZADA') NOT NULL,
    descripcion VARCHAR(255),
    fechaCambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_matricula
        FOREIGN KEY(idMatricula) REFERENCES Matricula(idMatricula)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_historial_usuario
        FOREIGN KEY(idUsuario) REFERENCES Usuario(idUsuario)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Los triggers se eliminaron porque Railway no los soporta.
-- La lógica de vacantes ahora se maneja desde Node.js
-- en Matricula.js (cambiarEstado, cambiarSeccion).

-- =============================================
-- DATOS: Usuarios
-- =============================================

-- Contraseña de todos: "123456" (bcrypt)
INSERT INTO Usuario(nombre, apellido, correo, contrasena, rol) VALUES
('Lucas',   'Gonzales',       'lucas@gmail.com',  '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'ADMIN'),
('Ana',     'Torres',         'ana@gmail.com',    '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'ADMIN'),
('Maria',   'Torres Vega',    'maria@gmail.com',  '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Rosa',    'Diaz Perez',     'rosa@gmail.com',   '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Luis',    'Mamani Quispe',  'luis@gmail.com',   '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Carmen',  'Gutierrez Rios', 'carmen@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Pedro',   'Huaman Condori', 'pedro@gmail.com',  '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO');

-- =============================================
-- DATOS: Admins
-- =============================================

INSERT INTO Admin(idUsuario) VALUES (1),(2);

-- =============================================
-- DATOS: Apoderados
-- =============================================

INSERT INTO Apoderado(idUsuario, dni, telefono, direccion, parentesco) VALUES
(3, '43218765', '987654321', 'Av. Lima 123',        'MADRE'),  -- idApoderado=1 (Maria)
(4, '74859632', '965874123', 'Jr. Arequipa 456',    'MADRE'),  -- idApoderado=2 (Rosa)
(5, '71589634', '954321876', 'Av. Peru 789',        'PADRE'),  -- idApoderado=3 (Luis)
(6, '12345678', '999111222', 'Av. Los Olivos 456',  'MADRE'),  -- idApoderado=4 (Carmen)
(7, '87654321', '999333444', 'Jr. Las Flores 789',  'PADRE');  -- idApoderado=5 (Pedro)

-- =============================================
-- DATOS: Alumnos
-- =============================================

INSERT INTO Alumno(idApoderado, nombre, apellido, dni, fechaNacimiento, genero) VALUES
-- Hijos de Maria (idApoderado=1)
(1, 'Luis Andres', 'Torres Vega',      '74251936', '2012-05-10', 'M'),
(1, 'Ana Sofia',   'Torres Vega',      '71839245', '2014-08-20', 'F'),
(1, 'Pedro',       'Torres Vega',      '76543210', '2011-06-15', 'M'),  -- sin matrícula

-- Hijos de Rosa (idApoderado=2)
(2, 'Carlos',      'Lopez Ramos',      '70491827', '2011-03-14', 'M'),
(2, 'Sofia',       'Lopez Ramos',      '70123456', '2012-12-01', 'F'),  -- sin matrícula

-- Hijos de Luis (idApoderado=3)
(3, 'Lucia',       'Fernandez Mamani', '73264519', '2010-09-25', 'F'),
(3, 'Diego',       'Ramos Mamani',     '78945123', '2013-11-02', 'M'),

-- Hijos de Carmen (idApoderado=4)
(4, 'Miguel Angel','Gutierrez Rios',   '11111111', '2013-02-10', 'M'),  -- sin matrícula
(4, 'Gabriela',    'Gutierrez Rios',   '22222222', '2014-07-22', 'F'),  -- sin matrícula

-- Hijos de Pedro (idApoderado=5)
(5, 'Jose',        'Huaman Quispe',    '33333333', '2012-11-05', 'M'),  -- sin matrícula
(5, 'Rosa',        'Huaman Quispe',    '44444444', '2015-04-18', 'F');  -- sin matrícula

-- =============================================
-- DATOS: Secciones (vacantes=capacidad=30 al inicio)
-- =============================================

INSERT INTO Seccion(grado, seccion, capacidad, vacantes) VALUES
('1° Secundaria','A',30,30), ('1° Secundaria','B',30,30),
('1° Secundaria','C',30,30), ('1° Secundaria','D',30,30),
('2° Secundaria','A',30,30), ('2° Secundaria','B',30,30),
('2° Secundaria','C',30,30), ('2° Secundaria','D',30,30),
('3° Secundaria','A',30,30), ('3° Secundaria','B',30,30),
('3° Secundaria','C',30,30), ('3° Secundaria','D',30,30),
('4° Secundaria','A',30,30), ('4° Secundaria','B',30,30),
('4° Secundaria','C',30,30), ('4° Secundaria','D',30,30),
('5° Secundaria','A',30,30), ('5° Secundaria','B',30,30),
('5° Secundaria','C',30,30), ('5° Secundaria','D',30,30);

-- =============================================
-- DATOS: Matrículas
-- El trigger descuenta vacantes automáticamente
-- al insertar con estado APROBADA
-- =============================================

INSERT INTO Matricula(idAlumno, idSeccion, idUsuario, periodoAcademico, estado) VALUES
(1,  1, 3, 2026, 'APROBADA'),   -- Luis Andres  → 1°A  (trigger: vacantes 30→29)
(2,  6, 3, 2026, 'PENDIENTE'),  -- Ana Sofia    → 2°B  (sin cambio)
(4,  9, 3, 2026, 'APROBADA'),   -- Carlos       → 3°A  (trigger: vacantes 30→29)
(6, 13, 1, 2026, 'APROBADA'),   -- Lucia        → 4°A  (trigger: vacantes 30→29)
(7, 17, 2, 2026, 'RECHAZADA');  -- Diego        → 5°A  (sin cambio)

-- =============================================
-- DATOS: Historial
-- =============================================

INSERT INTO Historial_Cambios(idMatricula, idUsuario, estadoAnterior, estadoNuevo, descripcion) VALUES
(1, 1, 'PENDIENTE', 'APROBADA',  'Matricula validada por el administrador'),
(2, 1, 'PENDIENTE', 'PENDIENTE', 'Matricula en revisión'),
(5, 2, 'PENDIENTE', 'RECHAZADA', 'Documentación incompleta');

-- =============================================
-- CORRECCIÓN: Ajustar vacantes reales
-- (reemplaza a los triggers que se eliminaron)
-- =============================================

SET SQL_SAFE_UPDATES = 0;

UPDATE Seccion s
SET s.vacantes = s.capacidad - (
    SELECT COALESCE(COUNT(*), 0) FROM Matricula m
    WHERE m.idSeccion = s.idSeccion
    AND m.estado = 'APROBADA'
    AND m.periodoAcademico = YEAR(CURDATE())
);

SET SQL_SAFE_UPDATES = 1;

SELECT 
    m.idMatricula,
    CONCAT(al.nombre, ' ', al.apellido) AS alumno,
    CONCAT(s.grado, ' - ', s.seccion) AS seccion,
    m.periodoAcademico,
    m.estado,
    m.fechaRegistro,
    m.fechaEliminacion,
    CONCAT(u.nombre, ' ', u.apellido) AS eliminadoPor
FROM Matricula m
JOIN Alumno al ON m.idAlumno = al.idAlumno
JOIN Seccion s ON m.idSeccion = s.idSeccion
LEFT JOIN Usuario u ON m.eliminadoPor = u.idUsuario
ORDER BY m.idMatricula;