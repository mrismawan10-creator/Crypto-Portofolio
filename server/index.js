import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { WebSocketServer } from "ws";
import { SpeechClient } from "@google-cloud/speech";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// load env, prefer root .env.local (shared) then fallback to server/.env
const rootEnv = path.resolve(__dirname, "..", ".env.local");
const serverEnv = path.join(__dirname, ".env");
const envPath = fs.existsSync(rootEnv) ? rootEnv : serverEnv;
loadEnv({ path: envPath });

const port = process.env.PORT || 8080;
let project = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_LOCATION || "global";
const expectedKey = process.env.STT_API_KEY;

// ensure GOOGLE_APPLICATION_CREDENTIALS is absolute and set
const keyPathFromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, "keys", "stt-service-account.json");
const keyPath = path.isAbsolute(keyPathFromEnv) ? keyPathFromEnv : path.resolve(__dirname, keyPathFromEnv);
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

if (!project) {
  try {
    const raw = fs.readFileSync(keyPath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.project_id) {
      project = parsed.project_id;
      console.log(`GCP_PROJECT_ID diambil dari service account: ${project}`);
    }
  } catch (err) {
    console.warn("Gagal membaca project_id dari service account:", err?.message || err);
  }
}

if (!project) {
  console.warn("GCP_PROJECT_ID tidak terisi. Isi di server/.env agar STT aktif.");
}

const client = new SpeechClient({ apiEndpoint: `${location}-speech.googleapis.com` });
const wss = new WebSocketServer({ port }, () => console.log(`STT WS server listening on ${port}`));

const streamingConfig = {
  config: {
    autoDecodingConfig: {},
    languageCodes: ["id-ID"],
    model: "latest_long",
    features: { enableAutomaticPunctuation: true },
  },
  interimResults: true,
};

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", "http://localhost");
  const clientKey = url.searchParams.get("key");
  if (expectedKey && clientKey !== expectedKey) {
    ws.close(1008, "Invalid STT key");
    return;
  }

  console.log("Client connected for STT");

  const stream = client
    .streamingRecognize()
    .on("error", (err) => {
      console.error("STT stream error:", err.message);
      safeSend(ws, { type: "error", message: err.message });
      ws.close(1011, "STT error");
    })
    .on("data", (resp) => {
      const res = resp.results?.[0];
      if (!res) return;
      const alt = res.alternatives?.[0];
      if (!alt?.transcript) return;
      safeSend(ws, { type: res.isFinal ? "final" : "partial", text: alt.transcript });
    });

  // send initial config
  stream.write({ streamingConfig, recognizer: `projects/${project}/locations/${location}/recognizers/_` });

  ws.on("message", (data) => {
    const buffer = bufferFromData(data);
    if (!buffer) return;
    stream.write({ audio: { content: buffer } });
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    stream.end();
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
    stream.end();
  });
});

function bufferFromData(data) {
  if (data instanceof Buffer) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (Array.isArray(data)) return Buffer.from(data);
  try {
    return Buffer.from(data);
  } catch {
    return null;
  }
}

function safeSend(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}
