Techdoc-Service-Account.md

Konfigurasi Aman Google Cloud Service Account untuk Speech-to-Text

Tujuan

Menyediakan cara standar menyimpan dan mengonfigurasi file service-account.json agar server Node.js bisa terautentikasi dengan Google Cloud Speech-to-Text API, tanpa mengekspos kredensial ke publik atau frontend.

Struktur Folder Direkomendasikan
stt-ptt/
├── server/
│   ├── index.js
│   ├── .env
│   └── keys/
│       └── stt-service-account.json   ← di sini kamu simpan file JSON
└── web/
    ├── index.html
    └── app.js

1. Menyimpan File JSON
Langkah:

Buat folder baru di dalam server/:

mkdir -p server/keys


Salin file .json hasil unduhan dari Google Cloud Console ke folder itu.
Contoh:

server/keys/stt-service-account.json


Pastikan file tidak diupload ke GitHub atau sistem version control.

Tambahkan ke .gitignore:
# ignore semua key service
server/keys/*.json

2. Menambahkan Konfigurasi di .env

Buat file .env di folder server/:

GOOGLE_APPLICATION_CREDENTIALS=./server/keys/stt-service-account.json
GCP_PROJECT_ID=your-project-id
GCP_LOCATION=global
PORT=8080


Keterangan:

GOOGLE_APPLICATION_CREDENTIALS: path lokal ke file JSON service account.

GCP_PROJECT_ID: ID project Google Cloud kamu (bisa dilihat di Cloud Console).

GCP_LOCATION: biasanya global, tapi bisa asia-southeast1 jika ingin region tertentu.

PORT: port lokal server WebSocket kamu.

3. Menggunakan di Kode Node.js

Pastikan server menggunakan library resmi Google:

npm install @google-cloud/speech


Lalu di file server/index.js:

import { SpeechClient } from '@google-cloud/speech';

const client = new SpeechClient(); // otomatis baca dari GOOGLE_APPLICATION_CREDENTIALS

// cek apakah berhasil terautentikasi
async function testAuth() {
  const [response] = await client.getSupportedLanguages();
  console.log('Auth OK. Bahasa yang tersedia:', response.languages.length);
}

testAuth().catch(console.error);


Jika koneksi sukses, berarti file JSON terbaca dengan benar.

4. Jalankan Server Lokal
node server/index.js


Jika tidak ada error PERMISSION_DENIED, berarti kredensial valid.
Jika muncul error:

Error: 7 PERMISSION_DENIED: The caller does not have permission


→ pastikan service-account.json punya role “Speech Admin” atau “Cloud Speech Client” di IAM Google Cloud.

5. Keamanan & Backup
Risiko	Pencegahan
File JSON bocor	Jangan commit ke repo publik
Kredensial disalin ke frontend	Simpan hanya di server
File hilang	Simpan salinan terenkripsi (misal 1Password / GCP Secret Manager)
Server produksi	Gunakan Secret Manager / Env base64
6. Opsi Aman untuk Deploy Production
Opsi A – Gunakan Secret Manager (Google Cloud)

Jika kamu jalankan di Cloud Run:

Buka Secret Manager → Create Secret.

Nama: stt_service_account

Paste isi file JSON ke dalam secret.

Di Cloud Run → Variables & Secrets → tambahkan secret itu sebagai file.

Set env di Cloud Run:

GOOGLE_APPLICATION_CREDENTIALS=/secrets/stt_service_account

Opsi B – Encode JSON ke Base64 (untuk platform non-GCP)

Jika kamu deploy di Render, Railway, atau Vercel:

Encode file JSON:

cat server/keys/stt-service-account.json | base64


Copy hasil encode (panjang sekali).

Simpan di .env:

GCP_KEY_BASE64=eyAi... (hasil base64)


Di index.js, tambahkan:

import fs from 'fs';

const tmp = './tmp';
const keyFile = `${tmp}/gcp-key.json`;

if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
fs.writeFileSync(keyFile, Buffer.from(process.env.GCP_KEY_BASE64, 'base64'));

process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFile;


Sekarang server tetap bisa autentikasi tanpa menyimpan file fisik.

7. Verifikasi Role Service Account

Masuk ke:

Google Cloud Console → IAM & Admin → Service Accounts → (pilih akun kamu)


Pastikan role berikut aktif:

Cloud Speech Client

atau Speech Admin

8. Checklist Akhir

✅ File .json disimpan di server/keys/
✅ .gitignore melindungi file
✅ .env menunjuk ke file JSON
✅ @google-cloud/speech terinstal
✅ Server bisa memanggil SpeechClient() tanpa error

Contoh Log Berhasil
WS server on 8080
Auth OK. Bahasa yang tersedia: 86
Speech-to-Text streaming aktif.

Referensi

Google Cloud Speech-to-Text Docs

Google Authentication Overview

Node.js Client Library