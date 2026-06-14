-- =============================================
-- AMBI360 - Estrutura do Banco de Dados
-- Visualizador de Tours Virtuais 360°
-- =============================================

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS ambi360_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE ambi360_db;

-- =============================================
-- Tabela de Usuários/Administradores
-- =============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- =============================================
-- Tabela de Projetos 360°
-- =============================================
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    main_image_url VARCHAR(500) NOT NULL,
    logo_url VARCHAR(500),
    password_hash VARCHAR(255), -- Para projetos com senha
    is_public BOOLEAN DEFAULT FALSE,
    unlock_order INT DEFAULT 0, -- Para desbloqueio progressivo
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_unlock_order (unlock_order),
    INDEX idx_is_public (is_public)
);

-- =============================================
-- Tabela de Pontos/Hotspots 360°
-- =============================================
CREATE TABLE hotspots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    parent_hotspot_id INT NULL, -- Para hierarquia de pontos
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Coordenadas 360°
    pitch DECIMAL(8,5) NOT NULL, -- Ângulo vertical (-90 a 90)
    yaw DECIMAL(8,5) NOT NULL,   -- Ângulo horizontal (0 a 360)
    
    -- Tipo e aparência
    hotspot_type ENUM('normal', 'door', 'info', 'custom') DEFAULT 'normal',
    icon_type VARCHAR(50) DEFAULT 'normal_1',
    
    -- Imagens de origem e destino
    source_image_url VARCHAR(500) NOT NULL, -- Imagem onde o hotspot aparece
    target_image_url VARCHAR(500),          -- Imagem de destino
    
    -- Desbloqueio progressivo
    unlock_order INT DEFAULT 0,
    requires_previous BOOLEAN DEFAULT FALSE,
    
    -- Metadados
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_hotspot_id) REFERENCES hotspots(id) ON DELETE CASCADE,
    
    INDEX idx_project_id (project_id),
    INDEX idx_parent_hotspot (parent_hotspot_id),
    INDEX idx_source_image (source_image_url),
    INDEX idx_unlock_order (unlock_order)
);

-- =============================================
-- Tabela de Progresso do Usuário (Google Maps style)
-- =============================================
CREATE TABLE user_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_session VARCHAR(100) NOT NULL, -- Session ID para usuários anônimos
    project_id INT NOT NULL,
    hotspot_id INT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (hotspot_id) REFERENCES hotspots(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_progress (user_session, project_id, hotspot_id),
    INDEX idx_user_session (user_session),
    INDEX idx_project_progress (project_id, user_session)
);

-- =============================================
-- Tabela de Logs de Acesso
-- =============================================
CREATE TABLE access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_session VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_access (project_id),
    INDEX idx_access_date (accessed_at)
);

-- =============================================
-- Tabela de Configurações do Sistema
-- =============================================
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- Inserir configurações padrão do sistema
-- =============================================
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('admin_password_hash', '', 'Hash da senha do administrador principal'),
('max_projects_per_user', '10', 'Máximo de projetos por usuário'),
('enable_public_access', 'true', 'Permitir acesso público aos projetos'),
('default_auto_rotate', '-2', 'Velocidade padrão de rotação automática');

-- =============================================
-- Views úteis para consultas
-- =============================================

-- Remover views existentes se houver
DROP VIEW IF EXISTS projects_summary;
DROP VIEW IF EXISTS hotspots_hierarchy;

-- View: Projetos com contagem de hotspots
CREATE VIEW projects_summary AS
SELECT 
    p.id,
    p.name,
    p.title,
    p.is_public,
    p.unlock_order,
    p.created_at,
    COUNT(h.id) as total_hotspots,
    COUNT(CASE WHEN h.hotspot_type = 'door' THEN 1 END) as door_hotspots
FROM projects p
LEFT JOIN hotspots h ON p.id = h.project_id AND h.is_active = TRUE
WHERE p.is_active = TRUE
GROUP BY p.id;

-- View: Hierarquia de hotspots
CREATE VIEW hotspots_hierarchy AS
SELECT 
    h.id,
    h.project_id,
    h.name,
    h.parent_hotspot_id,
    parent.name as parent_name,
    h.unlock_order,
    h.hotspot_type
FROM hotspots h
LEFT JOIN hotspots parent ON h.parent_hotspot_id = parent.id
WHERE h.is_active = TRUE
ORDER BY h.project_id, h.unlock_order;