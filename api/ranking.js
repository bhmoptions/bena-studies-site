// GET /api/ranking?jogo_id=matematica/fracoes/001&limite=10
// GET /api/ranking?limite=10   (ranking geral)
// Leitura publica — nao exige autenticacao.
import { getPool } from "./_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { jogo_id, limite = "10" } = req.query;
    const lim = Math.min(Math.max(Number(limite) || 10, 1), 50);
    const pool = getPool();
    let rows;

    if (jogo_id) {
      // Melhor pontuacao de cada aluno neste jogo
      [rows] = await pool.execute(
        `SELECT a.nome,
                MAX(p.pontuacao)         AS melhor_pontuacao,
                MAX(p.acertos_primeira)  AS melhor_acertos,
                COUNT(*)                 AS total_partidas
         FROM partidas p
         JOIN alunos a ON a.id = p.aluno_id
         WHERE p.jogo_id = ?
         GROUP BY a.id, a.nome
         ORDER BY melhor_pontuacao DESC, melhor_acertos DESC
         LIMIT ?`,
        [jogo_id, lim]
      );
    } else {
      // Ranking geral: soma das melhores pontuacoes de cada jogo por aluno
      [rows] = await pool.execute(
        `SELECT a.nome,
                SUM(sub.melhor)          AS pontuacao_total,
                COUNT(DISTINCT sub.jogo_id) AS jogos_jogados
         FROM alunos a
         JOIN (
           SELECT aluno_id, jogo_id, MAX(pontuacao) AS melhor
           FROM partidas
           GROUP BY aluno_id, jogo_id
         ) sub ON sub.aluno_id = a.id
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
}
