const { verificarToken } = require("./_lib/auth");
const { getPool }        = require("./_lib/db");
const { calcularPontuacao } = require("./_lib/pontuacao");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const fbUser = await verificarToken(req.headers.authorization);
    const { partida_id, jogo_id, total_questoes, acertos_primeira, erros_validos } = req.body || {};
    if (!partida_id || !jogo_id || total_questoes == null || acertos_primeira == null ||
        erros_validos == null) {
      return res.status(400).json({ error: "Dados incompletos" });
    }
    if (typeof partida_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(partida_id))
      return res.status(400).json({ error: "partida_id invalido" });
    if (typeof jogo_id !== "string" || !jogo_id.trim() || jogo_id.length > 80)
      return res.status(400).json({ error: "jogo_id invalido" });
    if (![total_questoes, acertos_primeira, erros_validos].every(Number.isSafeInteger))
      return res.status(400).json({ error: "Pontuacao invalida" });
    if (acertos_primeira < 0 || acertos_primeira > total_questoes)
      return res.status(400).json({ error: "acertos_primeira invalido" });
    if (total_questoes < 1 || erros_validos < 0 || erros_validos < total_questoes - acertos_primeira)
      return res.status(400).json({ error: "Pontuacao invalida" });
    const pool = getPool();
    const [[aluno]] = await pool.execute(
      "SELECT id FROM alunos WHERE clerk_id = ?",
      [fbUser.localId]
    );
    if (!aluno) return res.status(404).json({ error: "Aluno nao registrado" });

    let pontuacaoCalculada;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[deposito]] = await connection.execute(
        `SELECT id, jogo_id, rodada_iniciada, pontuacao
         FROM partidas
         WHERE aluno_id = ? AND partida_id = ? AND type = 'deposit'
         FOR UPDATE`,
        [aluno.id, partida_id]
      );
      if (!deposito || deposito.jogo_id !== jogo_id || deposito.pontuacao >= 0) {
        const erro = new Error("Partida ativa nao encontrada");
        erro.status = 409;
        throw erro;
      }

      const [[ordem]] = await connection.execute(
        `SELECT COUNT(*) AS rodada
         FROM partidas
         WHERE aluno_id = ? AND jogo_id = ? AND type = 'deposit' AND id <= ?`,
        [aluno.id, jogo_id, deposito.id]
      );
      pontuacaoCalculada = calcularPontuacao({
        total: total_questoes,
        acertosPrimeira: acertos_primeira,
        erros: erros_validos,
        rodada: Number(ordem.rodada)
      });

      // The unique (aluno_id, partida_id, type) index makes both inserts safe
      // to retry after a lost client response without changing the first result.
      await connection.execute(
        `INSERT INTO partidas
           (aluno_id, partida_id, jogo_id, type, rodada_iniciada,
            total_questoes, acertos_primeira, erros_validos, pontuacao)
         VALUES (?, ?, ?, 'game_score', ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [aluno.id, partida_id, jogo_id, deposito.rodada_iniciada,
          total_questoes, acertos_primeira, erros_validos, pontuacaoCalculada]
      );
      await connection.execute(
        `INSERT INTO partidas
           (aluno_id, partida_id, jogo_id, type, rodada_iniciada,
            total_questoes, acertos_primeira, erros_validos, pontuacao)
         VALUES (?, ?, ?, 'refund', ?, 0, 0, 0, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [aluno.id, partida_id, jogo_id, deposito.rodada_iniciada,
          Math.abs(Number(deposito.pontuacao))]
      );
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    return res.status(200).json({ ok: true, pontuacao: pontuacaoCalculada });
  } catch (err) {
    console.error("[salvar-partida]", err.message);
    return res.status(err.status || (err.message === "Token ausente" ? 401 : 500)).json({ error: err.message });
  }
};
