import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { WebSocketServer } from "ws";
import { SpeechClient } from "@google-cloud/speech";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// load env: only .env.local (root preferred, fallback to server/.env.local)
const envCandidates = [path.resolve(__dirname, "..", ".env.local"), path.join(__dirname, ".env.local")].filter((p) =>
  fs.existsSync(p)
);
if (envCandidates.length) {
  loadEnv({ path: envCandidates });
}

const port = process.env.PORT || 8080;
let project = process.env.GCP_PROJECT_ID;
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

const client = new SpeechClient();
const wss = new WebSocketServer({ port }, () => console.log(`STT WS server listening on ${port}`));

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", "http://localhost");
  const clientKey = url.searchParams.get("key");
  if (expectedKey && clientKey !== expectedKey) {
    ws.close(1008, "Invalid STT key");
    return;
  }

  console.log("Client connected for STT");

  let recognizeStream = null;
  const startStream = () => {
    if (recognizeStream) return recognizeStream;
    console.log("Starting STT stream...");
    const request = {
      config: {
        encoding: "WEBM_OPUS", // cocok dengan output MediaRecorder (audio/webm;codecs=opus)
        sampleRateHertz: 48000,
        languageCode: "id-ID",
        enableAutomaticPunctuation: true,
      },
      interimResults: true,
    };

    recognizeStream = client
      .streamingRecognize(request)
      .on("error", (err) => {
        console.error("STT stream error:", err.message);
        safeSend(ws, { type: "error", message: err.message });
        ws.close(1011, "STT error");
      })
      .on("data", (resp) => {
        const result = resp.results?.[0];
        const transcript = result?.alternatives?.[0]?.transcript;
        if (transcript) {
          safeSend(ws, { type: result.isFinal ? "final" : "partial", text: transcript });
        }
      });
    return recognizeStream;
  };

  ws.on("message", (data) => {
    // handle JSON config handshake first
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        if (parsed?.config) {
          console.log("Received config, starting STT stream...");
          startStream();
          return;
        }
      } catch {
        // not JSON, treat as audio
      }
    }

    if (!recognizeStream) {
      console.warn("Audio received before config, ignoring...");
      return;
    }

    const buffer = bufferFromData(data);
    if (!buffer) return;
    recognizeStream.write({ audio_content: buffer });
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    if (recognizeStream) recognizeStream.end();
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
    if (recognizeStream) recognizeStream.end();
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
