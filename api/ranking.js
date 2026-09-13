const { getPool } = require("./_lib/db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { jogo_id, limite = "10" } = req.query;
    const lim  = Math.min(Math.max(Number(limite) || 10, 1), 50);
    const pool = getPool();
    let rows;
    if (jogo_id) {
      [rows] = await pool.execute(
        `SELECT a.nome,
                MAX(p.pontuacao)        AS melhor_pontuacao,
                MAX(p.acertos_primeira) AS melhor_acertos,
                COUNT(*)                AS total_partidas
         FROM partidas p
         JOIN alunos a ON a.id = p.aluno_id
         WHERE p.jogo_id = ? AND p.type IN ('game_score', '')
         GROUP BY a.id, a.nome
         ORDER BY melhor_pontuacao DESC, melhor_acertos DESC
         LIMIT ?`,
        [jogo_id, lim]
      );
    } else {
      [rows] = await pool.execute(
        `SELECT a.nome,
                GREATEST(0, SUM(p.pontuacao)) AS pontuacao_total,
                COUNT(DISTINCT CASE WHEN p.type IN ('game_score', '') THEN p.jogo_id END) AS jogos_jogados
         FROM alunos a
         JOIN partidas p ON p.aluno_id = a.id
         GROUP BY a.id, a.nome
         ORDER BY pontuacao_total DESC
         LIMIT ?`,
        [lim]
      );
    }
    return res.status(200).json({ ok: true, ranking: rows });
  } catch (err) {
    console.error("[ranking]", err.message);
    return res.status(500).json({ error: "Erro ao buscar ranking" });
  }
};
