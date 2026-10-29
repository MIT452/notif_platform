-- À exécuter UNE SEULE FOIS si la base existait déjà avant la version "templates pour le code"
-- (phpMyAdmin > base notif_platform > onglet Importer, ou onglet SQL).
USE notif_platform;

ALTER TABLE templates
  ADD COLUMN slug VARCHAR(100) NULL AFTER id,
  ADD COLUMN type ENUM('info','success','warning','alert') NOT NULL DEFAULT 'info' AFTER body,
  ADD COLUMN channels JSON NULL AFTER type;

UPDATE templates SET slug = LOWER(REPLACE(name, ' ', '_')) WHERE slug IS NULL;

ALTER TABLE templates
  MODIFY slug VARCHAR(100) NOT NULL,
  ADD UNIQUE KEY uq_templates_slug (slug);
