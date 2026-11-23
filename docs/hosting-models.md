# Hosting the team's models for the website

The website on Vercel cannot run the Python model server or Ollama. One machine (a team laptop, a lab PC or a cloud VM) runs them and Vercel reaches it through a tunnel. No external AI service is involved.

```
Vercel (website) ──HTTPS + Bearer token──► Cloudflare tunnel ──► model server 127.0.0.1:8000
                                                                   ├─ /parse     hirelabs-parser
                                                                   ├─ /extract-pdf pdfplumber fallback
                                                                   ├─ /embed     hirelabs-matcher
                                                                   └─ /api/chat ──► Ollama 127.0.0.1:11434 (hirelabs-evaluator)
```

The Next.js API uses `pdf-parse` first and calls the authenticated `/extract-pdf` endpoint when that returns no text or errors. The model server limits PDFs to 5 MB and extracts selectable text with `pdfplumber`; scanned/image-only PDFs still need OCR.

## Security

- **Shared token:** with `MODEL_API_TOKEN` set, the model server rejects every request without `Authorization: Bearer <token>` (HTTP 401). The only exception is `/health`, which reports readiness booleans only. The server refuses to start with a token shorter than 32 characters.
- **Ollama never leaves the machine.** Ollama has no login, so it stays on `127.0.0.1`. The website reaches it only through the model server's `/api/chat`, which:
  - accepts only `OLLAMA_MODEL` (default `hirelabs-evaluator`), with HTTP 403 for any other model
  - forces `stream: false`
  - passes only the `temperature`, `seed` and `num_ctx` options
  - caps `num_ctx` (`OLLAMA_MAX_CTX`, default 32768) and the prompt size (200,000 characters)
- **No open ports:** the model server listens on `127.0.0.1`, and the tunnel connects out to Cloudflare, so nothing on the machine is reachable directly.
- **Keep the token server-only.** Never give it a `NEXT_PUBLIC_` name: `scripts/verify-production.mjs` fails if one exists. Generate a new token whenever someone leaves the team or it is shared by mistake.

## One-time setup on the hosting machine

1. **Install Python 3.9+, Ollama and cloudflared.** On macOS, run `brew install cloudflared`. Other systems are covered by Cloudflare's "cloudflared downloads" page.
2. **Install the model server and the team's models.** From the repository root:

   ```sh
   python3 -m venv .venv
   .venv/bin/python -m pip install -r services/model-server/requirements.txt
   .venv/bin/python -m pip install <path to the hirelabs-parser wheel>
   ```

   Put the `hirelabs-matcher` model folder at `models/hirelabs-matcher`, or set `MATCHER_MODEL` to its path. The folder is private and shared outside git (for example `hirelabs-matcher.zip`): unzip it so that `models/hirelabs-matcher/model.safetensors` exists. The matcher needs `sentence-transformers` (with PyTorch) in the same environment, which the requirements file installs. After restarting the model server, `/health` shows `matcher_ready: true`.

   Resumes uploaded before the matcher was running have no embedding, so **Rank candidates** skips them. Re-upload them, or run `node --env-file=.env.local scripts/backfill-embeddings.mjs` with `MODEL_SERVER_URL`, `MODEL_API_TOKEN` and the Supabase service-role key (`SUPABASE_SERVICE_ROLE_KEY`, never `NEXT_PUBLIC_`) in that file; row-level security hides other users' resumes from the public key.
3. **Load the evaluator into Ollama.** The Modelfile should contain `PARAMETER num_ctx 16384`. In the folder with the evaluator GGUF and Modelfile, run:

   ```sh
   ollama create hirelabs-evaluator -f Modelfile
   ```

## Each time you host

1. **Start Ollama** on loopback:

   ```sh
   OLLAMA_HOST=127.0.0.1 ollama serve
   ```

2. **Start the model server and tunnel** in a second terminal:

   ```sh
   export MODEL_API_TOKEN=$(openssl rand -hex 32)   # or reuse the token already in Vercel
   bash scripts/host-models.sh
   ```

   The script:
   - checks the token, that Ollama is private and that the evaluator is loaded
   - starts the model server and waits for `/health`
   - opens a Cloudflare quick tunnel and prints its `https://….trycloudflare.com` address

3. **Point Vercel at the tunnel.** In Vercel, go to **Project → Settings → Environment Variables** and set the values below, then redeploy:

   | Variable | Value |
   |---|---|
   | `USE_LOCAL_MODELS` | `true` |
   | `MODEL_SERVER_URL` | the tunnel address |
   | `OLLAMA_URL` | the same tunnel address |
   | `MODEL_API_TOKEN` | the token from step 2 |
   | `OLLAMA_TIMEOUT_MS` | optional, up to `55000` if the evaluator is slow on this machine |

   The matcher URL follows `MODEL_SERVER_URL` automatically. Leave `EMBED_SERVICE_URL` unset on Vercel.

4. **Check it.** Open `https://<tunnel>/health`. `parser_ready`, `matcher_ready` and `evaluator_ready` report which services are ready. `evaluator_ready` is `false` when Ollama isn't running or doesn't have `OLLAMA_MODEL` loaded. Then, on the website:
   - Upload a resume. The HireLabs parser is preferred; configured Ollama fills profile fields it misses.
   - Rank candidates.
   - Run an evaluation and a role brief. Both show `hirelabs-evaluator`.

Keep the terminal open while the website is in use. Ctrl+C stops the tunnel and the model server. The website then returns 503 for AI features until hosting starts again.

## A stable address

A quick tunnel gets a new address every time it starts, so Vercel must be updated and redeployed each time. For a fixed address, create a named tunnel in a Cloudflare account with a domain and route a hostname such as `models.<your-domain>` to `http://127.0.0.1:8000`. Then run that tunnel in place of the last line of `scripts/host-models.sh`. The token check stays the same.

## Speed

The website gives the evaluator 35 seconds by default (`OLLAMA_TIMEOUT_MS`, at most 55 seconds, because Vercel stops the request at 60). Run a few evaluations on the hosting machine before the demo. If they come close to the limit, use a machine with a GPU or a smaller quantisation of the evaluator.

## Local development

Without `MODEL_API_TOKEN`, the model server accepts requests without a token and prints a warning. That is only safe on `127.0.0.1` with no tunnel. Locally, `OLLAMA_URL` can point straight at Ollama (`http://127.0.0.1:11434`) or at the model server (`http://127.0.0.1:8000`). Both work.

If you host a protected Ollama endpoint directly instead of using this model-server tunnel, set `OLLAMA_URL` to the full `/api/generate` URL and `OLLAMA_KEY` to the server's bearer token in the Next.js server environment. The app uses that endpoint for evaluation and as a fallback to extract structured resume profile fields. It sends resume text and the key only from server-side API routes. Use HTTPS, keep the endpoint protected, and never name the variable `NEXT_PUBLIC_OLLAMA_KEY`. PDFPlumber extraction and semantic embeddings still require the separately hosted model server.

Run the model server tests with:

```sh
.venv/bin/python -m pip install httpx
.venv/bin/python -m unittest discover -s services/model-server/tests -t services/model-server
```
