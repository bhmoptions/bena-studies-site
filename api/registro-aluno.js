// POST /api/registro-aluno
// Sincroniza o usuario Firebase com a tabela bena.alunos do MySQL.
// Usa clerk_id para guardar o Firebase UID (compativel com a estrutura existente).
import { verificarToken } from "./_lib/auth.js";
import { getPool }        from "./_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const fbUser = await verificarToken(req.headers.authorization);
    const { nome, serie } = req.body ?? {};

    if (!nome?.trim()) return res.status(400).json({ error: "Nome obrigatorio" });

    const pool = getPool();

    // Insere ou atualiza o aluno (clerk_id = Firebase UID)
    await pool.execute(
      `INSERT INTO alunos (clerk_id, nome, email, serie)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nome = VALUES(nome), serie = VALUES(serie)`,
      [fbUser.localId, nome.trim(), fbUser.email, serie ?? null]
    );

    const [[aluno]] = await pool.execute(
      "SELECT id FROM alunos WHERE clerk_id = ?",
      [fbUser.localId]
    );

    return res.status(200).json({ ok: true, aluno_id: aluno.id });
  } catch (err) {
    console.error("[registro-aluno]", err.message);
    const status = err.message === "Token ausente" ? 401 : 500;
    return res.status(status).json({ error: err.message });
  }
}
