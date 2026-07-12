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
    dni CHAR(8) NOT NULL UNIQUE,
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
-- La logica de vacantes se maneja desde Node.js (Matricula.js).

-- =============================================
-- DATOS: Usuarios (5 ADMIN + 55 APODERADOS)
-- Contrasena de todos: "123456" (bcrypt)
-- =============================================
INSERT INTO Usuario(nombre, apellido, correo, contrasena, rol) VALUES
('Jose', 'Lavado Yañez', 'jose@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'ADMIN'),
('Sergio', 'Hancco Machaca', 'sergio@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'ADMIN'),
('Josue', 'Olivera Llantoy', 'josue@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'ADMIN'),
('Alexander', 'Candia Garcia', 'alexander@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'ADMIN'),
('Xiomara', 'Durand Quispe', 'xiomara@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'ADMIN'),
('Estrella', 'Fernandez Sanchez', 'estrellafernandez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Norma', 'Vilca Ramos', 'normavilca@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Hugo', 'Ramos Quispe', 'hugoramos@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Enrique', 'Vilca Apaza', 'enriquevilca@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Lucia', 'Palacios Salazar', 'luciapalacios@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Lucia', 'Cordova Zavala', 'luciacordova@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Karina', 'Campos Sanchez', 'karinacampos@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Milagros', 'Fernandez Ortiz', 'milagrosfernandez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Pilar', 'Vega Choque', 'pilarvega@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Katherine', 'Herrera Aguilar', 'katherineherrera@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Pilar', 'Vilca Reyes', 'pilarvilca@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Julia', 'Condori Yupanqui', 'juliacondori@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Brigitte', 'Alvarez Vilca', 'brigittealvarez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Sebastian', 'Rojas Medina', 'sebastianrojas@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Gabriela', 'Chavez Zavala', 'gabrielachavez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Norma', 'Herrera Silva', 'normaherrera@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Grecia', 'Yupanqui Espinoza', 'greciayupanqui@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Bruno', 'Torres Choque', 'brunotorres@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Cesar', 'Ortiz Bravo', 'cesarortiz@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Norma', 'Huaman Paredes', 'normahuaman@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Katherine', 'Mamani Vargas', 'katherinemamani@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Veronica', 'Gutierrez Nunez', 'veronicagutierrez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Claudia', 'Espinoza Ortiz', 'claudiaespinoza@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Elena', 'Castillo Medina', 'elenacastillo@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Yolanda', 'Huaman Perez', 'yolandahuaman@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Ruth', 'Ramirez Ortiz', 'ruthramirez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Gabriela', 'Zavala Castillo', 'gabrielazavala@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Rosa', 'Aguilar Vega', 'rosaaguilar@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Jorge', 'Palacios Yupanqui', 'jorgepalacios@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Milagros', 'Quispe Palacios', 'milagrosquispe@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Diana', 'Huaman Bravo', 'dianahuaman@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Grecia', 'Delgado Gonzales', 'greciadelgado@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Gabriela', 'Rojas Carrasco', 'gabrielarojas@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Hugo', 'Quispe Castillo', 'hugoquispe@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Carlos', 'Ramirez Lopez', 'carlosramirez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Claudia', 'Nunez Bravo', 'claudianunez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Yolanda', 'Nunez Gonzales', 'yolandanunez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Veronica', 'Perez Vasquez', 'veronicaperez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Julia', 'Yupanqui Vega', 'juliayupanqui@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Claudia', 'Vilca Carrasco', 'claudiavilca@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Milagros', 'Cordova Flores', 'milagroscordova@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Antonella', 'Quispe Choque', 'antonellaquispe@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Teresa', 'Torres Mamani', 'teresatorres@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Antonella', 'Ramirez Cardenas', 'antonellaramirez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Melissa', 'Fernandez Palacios', 'melissafernandez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Andres', 'Rodriguez Cruz', 'andresrodriguez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Solange', 'Yupanqui Palacios', 'solangeyupanqui@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Gonzalo', 'Gutierrez Gonzales', 'gonzalogutierrez@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Lucia', 'Flores Chavez', 'luciaflores@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Pilar', 'Rojas Delgado', 'pilarrojas@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Estrella', 'Espinoza Paredes', 'estrellaespinoza@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Ana', 'Ponce Cardenas', 'anaponce@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Veronica', 'Condori Rodriguez', 'veronicacondori@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Ruth', 'Campos Apaza', 'ruthcampos@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO'),
('Melissa', 'Cruz Huaman', 'melissacruz@gmail.com', '$2b$10$XrOWuzpTtWBD1VFOzkopHehaL0iyj2fMlMDsJv0pzf6hJCX6F8Z32', 'APODERADO');

-- =============================================
-- DATOS: Admins
-- =============================================
INSERT INTO Admin(idUsuario) VALUES (1),(2),(3),(4),(5);

-- =============================================
-- DATOS: Apoderados
-- =============================================
INSERT INTO Apoderado(idUsuario, dni, telefono, direccion, parentesco) VALUES
(6, '24282218', '948932528', 'Av. Bravo 431', 'TUTOR'),
(7, '51837852', '965787133', 'Av. Medina 121', 'TUTOR'),
(8, '23009833', '965667010', 'Psje. Apaza 447', 'APODERADO LEGAL'),
(9, '84593961', '972343098', 'Av. Yupanqui 421', 'PADRE'),
(10, '64193837', '919399091', 'Psje. Carrasco 697', 'MADRE'),
(11, '23419256', '918384251', 'Jr. Cruz 391', 'MADRE'),
(12, '75569635', '940164005', 'Jr. Ponce 368', 'MADRE'),
(13, '13326769', '925634216', 'Av. Vasquez 327', 'APODERADO LEGAL'),
(14, '68526649', '908835615', 'Calle Carrasco 968', 'MADRE'),
(15, '69345683', '938721489', 'Calle Mamani 938', 'MADRE'),
(16, '76354180', '963201632', 'Psje. Diaz 670', 'MADRE'),
(17, '73709724', '974348734', 'Psje. Perez 830', 'MADRE'),
(18, '12621534', '996705466', 'Jr. Rodriguez 324', 'MADRE'),
(19, '60885459', '946417080', 'Calle Vargas 765', 'PADRE'),
(20, '60372847', '963193149', 'Av. Zavala 901', 'MADRE'),
(21, '89520597', '945314737', 'Psje. Medina 129', 'TUTOR'),
(22, '54398056', '957444313', 'Calle Gutierrez 860', 'MADRE'),
(23, '81690398', '924008427', 'Av. Torres 687', 'PADRE'),
(24, '90010790', '993867749', 'Psje. Chavez 682', 'PADRE'),
(25, '29090631', '910249947', 'Av. Herrera 805', 'MADRE'),
(26, '87201917', '990490278', 'Psje. Paredes 285', 'MADRE'),
(27, '79067939', '908760385', 'Psje. Ponce 552', 'MADRE'),
(28, '22510327', '931712748', 'Calle Ortiz 954', 'MADRE'),
(29, '84077101', '986753396', 'Jr. Ortiz 144', 'MADRE'),
(30, '73013961', '945961586', 'Calle Ponce 835', 'APODERADO LEGAL'),
(31, '85957578', '922219693', 'Psje. Alvarez 246', 'MADRE'),
(32, '87149951', '944064090', 'Psje. Flores 894', 'MADRE'),
(33, '87789079', '952145623', 'Jr. Cardenas 997', 'MADRE'),
(34, '45186708', '996513709', 'Calle Cordova 326', 'PADRE'),
(35, '59302863', '985064317', 'Av. Carrasco 317', 'APODERADO LEGAL'),
(36, '10380581', '942284210', 'Jr. Torres 466', 'MADRE'),
(37, '18163847', '976617711', 'Calle Bravo 251', 'MADRE'),
(38, '44210729', '952711116', 'Av. Yupanqui 856', 'MADRE'),
(39, '84660688', '951493689', 'Av. Bravo 773', 'PADRE'),
(40, '60491958', '967525459', 'Av. Diaz 259', 'PADRE'),
(41, '17352710', '903432445', 'Av. Torres 609', 'MADRE'),
(42, '53589647', '929751613', 'Psje. Alvarez 510', 'MADRE'),
(43, '69352161', '944905814', 'Psje. Aguilar 138', 'MADRE'),
(44, '70362235', '993597820', 'Psje. Quispe 930', 'PADRE'),
(45, '62607710', '929148652', 'Av. Delgado 786', 'APODERADO LEGAL'),
(46, '70254091', '938347359', 'Psje. Herrera 887', 'MADRE'),
(47, '79244185', '914124782', 'Psje. Mamani 327', 'MADRE'),
(48, '12550658', '943289861', 'Calle Salazar 408', 'MADRE'),
(49, '78092370', '988067065', 'Calle Yupanqui 116', 'MADRE'),
(50, '72360629', '972217043', 'Av. Ramos 142', 'APODERADO LEGAL'),
(51, '79696025', '941616928', 'Calle Rojas 205', 'PADRE'),
(52, '31473054', '902970213', 'Calle Cruz 492', 'MADRE'),
(53, '34970946', '978681447', 'Jr. Cordova 392', 'PADRE'),
(54, '31139996', '925831323', 'Psje. Gonzales 469', 'MADRE'),
(55, '19954260', '977852892', 'Jr. Silva 614', 'MADRE'),
(56, '26800072', '949818299', 'Jr. Condori 774', 'MADRE'),
(57, '48879071', '947364710', 'Jr. Aguilar 525', 'MADRE'),
(58, '79085198', '977470168', 'Psje. Salazar 320', 'MADRE'),
(59, '59093843', '965060983', 'Calle Espinoza 395', 'MADRE'),
(60, '36717096', '998680002', 'Calle Vasquez 631', 'MADRE');

-- =============================================
-- DATOS: Alumnos (100)
-- =============================================
INSERT INTO Alumno(idApoderado, nombre, apellido, dni, fechaNacimiento, genero) VALUES
(1, 'Claudia Milagros', 'Fernandez Zavala', '70000001', '2009-01-04', 'F'),
(1, 'Ricardo', 'Fernandez Espinoza', '80823176', '2010-02-25', 'M'),
(2, 'Jose', 'Vilca Diaz', '14216175', '2012-10-08', 'M'),
(2, 'Beatriz Valentina', 'Vilca Apaza', '70000002', '2011-09-08', 'F'),
(3, 'Alonso', 'Ramos Silva', '72092888', '2013-04-07', 'M'),
(3, 'Miguel', 'Ramos Cardenas', '22517517', '2010-08-26', 'M'),
(3, 'Karina', 'Ramos Diaz', '10289289', '2014-07-16', 'F'),
(4, 'Ximena', 'Vilca Ramirez', '78159587', '2014-01-19', 'F'),
(5, 'Milagros Valentina', 'Palacios Carrasco', '71367643', '2009-05-07', 'F'),
(6, 'Cecilia', 'Cordova Delgado', '99639081', '2013-08-27', 'F'),
(6, 'Juan', 'Cordova Huaman', '91178885', '2013-03-09', 'M'),
(7, 'Julia Lucia', 'Campos Vilca', '70000003', '2014-12-15', 'F'),
(7, 'Ivan Rodrigo', 'Campos Cruz', '15354599', '2009-10-18', 'M'),
(7, 'Adrian', 'Campos Ortiz', '70000004', '2014-11-08', 'M'),
(8, 'Diana Silvia', 'Fernandez Nunez', '19317495', '2012-08-12', 'F'),
(8, 'Norma Ana', 'Fernandez Gutierrez', '45059710', '2012-11-17', 'F'),
(8, 'Alejandra', 'Fernandez Rojas', '78642041', '2011-01-04', 'F'),
(9, 'Yolanda Yesenia', 'Vega Espinoza', '66431351', '2010-12-10', 'F'),
(9, 'Solange', 'Vega Torres', '38210242', '2010-10-19', 'F'),
(10, 'Alberto Diego', 'Herrera Salazar', '70000005', '2013-11-10', 'M'),
(11, 'Enrique', 'Vilca Espinoza', '69401199', '2012-02-15', 'M'),
(12, 'Veronica', 'Condori Mamani', '41039390', '2011-04-09', 'F'),
(12, 'Renato', 'Condori Cardenas', '18357162', '2013-12-07', 'M'),
(13, 'Gabriel Nicolas', 'Alvarez Apaza', '72732043', '2012-07-16', 'M'),
(13, 'Pedro', 'Alvarez Rios', '34391257', '2014-07-19', 'M'),
(14, 'Cesar Carlos', 'Rojas Cordova', '26941092', '2013-11-02', 'M'),
(14, 'Estrella', 'Rojas Condori', '25372341', '2011-10-07', 'F'),
(15, 'Antonella Melissa', 'Chavez Torres', '75793759', '2013-06-18', 'F'),
(15, 'Camila', 'Chavez Apaza', '97302916', '2009-06-21', 'F'),
(16, 'Karina Estrella', 'Herrera Medina', '90014570', '2011-06-06', 'F'),
(16, 'Cesar', 'Herrera Rodriguez', '42255732', '2010-09-07', 'M'),
(16, 'Pedro Nicolas', 'Herrera Vilca', '99115205', '2010-08-26', 'M'),
(17, 'Paola', 'Yupanqui Ramirez', '23492385', '2013-04-07', 'F'),
(18, 'Melissa Carmen', 'Torres Campos', '70000006', '2011-08-16', 'F'),
(18, 'Lucia', 'Torres Palacios', '30024960', '2014-02-13', 'F'),
(19, 'Victor', 'Ortiz Campos', '31079846', '2010-10-24', 'M'),
(19, 'Luis', 'Ortiz Vilca', '49092160', '2014-09-03', 'M'),
(19, 'Ines Diana', 'Ortiz Campos', '93893865', '2012-05-23', 'F'),
(20, 'Ximena', 'Huaman Aguilar', '15350023', '2010-12-13', 'F'),
(21, 'Sofia', 'Mamani Ortiz', '99943797', '2012-11-27', 'F'),
(21, 'Yesenia', 'Mamani Nunez', '83832717', '2014-06-14', 'F'),
(22, 'Martin', 'Gutierrez Vilca', '13874790', '2011-04-09', 'M'),
(23, 'Julia Silvia', 'Espinoza Bravo', '28321839', '2013-08-08', 'F'),
(23, 'Maria Claudia', 'Espinoza Alvarez', '98575748', '2012-07-11', 'F'),
(24, 'Brigitte', 'Castillo Delgado', '70000007', '2010-12-16', 'F'),
(24, 'Gabriela', 'Castillo Aguilar', '71327848', '2011-03-17', 'F'),
(25, 'Cesar', 'Huaman Flores', '70000008', '2011-09-02', 'M'),
(25, 'Julio Rodrigo', 'Huaman Gonzales', '17532195', '2010-02-25', 'M'),
(26, 'Ines Maria', 'Ramirez Herrera', '70000009', '2011-08-21', 'F'),
(26, 'Ruth', 'Ramirez Herrera', '36738452', '2011-08-12', 'F'),
(27, 'Diana', 'Zavala Cordova', '98473848', '2012-10-26', 'F'),
(28, 'Daniela Teresa', 'Aguilar Flores', '55461591', '2010-09-17', 'F'),
(28, 'Nicolas', 'Aguilar Espinoza', '62958901', '2010-02-05', 'M'),
(29, 'Claudia', 'Palacios Gutierrez', '14994527', '2014-11-27', 'F'),
(29, 'Alonso Enrique', 'Palacios Cruz', '82503409', '2009-02-04', 'M'),
(29, 'Oscar', 'Palacios Paredes', '59731689', '2014-07-21', 'M'),
(30, 'Milagros', 'Quispe Zavala', '84384510', '2010-01-26', 'F'),
(31, 'Andres Ricardo', 'Huaman Yupanqui', '25253751', '2010-10-11', 'M'),
(31, 'Ximena', 'Huaman Aguilar', '92558242', '2009-08-25', 'F'),
(32, 'Brigitte', 'Delgado Ramirez', '77853916', '2010-03-09', 'F'),
(32, 'Ivan', 'Delgado Vargas', '70867592', '2013-12-04', 'M'),
(33, 'Ismael', 'Rojas Espinoza', '26405605', '2011-03-18', 'M'),
(33, 'Carmen', 'Rojas Bravo', '23905032', '2011-11-25', 'F'),
(34, 'Claudia', 'Quispe Castillo', '29226889', '2012-01-06', 'F'),
(35, 'Gonzalo', 'Ramirez Silva', '69330166', '2014-10-02', 'M'),
(35, 'Adrian', 'Ramirez Flores', '89609131', '2011-04-25', 'M'),
(36, 'Norma', 'Nunez Sanchez', '99663907', '2012-03-05', 'F'),
(36, 'Ivan Jose', 'Nunez Rojas', '86960402', '2011-07-28', 'M'),
(37, 'Melissa Daniela', 'Nunez Perez', '25304396', '2010-07-28', 'F'),
(37, 'Cesar Franco', 'Nunez Ramos', '30517835', '2009-06-24', 'M'),
(37, 'Pilar', 'Nunez Aguilar', '85764804', '2014-11-16', 'F'),
(38, 'Lucia', 'Perez Mamani', '78057490', '2013-06-27', 'F'),
(39, 'Diego Julio', 'Yupanqui Aguilar', '91846696', '2013-12-03', 'M'),
(39, 'Yolanda', 'Yupanqui Palacios', '94676162', '2009-06-10', 'F'),
(39, 'Yesenia Katherine', 'Yupanqui Huaman', '88213973', '2012-06-04', 'F'),
(40, 'Bruno Victor', 'Vilca Medina', '70000010', '2012-09-12', 'M'),
(40, 'Jose Juan', 'Vilca Sanchez', '80669879', '2011-04-05', 'M'),
(40, 'Camila Cecilia', 'Vilca Condori', '15864298', '2011-10-05', 'F'),
(41, 'Daniela', 'Cordova Bravo', '43554863', '2013-07-17', 'F'),
(42, 'Carmen Antonella', 'Quispe Salazar', '20952896', '2013-06-01', 'F'),
(42, 'Mateo', 'Quispe Rios', '73411827', '2010-01-11', 'M'),
(43, 'Cecilia', 'Torres Gutierrez', '77085942', '2012-01-08', 'F'),
(43, 'Ruth Alejandra', 'Torres Salazar', '35140847', '2012-12-05', 'F'),
(44, 'Juan', 'Ramirez Yupanqui', '27905932', '2011-02-12', 'M'),
(45, 'Norma', 'Fernandez Vega', '35649468', '2011-05-17', 'F'),
(45, 'Paola Antonella', 'Fernandez Silva', '69020451', '2011-01-28', 'F'),
(46, 'Claudia', 'Rodriguez Choque', '69580374', '2013-06-22', 'F'),
(46, 'Cecilia', 'Rodriguez Paredes', '17698469', '2013-01-24', 'F'),
(47, 'Antonella Lucia', 'Yupanqui Zavala', '59251188', '2010-10-05', 'F'),
(48, 'Jose', 'Gutierrez Choque', '21783073', '2010-04-04', 'M'),
(49, 'Omar', 'Flores Perez', '74245343', '2010-08-26', 'M'),
(50, 'Rodrigo Sebastian', 'Rojas Choque', '79645282', '2011-02-17', 'M'),
(51, 'Pedro Rafael', 'Espinoza Campos', '86790955', '2012-10-02', 'M'),
(52, 'Katherine Veronica', 'Ponce Apaza', '70000011', '2013-08-07', 'F'),
(52, 'Ximena', 'Ponce Rojas', '26444612', '2012-03-25', 'F'),
(52, 'Miguel Gabriel', 'Ponce Cordova', '31434525', '2010-04-05', 'M'),
(53, 'Beatriz', 'Condori Delgado', '48352498', '2013-01-02', 'F'),
(54, 'Julia Cecilia', 'Campos Palacios', '27268907', '2010-07-17', 'F'),
(55, 'Sebastian', 'Cruz Rojas', '92745294', '2013-03-20', 'M'),
(55, 'Pilar Ana', 'Cruz Cruz', '24710878', '2010-09-27', 'F');

-- =============================================
-- DATOS: Secciones (vacantes=capacidad=30 al inicio)
-- =============================================
INSERT INTO Seccion(grado, seccion, capacidad, vacantes) VALUES
('1° Secundaria','A',30,30), ('1° Secundaria','B',30,30), ('1° Secundaria','C',30,30), ('1° Secundaria','D',30,30), ('2° Secundaria','A',30,30), ('2° Secundaria','B',30,30), ('2° Secundaria','C',30,30), ('2° Secundaria','D',30,30), ('3° Secundaria','A',30,30), ('3° Secundaria','B',30,30), ('3° Secundaria','C',30,30), ('3° Secundaria','D',30,30), ('4° Secundaria','A',30,30), ('4° Secundaria','B',30,30), ('4° Secundaria','C',30,30), ('4° Secundaria','D',30,30), ('5° Secundaria','A',30,30), ('5° Secundaria','B',30,30), ('5° Secundaria','C',30,30), ('5° Secundaria','D',30,30);

-- =============================================
-- DATOS: Matriculas (80 de 100 alumnos = 80%)
-- =============================================
INSERT INTO Matricula(idAlumno, idSeccion, idUsuario, periodoAcademico, estado, fechaRegistro) VALUES
(1, 17, 3, 2026, 'PENDIENTE', '2026-04-27 09:00:00'),
(2, 16, 1, 2026, 'APROBADA', '2026-01-15 09:00:00'),
(3, 11, 3, 2026, 'APROBADA', '2026-04-29 09:00:00'),
(4, 16, 5, 2026, 'PENDIENTE', '2026-03-20 09:00:00'),
(5, 6, 3, 2026, 'RECHAZADA', '2026-01-06 09:00:00'),
(6, 18, 3, 2026, 'PENDIENTE', '2026-03-07 09:00:00'),
(7, 4, 1, 2026, 'APROBADA', '2026-07-10 09:00:00'),
(8, 1, 4, 2026, 'RECHAZADA', '2026-05-29 09:00:00'),
(9, 19, 5, 2026, 'PENDIENTE', '2026-01-12 09:00:00'),
(10, 7, 4, 2026, 'RECHAZADA', '2026-03-30 09:00:00'),
(12, 1, 5, 2026, 'PENDIENTE', '2026-01-17 09:00:00'),
(14, 2, 3, 2026, 'RECHAZADA', '2026-01-16 09:00:00'),
(16, 6, 5, 2026, 'PENDIENTE', '2026-05-01 09:00:00'),
(17, 9, 5, 2026, 'PENDIENTE', '2026-03-15 09:00:00'),
(18, 20, 4, 2026, 'RECHAZADA', '2026-02-16 09:00:00'),
(19, 20, 4, 2026, 'PENDIENTE', '2026-06-14 09:00:00'),
(20, 5, 5, 2026, 'RECHAZADA', '2026-06-15 09:00:00'),
(21, 12, 5, 2026, 'PENDIENTE', '2026-04-06 09:00:00'),
(22, 12, 1, 2026, 'APROBADA', '2026-04-25 09:00:00'),
(23, 6, 5, 2026, 'APROBADA', '2026-04-07 09:00:00'),
(24, 6, 2, 2026, 'PENDIENTE', '2026-06-24 09:00:00'),
(25, 1, 5, 2026, 'APROBADA', '2026-05-19 09:00:00'),
(26, 8, 1, 2026, 'APROBADA', '2026-06-17 09:00:00'),
(27, 14, 2, 2026, 'RECHAZADA', '2026-01-31 09:00:00'),
(28, 5, 5, 2026, 'PENDIENTE', '2026-05-18 09:00:00'),
(29, 19, 1, 2026, 'APROBADA', '2026-05-16 09:00:00'),
(31, 20, 2, 2026, 'RECHAZADA', '2026-07-06 09:00:00'),
(32, 15, 2, 2026, 'APROBADA', '2026-01-01 09:00:00'),
(33, 6, 3, 2026, 'RECHAZADA', '2026-03-18 09:00:00'),
(35, 3, 4, 2026, 'RECHAZADA', '2026-06-22 09:00:00'),
(36, 18, 5, 2026, 'APROBADA', '2026-05-20 09:00:00'),
(37, 1, 3, 2026, 'APROBADA', '2026-05-17 09:00:00'),
(38, 10, 3, 2026, 'APROBADA', '2026-02-28 09:00:00'),
(39, 16, 4, 2026, 'PENDIENTE', '2026-04-28 09:00:00'),
(41, 1, 4, 2026, 'APROBADA', '2026-02-09 09:00:00'),
(42, 14, 3, 2026, 'RECHAZADA', '2026-02-18 09:00:00'),
(43, 1, 1, 2026, 'PENDIENTE', '2026-01-29 09:00:00'),
(45, 16, 2, 2026, 'APROBADA', '2026-06-19 09:00:00'),
(47, 9, 3, 2026, 'APROBADA', '2026-06-07 09:00:00'),
(48, 15, 2, 2026, 'APROBADA', '2026-03-03 09:00:00'),
(49, 14, 5, 2026, 'PENDIENTE', '2026-01-18 09:00:00'),
(50, 16, 2, 2026, 'APROBADA', '2026-06-02 09:00:00'),
(51, 10, 1, 2026, 'APROBADA', '2026-04-25 09:00:00'),
(52, 13, 1, 2026, 'PENDIENTE', '2026-06-22 09:00:00'),
(53, 13, 2, 2026, 'APROBADA', '2026-01-13 09:00:00'),
(54, 3, 2, 2026, 'PENDIENTE', '2026-07-09 09:00:00'),
(55, 20, 4, 2026, 'APROBADA', '2026-04-13 09:00:00'),
(57, 18, 1, 2026, 'APROBADA', '2026-03-01 09:00:00'),
(58, 17, 4, 2026, 'RECHAZADA', '2026-02-25 09:00:00'),
(60, 20, 1, 2026, 'APROBADA', '2026-02-05 09:00:00'),
(61, 8, 2, 2026, 'APROBADA', '2026-03-16 09:00:00'),
(62, 12, 5, 2026, 'RECHAZADA', '2026-07-07 09:00:00'),
(63, 10, 4, 2026, 'APROBADA', '2026-03-23 09:00:00'),
(65, 4, 4, 2026, 'PENDIENTE', '2026-06-03 09:00:00'),
(67, 7, 2, 2026, 'PENDIENTE', '2026-03-24 09:00:00'),
(68, 16, 2, 2026, 'APROBADA', '2026-03-19 09:00:00'),
(69, 18, 1, 2026, 'PENDIENTE', '2026-06-19 09:00:00'),
(70, 17, 1, 2026, 'PENDIENTE', '2026-02-26 09:00:00'),
(71, 3, 1, 2026, 'APROBADA', '2026-03-18 09:00:00'),
(72, 8, 4, 2026, 'RECHAZADA', '2026-01-16 09:00:00'),
(73, 2, 5, 2026, 'APROBADA', '2026-06-01 09:00:00'),
(74, 19, 4, 2026, 'APROBADA', '2026-02-14 09:00:00'),
(75, 10, 1, 2026, 'APROBADA', '2026-06-23 09:00:00'),
(77, 13, 1, 2026, 'PENDIENTE', '2026-05-23 09:00:00'),
(78, 12, 3, 2026, 'APROBADA', '2026-01-13 09:00:00'),
(79, 1, 3, 2026, 'APROBADA', '2026-06-14 09:00:00'),
(80, 3, 3, 2026, 'PENDIENTE', '2026-04-08 09:00:00'),
(81, 18, 3, 2026, 'APROBADA', '2026-03-23 09:00:00'),
(83, 9, 5, 2026, 'PENDIENTE', '2026-04-17 09:00:00'),
(84, 9, 4, 2026, 'RECHAZADA', '2026-02-08 09:00:00'),
(85, 11, 3, 2026, 'APROBADA', '2026-04-07 09:00:00'),
(87, 7, 2, 2026, 'APROBADA', '2026-05-18 09:00:00'),
(88, 1, 2, 2026, 'APROBADA', '2026-03-03 09:00:00'),
(89, 20, 1, 2026, 'PENDIENTE', '2026-03-18 09:00:00'),
(92, 15, 2, 2026, 'APROBADA', '2026-02-06 09:00:00'),
(93, 8, 3, 2026, 'APROBADA', '2026-01-15 09:00:00'),
(94, 3, 4, 2026, 'APROBADA', '2026-04-16 09:00:00'),
(95, 7, 2, 2026, 'APROBADA', '2026-05-23 09:00:00'),
(99, 3, 5, 2026, 'APROBADA', '2026-02-04 09:00:00'),
(100, 16, 4, 2026, 'RECHAZADA', '2026-03-04 09:00:00');

-- =============================================
-- DATOS: Historial de cambios
-- =============================================
INSERT INTO Historial_Cambios(idMatricula, idUsuario, estadoAnterior, estadoNuevo, descripcion, fechaCambio) VALUES
(1, 3, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-05-01 10:00:00'),
(2, 1, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-01-19 10:00:00'),
(3, 3, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-05-04 10:00:00'),
(4, 5, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-03-25 10:00:00'),
(5, 3, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-01-09 10:00:00'),
(6, 3, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-03-07 10:00:00'),
(7, 1, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-07-11 10:00:00'),
(8, 4, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-05-29 10:00:00'),
(9, 5, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-01-15 10:00:00'),
(10, 4, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-04-04 10:00:00'),
(11, 5, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-01-21 10:00:00'),
(12, 3, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-01-16 10:00:00'),
(13, 5, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-05-01 10:00:00'),
(14, 5, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-03-18 10:00:00'),
(15, 4, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-02-17 10:00:00'),
(16, 4, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-06-19 10:00:00'),
(17, 5, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-06-18 10:00:00'),
(18, 5, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-04-09 10:00:00'),
(19, 1, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-04-28 10:00:00'),
(20, 5, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-04-07 10:00:00'),
(21, 2, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-06-29 10:00:00'),
(22, 5, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-05-20 10:00:00'),
(23, 1, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-06-19 10:00:00'),
(24, 2, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-02-01 10:00:00'),
(25, 5, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-05-21 10:00:00'),
(26, 1, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-05-17 10:00:00'),
(27, 2, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-07-07 10:00:00'),
(28, 2, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-01-01 10:00:00'),
(29, 3, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-03-21 10:00:00'),
(30, 4, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-06-27 10:00:00'),
(31, 5, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-05-23 10:00:00'),
(32, 3, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-05-20 10:00:00'),
(33, 3, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-03-01 10:00:00'),
(34, 4, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-04-30 10:00:00'),
(35, 4, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-02-11 10:00:00'),
(36, 3, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-02-23 10:00:00'),
(37, 1, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-01-29 10:00:00'),
(38, 2, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-06-22 10:00:00'),
(39, 3, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-06-07 10:00:00'),
(40, 2, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-03-04 10:00:00'),
(41, 5, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-01-18 10:00:00'),
(42, 2, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-06-02 10:00:00'),
(43, 1, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-04-29 10:00:00'),
(44, 1, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-06-27 10:00:00'),
(45, 2, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-01-14 10:00:00'),
(46, 2, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-07-09 10:00:00'),
(47, 4, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-04-16 10:00:00'),
(48, 1, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-03-05 10:00:00'),
(49, 4, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-02-25 10:00:00'),
(50, 1, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-02-09 10:00:00'),
(51, 2, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-03-17 10:00:00'),
(52, 5, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-07-11 10:00:00'),
(53, 4, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-03-27 10:00:00'),
(54, 4, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-06-08 10:00:00'),
(55, 2, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-03-25 10:00:00'),
(56, 2, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-03-20 10:00:00'),
(57, 1, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-06-23 10:00:00'),
(58, 1, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-03-01 10:00:00'),
(59, 1, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-03-20 10:00:00'),
(60, 4, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-01-20 10:00:00'),
(61, 5, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-06-06 10:00:00'),
(62, 4, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-02-19 10:00:00'),
(63, 1, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-06-26 10:00:00'),
(64, 1, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-05-26 10:00:00'),
(65, 3, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-01-15 10:00:00'),
(66, 3, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-06-19 10:00:00'),
(67, 3, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-04-12 10:00:00'),
(68, 3, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-03-28 10:00:00'),
(69, 5, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-04-20 10:00:00'),
(70, 4, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-02-10 10:00:00'),
(71, 3, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-04-08 10:00:00'),
(72, 2, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-05-21 10:00:00'),
(73, 2, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-03-04 10:00:00'),
(74, 1, 'PENDIENTE', 'PENDIENTE', 'Matricula en revision, pendiente de documentos', '2026-03-23 10:00:00'),
(75, 2, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-02-09 10:00:00'),
(76, 3, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-01-19 10:00:00'),
(77, 4, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-04-19 10:00:00'),
(78, 2, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-05-27 10:00:00'),
(79, 5, 'PENDIENTE', 'APROBADA', 'Matricula validada por el administrador', '2026-02-07 10:00:00'),
(80, 4, 'PENDIENTE', 'RECHAZADA', 'Documentacion incompleta', '2026-03-06 10:00:00');


-- =============================================
-- CORRECCION: Ajustar vacantes reales
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

use sistema_matricula;

select * from usuario;

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

SELECT 
    a.idAlumno,
    a.dni AS dni_alumno,
    CONCAT(a.nombre, ' ', a.apellido) AS alumno,
    a.genero,
    a.fechaNacimiento,
    CONCAT(u.nombre, ' ', u.apellido) AS apoderado,
    ap.dni AS dni_apoderado,
    ap.telefono AS telefono_apoderado
FROM Alumno a
INNER JOIN Apoderado ap ON a.idApoderado = ap.idApoderado
INNER JOIN Usuario u ON ap.idUsuario = u.idUsuario
LEFT JOIN Matricula m ON a.idAlumno = m.idAlumno
WHERE m.idMatricula IS NULL;