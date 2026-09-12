const { verificarToken } = require("./_lib/auth");
const { getPool }        = require("./_lib/db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const fbUser = await verificarToken(req.headers.authorization);
    const { nome, escola, serie } = req.body || {};
    if (!nome || !nome.trim()) return res.status(400).json({ error: "Nome obrigatorio" });
    const pool = getPool();
    const escolaVal = escola && escola.trim() ? escola.trim() : null;

    try {
      await pool.execute(
        `INSERT INTO alunos (clerk_id, nome, email, serie, escola)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nome = VALUES(nome), serie = VALUES(serie), escola = VALUES(escola)`,
        [fbUser.localId, nome.trim(), fbUser.email, serie != null ? serie : null, escolaVal]
      );
    } catch (dbErr) {
      if (dbErr.code === 'ER_BAD_FIELD_ERROR' || String(dbErr.message).includes("Unknown column 'escola'")) {
        console.warn("[registro-aluno] Coluna 'escola' ainda nao existe em bena.alunos, gravando sem ela.");
        await pool.execute(
          `INSERT INTO alunos (clerk_id, nome, email, serie)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE nome = VALUES(nome), serie = VALUES(serie)`,
          [fbUser.localId, nome.trim(), fbUser.email, serie != null ? serie : null]
        );
      } else {
        throw dbErr;
      }
    }

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
