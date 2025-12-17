Implementasi Push-to-Talk (Speech-to-Text) menggunakan Google Cloud STT v2

Tujuan

Membangun fitur Push-to-Talk di browser yang:

Mengaktifkan mikrofon ketika tombol ditekan.

Mengirim audio secara streaming ke server melalui WebSocket.

Server meneruskan audio ke Google Cloud Speech-to-Text v2 via gRPC.

Hasil transkripsi teks dikirim kembali dan ditampilkan real-time di UI.

Arsitektur
Browser (User)
  │
  │ getUserMedia + WebSocket
  ▼
Server (Node.js)
  │
  │ gRPC stream
  ▼
Google Speech-to-Text API v2


Alur kerja

User menekan tombol “Tahan untuk bicara”.

Audio dari mikrofon dikirim ke backend sebagai PCM 16-bit.

Backend membuka stream ke Google STT.

Google STT mengirim hasil partial dan final ke backend.

Backend meneruskan hasil teks ke browser.

Browser menampilkan teks real-time di layar.

Prasyarat

Node.js 18+

Akun Google Cloud

Speech-to-Text API diaktifkan

Service Account dengan role Speech Admin

File service-account.json disimpan aman di server

Port 8080 terbuka untuk WebSocket lokal

Struktur Proyek
stt-ptt/
│
├── server/
│   └── index.js
│
└── web/
    ├── index.html
    ├── app.js
    └── pcm-worklet.js

Instalasi Server
cd server
npm init -y
npm install ws @google-cloud/speech


Environment Variable

GOOGLE_APPLICATION_CREDENTIALS=/path/ke/service-account.json
GCP_PROJECT_ID=your-project
GCP_LOCATION=global
PORT=8080

Server Code (Node.js)
import { WebSocketServer } from 'ws';
import { SpeechClient } from '@google-cloud/speech';

const port = process.env.PORT || 8080;
const project = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_LOCATION || 'global';

const client = new SpeechClient({ apiEndpoint: `${location}-speech.googleapis.com` });
const wss = new WebSocketServer({ port }, () => console.log('WS server listening on', port));

wss.on('connection', async ws => {
  const request = {
    recognizer: `projects/${project}/locations/${location}/recognizers/_`,
    streamingConfig: {
      config: {
        autoDecodingConfig: {},
        languageCodes: ['id-ID'],
        model: 'latest_long',
        features: { enableAutomaticPunctuation: true }
      },
      interimResults: true
    }
  };

  const stream = client.streamingRecognize()
    .on('error', err => ws.send(JSON.stringify({ type: 'error', message: err.message })))
    .on('data', resp => {
      const res = resp.results?.[0];
      if (!res) return;
      const alt = res.alternatives?.[0];
      if (!alt) return;
      ws.send(JSON.stringify({
        type: res.isFinal ? 'final' : 'partial',
        text: alt.transcript
      }));
    });

  // kirim konfigurasi awal
  stream.write({ streamingConfig: request.streamingConfig, recognizer: request.recognizer });

  ws.on('message', data => stream.write({ audio: { content: data } }));
  ws.on('close', () => stream.end());
});

Frontend
index.html
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Push to Talk STT</title>
  <style>
    body { font-family: system-ui; margin: 40px; }
    #ptt { font-size: 18px; padding: 12px 20px; }
    #out { border: 1px solid #ccc; padding: 12px; min-height: 120px; white-space: pre-wrap; }
    .partial { opacity: 0.6; }
  </style>
</head>
<body>
  <button id="ptt">Tahan untuk bicara</button>
  <div id="out"></div>
  <script type="module" src="./app.js"></script>
</body>
</html>

app.js
const btn = document.getElementById('ptt');
const out = document.getElementById('out');
let ws, audioCtx, workletNode;

async function initAudio() {
  audioCtx = new AudioContext({ sampleRate: 16000 });
  await audioCtx.audioWorklet.addModule('pcm-worklet.js');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const src = audioCtx.createMediaStreamSource(stream);
  workletNode = new AudioWorkletNode(audioCtx, 'pcm-writer');
  workletNode.port.onmessage = e => {
    if (e.data?.type === 'chunk' && ws?.readyState === WebSocket.OPEN) ws.send(e.data.buffer);
  };
  src.connect(workletNode);
}

function connect() {
  ws = new WebSocket(`ws://${location.hostname}:8080`);
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'partial') showPartial(msg.text);
    if (msg.type === 'final') appendFinal(msg.text);
  };
}

function showPartial(t) {
  const html = out.innerHTML.replace(/<span class="partial">.*<\/span>/, '');
  out.innerHTML = html + `<span class="partial">${t}</span>`;
}

function appendFinal(t) {
  const html = out.innerHTML.replace(/<span class="partial">.*<\/span>/, '');
  out.innerHTML = html + t + "\n";
}

btn.addEventListener('mousedown', async () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) connect();
  if (!audioCtx || audioCtx.state !== 'running') await initAudio();
});

btn.addEventListener('mouseup', async () => {
  if (ws && ws.readyState === WebSocket.OPEN) ws.close();
  if (audioCtx && audioCtx.state === 'running') await audioCtx.suspend();
});

pcm-worklet.js
class PCMWriter extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0][0];
    if (!input) return true;
    const buf = new ArrayBuffer(input.length * 2);
    const view = new DataView(buf);
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    this.port.postMessage({ type: 'chunk', buffer: buf }, [buf]);
    return true;
  }
}
registerProcessor('pcm-writer', PCMWriter);

Format Audio

Mono, PCM 16-bit LE

Sample Rate 16000 Hz

Gunakan autoDecodingConfig agar API mendeteksi otomatis.

Pengujian Lokal
node server/index.js


Buka web/index.html di browser (localhost aman tanpa HTTPS).
Tahan tombol Tahan untuk bicara, ucapkan sesuatu, teks akan muncul.

Catatan Keamanan

Simpan service-account.json hanya di server, jangan di frontend.

Gunakan HTTPS saat di-deploy agar izin mikrofon nyaman.

Tambahkan autentikasi sebelum membuka WebSocket publik.

Optimalisasi

Aktifkan enableAutomaticPunctuation untuk hasil alami.

Tambah noiseSuppression dan echoCancellation di getUserMedia.

Untuk performa tinggi gunakan Cloud Run / App Engine sebagai backend.

Bila ingin integrasi ke dashboard Next.js, cukup jadikan file server ini middleware API.

Troubleshooting
Gejala	Solusi
Tidak muncul teks	Pastikan format PCM benar dan interimResults: true
Error PERMISSION_DENIED	Cek API key dan role Service Account
Delay tinggi	Gunakan sample rate 16 kHz dan koneksi WebSocket lokal
Hasil tidak akurat	Ubah languageCodes ke id-ID atau model lain
Referensi

Google Cloud Speech-to-Text Docs

SpeechClient API Reference

AudioWorklet MDN

Integrasi Lanjutan

Tambah ikon mic di UI yang berubah warna ketika merekam.