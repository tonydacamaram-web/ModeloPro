-- Seed 001: Usuario administrador por defecto
-- Contraseña: admin123 (hash bcrypt con salt 10)
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
(
    'Administrador',
    'admin@gestionpro.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin'
)
ON CONFLICT (email) DO NOTHING;
