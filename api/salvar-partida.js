const { verificarToken } = require("./_lib/auth");
const { getPool }        = require("./_lib/db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const fbUser = await verificarToken(req.headers.authorization);
    const { jogo_id, total_questoes, acertos_primeira, erros_validos, pontuacao } = req.body || {};
    if (!jogo_id || total_questoes == null || acertos_primeira == null ||
        erros_validos == null || pontuacao == null) {
      return res.status(400).json({ error: "Dados incompletos" });
    }
    if (acertos_primeira < 0 || acertos_primeira > total_questoes)
      return res.status(400).json({ error: "acertos_primeira invalido" });
    if (erros_validos < 0 || pontuacao < 0 || pontuacao > 999999)
      return res.status(400).json({ error: "Pontuacao invalida" });
    const pool = getPool();
    const [[aluno]] = await pool.execute(
      "SELECT id FROM alunos WHERE clerk_id = ?",
      [fbUser.localId]
    );
    if (!aluno) return res.status(404).json({ error: "Aluno nao registrado" });
    await pool.execute(
      `INSERT INTO partidas
         (aluno_id, jogo_id, rodada_iniciada, total_questoes, acertos_primeira, erros_validos, pontuacao)
       VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
      [aluno.id, jogo_id, total_questoes, acertos_primeira, erros_validos, pontuacao]
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[salvar-partida]", err.message);
    return res.status(err.message === "Token ausente" ? 401 : 500).json({ error: err.message });
  }
};
