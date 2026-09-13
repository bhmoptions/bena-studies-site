const { verificarToken } = require("./_lib/auth");
const { getPool }        = require("./_lib/db");
const { PONTOS_DEPOSITO_ABANDONO } = require("./_lib/pontuacao");

function dadosDaPartidaValidos(jogoId, partidaId) {
  return typeof jogoId === "string" && jogoId.trim().length <= 80
    && typeof partidaId === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(partidaId);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { jogo_id: jogoId, partida_id: partidaId } = req.body || {};
    if (!dadosDaPartidaValidos(jogoId, partidaId)) {
      return res.status(400).json({ error: "Dados da partida invalidos" });
    }

    const fbUser = await verificarToken(req.headers.authorization);
    const pool = getPool();
    const [[aluno]] = await pool.execute(
      "SELECT id FROM alunos WHERE clerk_id = ?",
      [fbUser.localId]
    );
    if (!aluno) return res.status(404).json({ error: "Aluno nao registrado" });

    // The client keeps the UUID for retries. The unique ledger index makes a
    // repeated start request return the same deposit instead of charging twice.
    await pool.execute(
      `INSERT INTO partidas
         (aluno_id, partida_id, jogo_id, type, rodada_iniciada,
          total_questoes, acertos_primeira, erros_validos, pontuacao)
       VALUES (?, ?, ?, 'deposit', NOW(), 0, 0, 0, ?)
       ON DUPLICATE KEY UPDATE partida_id = partida_id`,
      [aluno.id, partidaId, jogoId, -PONTOS_DEPOSITO_ABANDONO]
    );

    const [[deposito]] = await pool.execute(
      `SELECT id, jogo_id, pontuacao
       FROM partidas
       WHERE aluno_id = ? AND partida_id = ? AND type = 'deposit'`,
      [aluno.id, partidaId]
    );
    if (!deposito || deposito.jogo_id !== jogoId) {
      return res.status(409).json({ error: "Identificador de partida ja esta em uso" });
    }
    const [[ordem]] = await pool.execute(
      `SELECT COUNT(*) AS rodada
       FROM partidas
       WHERE aluno_id = ? AND jogo_id = ? AND type = 'deposit' AND id <= ?`,
      [aluno.id, jogoId, deposito.id]
    );

    return res.status(200).json({
      ok: true,
      partida_id: partidaId,
      deposito: Math.abs(Number(deposito.pontuacao)),
      rodada: Number(ordem.rodada)
    });
  } catch (err) {
    console.error("[iniciar-partida]", err.message);
    return res.status(err.message === "Token ausente" ? 401 : 500).json({ error: err.message });
  }
};
