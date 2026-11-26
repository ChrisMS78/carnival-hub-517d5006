CREATE TABLE IF NOT EXISTS profiles (
 id CHAR(36) PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE, display_name VARCHAR(255),
 is_active BOOLEAN NOT NULL DEFAULT TRUE, password_hash VARCHAR(255) NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS user_roles (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL UNIQUE,
 role ENUM('admin','redakteur','user') NOT NULL DEFAULT 'user',
 FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS events (
 id CHAR(36) PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT,
 event_date DATE NOT NULL, event_time TIME, location VARCHAR(255), image_url TEXT,
 sort_order INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS about_content (
 id CHAR(36) PRIMARY KEY, title VARCHAR(255) NOT NULL, content TEXT, image_url TEXT,
 pdf_name VARCHAR(255), pdf_url TEXT, section_type VARCHAR(50) DEFAULT 'general',
 sort_order INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS gallery_albums (
 id CHAR(36) PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT, event_date DATE,
 cover_image_url TEXT, folder VARCHAR(150) NOT NULL UNIQUE, next_number INT NOT NULL DEFAULT 1,
 sort_order INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS gallery_images (
 id CHAR(36) PRIMARY KEY, album_id CHAR(36) NOT NULL, image_url VARCHAR(512) NOT NULL,
 thumbnail_url VARCHAR(512) NOT NULL, caption VARCHAR(255), sort_order INT DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (album_id) REFERENCES gallery_albums(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS contact_submissions (
 id CHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(254) NOT NULL,
 subject VARCHAR(255), message TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS page_backgrounds (
 id CHAR(36) PRIMARY KEY, page_key VARCHAR(50) NOT NULL UNIQUE, page_label VARCHAR(100) NOT NULL,
 background_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS site_settings (
 id CHAR(36) PRIMARY KEY, `key` VARCHAR(100) NOT NULL UNIQUE, value TEXT,
 label VARCHAR(255) NOT NULL, category VARCHAR(100) NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS request_limits (
 bucket CHAR(64) PRIMARY KEY, hits INT NOT NULL, window_start BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO site_settings (id,`key`,value,label,category) VALUES
 (UUID(),'hero_title','Karneval bei Dir vor Ort','Hauptüberschrift (Hero)','hero'),
 (UUID(),'hero_subtitle','Die fünfte Jahreszeit in Bösensell','Untertitel (Hero)','hero'),
 (UUID(),'about_title','Über Uns','Seitentitel (Über uns)','about'),
 (UUID(),'about_subtitle','Helau Bösensell - Lernen Sie uns kennen!','Untertitel (Über uns)','about'),
 (UUID(),'about_stat_members','150+','Statistik: Mitglieder','about'),
 (UUID(),'about_stat_years','10+','Statistik: Jahre Tradition','about'),
 (UUID(),'about_stat_events','20+','Statistik: Events pro Jahr','about'),
 (UUID(),'contact_address','','Adresse','contact'),
 (UUID(),'contact_email','info@keb-ev.de','E-Mail','contact'),
 (UUID(),'contact_phone','','Telefon','contact'),
 (UUID(),'contact_title','Kontakt','Seitentitel (Kontakt)','contact'),
 (UUID(),'contact_subtitle','Wir freuen uns auf Ihre Nachricht!','Untertitel (Kontakt)','contact');
INSERT IGNORE INTO page_backgrounds (id,page_key,page_label) VALUES
 (UUID(),'home','Startseite'),(UUID(),'termine','Termine'),(UUID(),'ueber-uns','Über Uns'),
 (UUID(),'galerie','Galerie'),(UUID(),'kontakt','Kontakt');
