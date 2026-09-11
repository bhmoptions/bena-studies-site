async function verificarToken(authHeader) {
  const token = (authHeader || "").replace("Bearer ", "").trim();
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
  return data.users[0];
}

module.exports = { verificarToken };
