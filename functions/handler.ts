// Public, credential-free, stateless endpoint; independent of the mapped physical function name.
export function handler(request: Request): Response {
  const headers = { "Cache-Control": "no-store" };
  if (request.method !== "GET") {
    return Response.json(
      { ok: false, error: "method_not_allowed" },
      { status: 405, headers: { ...headers, Allow: "GET" } },
    );
  }
  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "Visitor";
  if (!name || name.length > 80) {
    return Response.json({ ok: false, error: "invalid_name" }, { status: 400, headers });
  }
  return Response.json({ ok: true, message: `Hello, ${name}!` }, { headers });
}
