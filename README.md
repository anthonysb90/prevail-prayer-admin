# Prevail Prayer — Admin Panel

Web-based admin panel for managing the Prevail Prayer app.

Built with Next.js 14, Tailwind CSS, and Supabase.

## Setup

```bash
git clone https://github.com/anthonysb90/prevail-prayer-admin.git
cd prevail-prayer-admin
npm install
cp .env.example .env.local
```

Add your Supabase credentials to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://pvcxobbqbugghlqjpmph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

```bash
npm run dev
```

## Make yourself an admin

In the Supabase SQL editor:
```sql
UPDATE profiles SET is_admin = TRUE WHERE id = 'your-user-uuid';
```

Or create a new account via the Prevail Prayer app, then run the above.

## Deploy to Vercel

1. Push to GitHub
2. Import at vercel.com
3. Add environment variables
4. Deploy

## Features

| Section | Description |
|---|---|
| Dashboard | Live stats: users, prayers, sessions |
| Devotions | Create/edit devotions with image, scripture, questions, prayer |
| Scripture | Add/remove KJV verses by topic, toggle featured |
| Music | Manage prayer timer tracks, toggle availability |
| Notifications | Compose and send push notifications to all users |
| Users | View all users with subscription status and activity |
