# Howlett House
### The motherboard — crew command center for the Howlett operation

Built with React, Supabase (real-time DB + magic link auth), and Tailwind CSS.

---

## Deploy in 4 steps

### Step 1 — Set up the database in Supabase

1. Go to your Supabase dashboard, select or create a project called howlett-house
2. Click SQL Editor in the left sidebar
3. Paste the entire contents of supabase-setup.sql and click Run
4. That creates all 7 tables, security policies, real-time subscriptions, and seeds your real projects

### Step 2 — Get your Supabase keys

1. In Supabase: Settings > API
2. Copy Project URL — this is your VITE_SUPABASE_URL
3. Copy anon / public key — this is your VITE_SUPABASE_ANON_KEY

### Step 3 — Push to GitHub

git init
git add .
git commit -m "Howlett House — initial build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/howlett-house.git
git push -u origin main

### Step 4 — Deploy to Vercel

1. Go to vercel.com, Add New Project, import your howlett-house repo
2. In Environment Variables add:
   - VITE_SUPABASE_URL = your Supabase project URL
   - VITE_SUPABASE_ANON_KEY = your anon key
3. Click Deploy

### Connect howletthouse.com (GoDaddy to Vercel)

1. In Vercel: project Settings > Domains > add howletthouse.com
2. Vercel shows you DNS records to add
3. In GoDaddy: DNS > Add Record
   - Type A, Name @, Value 76.76.21.21
   - Type CNAME, Name www, Value cname.vercel-dns.com
4. Wait 10-30 min — then howletthouse.com is live

---

## Adding crew members

1. Go to Crew page > Add member > enter name, role, email
2. They go to howletthouse.com > enter email > get a magic link
3. One click and they are in — works on any phone anywhere in the world

---

## Local development

cp .env.example .env
(add your Supabase keys)
npm install
npm run dev
