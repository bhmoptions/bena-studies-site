const { verificarToken } = require("./_lib/auth");
const { getPool }        = require("./_lib/db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const fbUser = await verificarToken(req.headers.authorization);
    const { nome, serie } = req.body || {};
    if (!nome || !nome.trim()) return res.status(400).json({ error: "Nome obrigatorio" });
    const pool = getPool();
    await pool.execute(
      `INSERT INTO alunos (clerk_id, nome, email, serie)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nome = VALUES(nome), serie = VALUES(serie)`,
      [fbUser.localId, nome.trim(), fbUser.email, serie != null ? serie : null]
    );
    const [[aluno]] = await pool.execute(
      "SELECT id FROM alunos WHERE clerk_id = ?",
      [fbUser.localId]
    );
    return res.status(200).json({ ok: true, aluno_id: aluno.id });
  } catch (err) {
    console.error("[registro-aluno]", err.message);
    return res.status(err.message === "Token ausente" ? 401 : 500).json({ error: err.message });
  }
};
