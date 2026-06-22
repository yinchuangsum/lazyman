Bun.serve({
  port: 3005,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/api/todos" && req.method === "GET") {
      return Response.json([{ id: 1, title: "Test todo" }]);
    }
    if (url.pathname === "/api/todos" && req.method === "POST") {
      return Response.json({ id: 2, title: "created" }, { status: 201 });
    }
    if (url.pathname.startsWith("/api/todos/") && req.method === "PUT") {
      return Response.json({ id: 1, title: "updated" });
    }
    if (url.pathname.startsWith("/api/todos/") && req.method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    return new Response("Not found", { status: 404 });
  },
});
