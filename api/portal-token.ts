// SystemIRL — optional identity endpoint (Vercel Serverless Function)
// POST /api/portal-token
// Body: { userId: string, name?: string }
// Mints an identified Portal user JWT with the SECRET key (sk_...).
// Only needed if you want real names in presence instead of anonymous ids.
// The app works fine WITHOUT this (anonymous mode). Enable it later if time allows.

export default async function handler(
  req: Request & { query?: Record<string, string> },
  res: {
    status: (code: number) => { json: (body: unknown) => void };
    json: (body: unknown) => void;
  },
) {
  const secretKey = process.env.PORTAL_SECRET;
  if (!secretKey) {
    return res.status(500).json({ error: "PORTAL_SECRET not configured" });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body: { userId?: string; name?: string } = {};
  try {
    const raw = await new Response(req.body).text();
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }

  const userId = typeof body.userId === "string" ? body.userId.slice(0, 64) : "";
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const tokenRes = await fetch("https://api.useportal.co/v1/tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        userId,
        claims: { name: typeof body.name === "string" ? body.name.slice(0, 32) : undefined },
      }),
    });

    if (!tokenRes.ok) {
      return res.status(tokenRes.status).json({ error: `Portal token API ${tokenRes.status}` });
    }
    const data = (await tokenRes.json()) as { token?: string };
    return res.status(200).json({ token: data.token });
  } catch (err) {
    console.error("portal-token failed:", err);
    return res.status(500).json({ error: "Failed to mint token" });
  }
}
