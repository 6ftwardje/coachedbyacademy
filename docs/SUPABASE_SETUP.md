# Supabase correct instellen (magic link / auth)

De fout **"TypeError: Failed to fetch"** bij magic link komt bijna altijd door verkeerde waarden in `.env`.

## 1. Juiste waarden in Supabase Dashboard

1. Ga naar [Supabase Dashboard](https://supabase.com/dashboard) → jouw project.
2. Open **Project Settings** (tandwiel linksonder) → **API**.
3. Gebruik daar:

| .env variabele | Waar te vinden | Voorbeeld / opmerking |
|----------------|----------------|------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** (niet "Database"!) | `https://vldvzhxmyuybfpiezbcd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Project API keys** → **anon** **public** (niet service_role!) | Lange JWT die begint met `eyJ...` |

## Welke key in .env? (anon vs service_role)

In **Project Settings → API → Project API keys** staan twee keys:

| Key | Gebruik | In .env? |
|-----|--------|----------|
| **anon** **public** | Mag in de browser; gebruikt door login, RLS, etc. | ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** | Geheim; alleen server-side, bypass RLS. Nooit in de browser. | ❌ Niet in een `NEXT_PUBLIC_` variabele |

Als je de **service_role** key in `NEXT_PUBLIC_SUPABASE_ANON_KEY` zet, krijg je: *"Forbidden use of secret API key in browser"*. Vervang die dan door de **anon public** key.

## Veelgemaakte fouten

- **Verkeerde URL**  
  Je moet de **Project URL** gebruiken (zoals `https://xxxxx.supabase.co`), **niet** de database connection string (`postgresql://postgres:...@db.xxxxx.supabase.co:5432/postgres`). Auth en de REST API werken alleen met de HTTPS URL.

- **Verkeerde key → "Forbidden use of secret API key in browser"**  
  Je gebruikt dan de **service_role** key (of een andere geheime key). Die mag nooit in de browser.  
  Gebruik uitsluitend de **anon public** key (mag in de browser), niet:
  - de **service_role** key (alleen server-side),
  - een wachtwoord of "sb_secret_..." string.

## 3. Voorbeeld .env

```env
# API URL uit Dashboard → Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_URL=https://vldvzhxmyuybfpiezbcd.supabase.co

# Anon public key uit Dashboard → Project Settings → API → anon public
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Vervang de tweede regel door jouw echte **anon public** key uit het dashboard.

## 4. Redirect URL voor magic link

1. In Supabase: **Authentication** → **URL Configuration**.
2. Vul bij **Redirect URLs** in:
   - `http://localhost:3000/auth/callback` (lokaal)
   - Later ook je productie-URL, bv. `https://jouw-site.netlify.app/auth/callback`

Zonder deze redirect kan de magic link na klikken niet terug naar je app.

## 5. Na aanpassen van .env

- Stop de dev server (Ctrl+C) en start opnieuw: `npm run dev`.
- Next.js leest `.env` alleen bij opstarten.

## 6. Controleren

- In de browser: op de login-pagina een e-mail invullen en op "Send magic link" klikken.
- Geen "Failed to fetch" meer → de URL en anon key kloppen.
- Check je e-mail (en spam) voor de link; die moet naar `jouw-origin/auth/callback?code=...` gaan.

Als het dan nog faalt, controleer de browser console (F12) en het **Network** tabblad: welk request faalt (URL en status)?
