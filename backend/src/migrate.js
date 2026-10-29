import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🔄 Connexion à la base de données de production...');
  
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    multipleStatements: true // Obligatoire pour exécuter plusieurs requêtes SQL d'un coup
  });

  try {
    // Cibler le fichier de la deuxième migration
    const migrationPath = path.join(__dirname, '../sql/migration_002_templates.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Le fichier de migration n'existe pas à l'emplacement : ${migrationPath}`);
    }

    console.log('📖 Lecture du fichier de migration 002...');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('⚡ Application de la migration 002 en base de données...');
    await connection.query(sql);
    
    console.log('✅ Migration 002 appliquée avec succès !');
  } catch (error) {
    console.error('❌ Échec de la migration :', error.message);
    process.exit(1); // Bloque le build Render en cas d'échec
  } finally {
    await connection.end();
  }
}

runMigration();
