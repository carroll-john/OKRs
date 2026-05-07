# Supabase MCP setup log

Date: 2026-05-07 (UTC)

## What was changed

1. Installed Codex CLI:
   - `npm install -g @openai/codex`
2. Added Supabase MCP server:
   - `codex mcp add supabase --url https://mcp.supabase.com/mcp?project_ref=kvptpiindfxjnqnglwuv`
3. Enabled remote MCP support in local config:
   - `~/.codex/config.toml`
   -
     ```toml
     [mcp]
     remote_mcp_client_enabled = true
     ```

## Verification

- `codex mcp add ...` succeeded with:
  - `Added global MCP server 'supabase'.`
- `codex mcp list` and `codex mcp get supabase` show the server is enabled and reachable in config.

## About `codex mcp login supabase`

Running `codex mcp login supabase` in this environment returns:

- `Error: No authorization support detected`

`codex mcp list` reports Supabase auth mode as `Unsupported`, which means this server does not expose an OAuth login flow for Codex CLI here. In this case, `login` is not the right auth path.

## Practical fix

- Keep the server registered with `--url` (already done).
- If auth is required, re-add/update with a bearer token env var:
  - `codex mcp add supabase --url https://mcp.supabase.com/mcp?project_ref=kvptpiindfxjnqnglwuv --bearer-token-env-var SUPABASE_ACCESS_TOKEN`
- Then export the token in your shell before running Codex:
  - `export SUPABASE_ACCESS_TOKEN=...`
- Verify with:
  - `codex mcp list`
  - `/mcp` inside an interactive Codex session.
