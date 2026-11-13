// The Thai search UAT's read-only proxy in front of the development runtime (#238). It listens on
// loopback only, and the UAT's Tailscale node funnels its public URL to it
// (scripts/dev-runtime-uat.sh, which runs it in a container of the runtime's own Node image). What
// it forwards and refuses is in scripts/uat-proxy/policy.ts. It logs one line per request.
//   node scripts/uat-proxy.ts <port>

import { createServer, request } from "node:http";

import { UPSTREAM_ORIGIN, decide, responseHeaders, upstreamHeaders } from "./uat-proxy/policy.ts";

const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
	console.error("usage: node scripts/uat-proxy.ts <port>");
	process.exit(2);
}

const server = createServer((req, res) => {
	const method = req.method ?? "";
	const target = req.url ?? "";
	const log = (status: number) =>
		console.log(`${new Date().toISOString()} ${status} ${method} ${JSON.stringify(target)}`);
	req.resume(); // a GET or HEAD body is never forwarded

	const decision = decide(method, target);
	if (!decision.forward) {
		res.writeHead(decision.status, {
			"content-type": "text/plain; charset=utf-8",
			...(decision.status === 405 ? { allow: "GET, HEAD" } : {}),
		});
		res.end(`${decision.reason}\n`);
		log(decision.status);
		return;
	}

	const upstream = request(`${UPSTREAM_ORIGIN}${decision.path}`, {
		method,
		headers: upstreamHeaders(req.headers),
	});
	upstream.on("response", (answer) => {
		res.writeHead(answer.statusCode ?? 502, responseHeaders(answer.headers));
		answer.pipe(res);
		log(answer.statusCode ?? 502);
	});
	upstream.on("error", () => {
		if (res.headersSent) return void res.destroy();
		res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
		res.end("the development runtime did not answer\n");
		log(502);
	});
	res.on("close", () => upstream.destroy());
	upstream.end();
});

server.listen(port, "127.0.0.1", () => {
	console.log(`uat-proxy: 127.0.0.1:${port} -> ${UPSTREAM_ORIGIN}`);
});
