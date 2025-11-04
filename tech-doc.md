Tech Spec Document: Salvus Crypto Portfolio Tracker
1. Tujuan

Website interaktif untuk memantau portofolio crypto pribadi, dengan tampilan clean & glassmorphic ala Apple, mendukung Light/Dark Mode, serta terhubung dengan Supabase dan CoinGecko API agar harga selalu realtime.

2. Tech Stack

Framework: Next.js (App Router)

UI: TailwindCSS + shadcn/ui

Database & Backend: Supabase (PostgreSQL + Edge Functions)

Auth: Clerk (multi-provider login)

AI Integration: Vercel AI SDK

Realtime Data: CoinGecko API

Deployment: Vercel

3. Fitur Utama

Dashboard Realtime

Tabel aset: nama, kode, jumlah, harga terkini, nilai total, P/L.

Contoh aset awal:

BTC (Bitcoin)

HYPE (HyperLiquid)

Tampilan bergaya glass effect dan auto mode switching (light/dark).

Manajemen Aset

Tambah, edit, hapus aset crypto.

Data disimpan di Supabase.

Harga otomatis diambil dari CoinGecko.

Autentikasi User

Menggunakan Clerk (Email / Google / GitHub).

Setiap user hanya dapat melihat portofolio miliknya.

AI Portfolio Insight

Menggunakan AI SDK untuk menganalisis portofolio.

Contoh: "Berapa total keuntungan saya bulan ini?" → dijawab otomatis.

4. Alur Aplikasi
flowchart TD
A[Login via Clerk] --> B[Dashboard Page]
B --> C[Fetch Portfolio from Supabase]
B --> D[Fetch Realtime Prices from CoinGecko]
C --> E[Tampilkan Tabel BTC & HYPE]
E --> F[AI SDK - Analisis Portofolio]
E --> G[Add/Edit Asset → Update ke Supabase]

5. Database Schema (Supabase)
Table: crypto_portfolio
Kolom	Tipe	Keterangan
id	uuid (PK)	Auto generated
user_id	uuid	Relasi ke Clerk
code	text	Kode aset (mis. BTC, HYPE)
name	text	Nama aset
amount	numeric	Jumlah kepemilikan
avg_price_usd	numeric	Harga beli rata-rata
current_price_usd	numeric	Harga terkini dari CoinGecko
current_value_usd	numeric	amount × current_price_usd
pl_usd	numeric	Profit/loss absolut
pl_percent	numeric	Profit/loss dalam persen
updated_at	timestamp	Otomatis terisi saat update
Seed Example Data
code	name	amount	avg_price_usd	current_price_usd
BTC	Bitcoin	0.05	65000	(from CoinGecko)
HYPE	HyperLiquid	100	40	(from CoinGecko)
6. Integrasi API

CoinGecko API

GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,hyperliquid&vs_currencies=usd


Supabase CRUD

Insert / Update / Delete aset via Supabase client.

Gunakan Row Level Security (RLS) berbasis user_id.

Clerk Auth

Gunakan user.id untuk filter data per user.

AI SDK

Analisis otomatis P/L, top gainer, atau prediksi harga sederhana.

7. UI & UX Guideline

Style:

Minimalist, clean, efek kaca lembut.

Gunakan backdrop-blur-xl + transparency 60%.

Font: SF Pro Display

Mode: Light / Dark dengan auto switch

Komponen:

Sidebar → Navigasi (Dashboard, Add Asset, Settings)

Main Content → Portfolio Table (BTC, HYPE)

Floating Action Button → “+ Add Asset”

Toggle → “Dark/Light Mode”