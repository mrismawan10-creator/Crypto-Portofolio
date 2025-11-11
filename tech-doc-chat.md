# **Tech-Doc Chat — Frontend AI Chat (Integrasi n8n Webhook)**

## **Tujuan**
Website dashboard pribadi menampilkan fitur chat AI yang berinteraksi langsung dengan **n8n**, bukan database atau API pihak ketiga lainnya.  
Frontend hanya menangani pengiriman dan tampilan pesan, sementara semua logika (pembacaan dokumen, embedding, pencarian konteks, dan jawaban AI) diatur sepenuhnya oleh workflow **n8n**.

---

## **Arsitektur Sistem**

### **Frontend**
- **Framework:** Next.js 15 (App Router)
- **UI Library:** TailwindCSS + shadcn/ui  
- **Animasi:** Framer Motion  
- **Style:** Clean + glassmorphic ala Apple  
- **Mode:** Light & Dark mode  
- **State Management:** Zustand  
- **Optional Auth:** Clerk  

### **Komponen Utama**
| Komponen | Fungsi |
|-----------|---------|
| `ChatWindow.tsx` | Menampilkan seluruh percakapan |
| `ChatInput.tsx` | Textarea + tombol kirim pesan |
| `MessageBubble.tsx` | Render bubble user/AI, mendukung teks & link |
| `ChatHeader.tsx` | Pilihan metode (Journal, Feynman, Hegelian, dst.) & tombol aksi |
| `TypingIndicator.tsx` | Animasi “AI sedang mengetik” |
| `Toast` | Menampilkan notifikasi (error/success) |

---

## **Alur Komunikasi**

### **1. Chat dengan AI**
Frontend hanya mengirim `POST` ke endpoint berikut:
```
https://n8n-ihbhyal9odxn.budi.sumopod.my.id/webhook/AI-Mentor
```

Contoh pengiriman:
```ts
await fetch(process.env.NEXT_PUBLIC_WEBHOOK_URL!, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: userMessage,
    user_id: sessionId,
    method: currentMethod, // "journal assistant" | "feynman method" | dll.
  }),
});
```

Respons dari n8n bisa berbentuk:
```json
{ "message": "Halo! Berdasarkan dokumenmu, jawabannya adalah..." }
```
atau
```json
[
  { "message": "Halo! Berdasarkan dokumenmu, jawabannya adalah..." }
]
```
atau bahkan teks polos:
```
Halo! Berdasarkan dokumenmu, jawabannya adalah...
```

Parsing respons dilakukan dengan fallback:
```ts
const res = await response.text();
let reply = res;
try {
  const data = JSON.parse(res);
  reply = data.message || data.text || data.reply || data.response || res;
} catch {}
```

---

### **2. Membuat Dokumen Ringkasan**
Dipicu dari tombol di `ChatHeader`.  
Frontend kirim request ke webhook:
```
https://n8n-ihbhyal9odxn.budi.sumopod.my.id/webhook/summary
```

Contoh payload:
```json
{ "user_id": "user_123", "method": "feynman method" }
```

Respons n8n bisa berupa:
```json
{ "message": "Ringkasan telah dibuat: https://example.com/summary.pdf" }
```
UI akan menampilkan link dokumen dalam bubble AI dan menampilkan notifikasi sukses.

---

### **3. Mengubah Pesan Jadi Voice Note (Text-to-Speech)**
Dipicu dari tombol “🔊” di bubble AI.  
Frontend kirim ke webhook:
```
https://n8n-ihbhyal9odxn.budi.sumopod.my.id/webhook/text-to-speech-voice-note
```

Payload:
```json
{ "user_id": "user_123", "message": "Halo, ini pesan yang ingin dikonversi ke audio." }
```

Respons:
```json
{ "url": "https://n8n-storage/audio/voice_123.mp3" }
```

Frontend akan menampilkan player audio:
```html
<audio controls src="https://n8n-storage/audio/voice_123.mp3"></audio>
```

---

## **Struktur Folder (Frontend)**

```
src/
├─ components/
│  ├─ ChatWindow.tsx
│  ├─ ChatInput.tsx
│  ├─ MessageBubble.tsx
│  ├─ ChatHeader.tsx
│  ├─ TypingIndicator.tsx
│  └─ ui/*
├─ store/
│  ├─ useChatStore.ts
│  ├─ useMethodStore.ts
│  └─ useSessionStore.ts
├─ app/
│  └─ page.tsx                # Entry point chat
└─ styles/
   └─ globals.css
```

---

## **State Management (Zustand)**

**Chat Store**
```ts
interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  voiceUrl?: string;
}

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  addMessage: (msg: Message) => void;
  setTyping: (state: boolean) => void;
}
```

**Session Store**
```ts
interface SessionState {
  userId: string;
  resetSession: () => void;
}
```

**Method Store**
```ts
interface MethodState {
  method: string;
  setMethod: (m: string) => void;
}
```

---

## **Variabel Lingkungan**

Tambahkan di `.env.local`:
```env
NEXT_PUBLIC_WEBHOOK_URL=https://n8n-ihbhyal9odxn.budi.sumopod.my.id/webhook/AI-Mentor
NEXT_PUBLIC_SUMMARY_URL=https://n8n-ihbhyal9odxn.budi.sumopod.my.id/webhook/summary
NEXT_PUBLIC_TTS_URL=https://n8n-ihbhyal9odxn.budi.sumopod.my.id/webhook/text-to-speech-voice-note
```

Gunakan di kode:
```ts
const CHAT_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL!;
const SUMMARY_URL = process.env.NEXT_PUBLIC_SUMMARY_URL!;
const TTS_URL = process.env.NEXT_PUBLIC_TTS_URL!;
```

---

## **UX & Error Handling**

- Indikator mengetik muncul saat menunggu respons.
- Bila `fetch` gagal → tampilkan toast: *“Koneksi gagal, coba lagi.”*
- Bila parsing JSON gagal → fallback ke teks biasa.
- Tombol “Reset Session” membuat `userId` baru (gunakan `crypto.randomUUID()`).

---

## **Rencana Pengembangan**
- Tambah *streaming response* bila n8n mendukung SSE.
- Tambah *history chat* tersimpan di browser (localStorage).
- Integrasi *voice-to-text* (speech recognition).
- Tambah *document-aware context toggle* untuk ganti sumber referensi dokumen.

---

## **Prompt Codex / Lovable**
```
Build a Next.js 15 chat module that posts messages to
https://n8n-ihbhyal9odxn.budi.sumopod.my.id/webhook/AI-Mentor
and displays the AI’s replies in a clean, glassmorphic UI.
Include buttons for “Create Summary” (calls /summary webhook)
and “Voice Note” (calls /text-to-speech-voice-note webhook).
Use Tailwind + shadcn/ui with light/dark mode.
```
