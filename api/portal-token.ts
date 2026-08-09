// SystemIRL — optional identity endpoint (Vercel Serverless Function)
// POST /api/portal-token
// Body: { userId: string, name?: string }
// Mints an identified Portal user JWT with the SECRET key (sk_...).
// Only needed if you want real names in presence instead of anonymous ids.
// The app works fine WITHOUT this (anonymous mode). Enable it later if time allows.

// Named HTTP export = Vercel Web API signature. The previous `export default`
// handler returned a Response that Vercel ignored, so the function hung.
export async function POST(request: Request): Promise<Response> {
  const secretKey = process.env.PORTAL_SECRET;
  if (!secretKey) {
    return json({ error: "PORTAL_SECRET not configured" }, 500);
  }

  let body: { userId?: string; name?: string } = {};
  try {
    body = (await request.json()) as { userId?: string; name?: string };
  } catch {
    body = {};
  }

  const userId = typeof body.userId === "string" ? body.userId.slice(0, 64) : "";
  if (!userId) {
    return json({ error: "userId is required" }, 400);
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
      return json({ error: `Portal token API ${tokenRes.status}` }, tokenRes.status);
    }
    const data = (await tokenRes.json()) as { token?: string };
    return json({ token: data.token });
  } catch (err) {
    console.error("portal-token failed:", err);
    return json({ error: "Failed to mint token" }, 500);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
