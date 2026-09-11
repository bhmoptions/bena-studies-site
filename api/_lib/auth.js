// Verifica o Firebase ID Token usando a REST API do Firebase
// FIREBASE_API_KEY = mesma chave publica do SDK (apiKey no firebaseConfig)
export async function verificarToken(authHeader) {
  const token = (authHeader ?? "").replace("Bearer ", "").trim();
  if (!token) throw new Error("Token ausente");

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ idToken: token }),
    }
  );

  if (!res.ok) throw new Error("Token invalido");
  const data = await res.json();
  if (!data.users?.[0]) throw new Error("Usuario nao encontrado");

  // Retorna { localId (= firebase uid), email, ... }
  return data.users[0];
}
