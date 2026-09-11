// POST /api/salvar-partida
// Recebe o resultado de uma rodada e persiste em bena.partidas.
// O servidor valida os dados antes de salvar para evitar fraudes.
import { verificarToken } from "./_lib/auth.js";
import { getPool }        from "./_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const fbUser = await verificarToken(req.headers.authorization);
    const { jogo_id, total_questoes, acertos_primeira, erros_validos, pontuacao } = req.body ?? {};

    // Validacao basica de integridade
    if (!jogo_id || total_questoes == null || acertos_primeira == null ||
        erros_validos == null || pontuacao == null) {
      return res.status(400).json({ error: "Dados incompletos" });
    }
    if (acertos_primeira < 0 || acertos_primeira > total_questoes) {
      return res.status(400).json({ error: "acertos_primeira invalido" });
    }
    if (erros_validos < 0 || pontuacao < 0 || pontuacao > 999999) {
      return res.status(400).json({ error: "Pontuacao invalida" });
    }

    const pool = getPool();

    // Busca o ID interno do aluno a partir do Firebase UID
    const [[aluno]] = await pool.execute(
      "SELECT id FROM alunos WHERE clerk_id = ?",
      [fbUser.localId]
    );
    if (!aluno) return res.status(404).json({ error: "Aluno nao registrado. Faca login novamente." });

    await pool.execute(
      `INSERT INTO partidas
         (aluno_id, jogo_id, rodada_iniciada, total_questoes, acertos_primeira, erros_validos, pontuacao)
       VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
      [aluno.id, jogo_id, total_questoes, acertos_primeira, erros_validos, pontuacao]
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[salvar-partida]", err.message);
    const status = err.message === "Token ausente" ? 401 : 500;
    return res.status(status).json({ error: err.message });
  }
}
