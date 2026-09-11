// Conexao com MySQL HeatWave via pool reutilizavel
import mysql from "mysql2/promise";

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:             process.env.MYSQL_HOST,
      port:             Number(process.env.MYSQL_PORT) || 3306,
      user:             process.env.MYSQL_USER,
      password:         process.env.MYSQL_PASSWORD,
      database:         process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit:  5,
      ssl:              { rejectUnauthorized: true },
    });
  }
  return pool;
}
