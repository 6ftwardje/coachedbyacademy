# Supabase instellen voor registratie en login

De app gebruikt Supabase Auth met e-mailadres en wachtwoord. Nieuwe studenten
registreren zichzelf, bevestigen hun e-mailadres en kunnen daarna opnieuw inloggen.
De app maakt na de eerste geldige sessie automatisch de bijbehorende rij in
`public.students` aan.

## 1. API-gegevens in `.env`

1. Ga naar [Supabase Dashboard](https://supabase.com/dashboard) en open het project.
2. Open **Project Settings** -> **API Keys**.
3. Zet de publieke client-key en de Project URL in `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw_publishable_of_legacy_anon_key
```

Gebruik voor `NEXT_PUBLIC_SUPABASE_ANON_KEY` bij voorkeur de **Publishable key**
(`sb_publishable_...`). Een bestaande legacy **anon public** JWT blijft ook werken.
Gebruik nooit een **Secret key**, legacy **service_role** key of databasewachtwoord
in een `NEXT_PUBLIC_` variabele.

Herstart na een wijziging de devserver:

```bash
npm run dev
```

## 2. E-mail en wachtwoord activeren

1. Ga naar **Authentication** -> **Providers** -> **Email**.
2. Zet **Enable Email provider** aan.
3. Zet **Allow new users to sign up** aan.
4. Laat **Confirm email** aanstaan. Dan krijgt een nieuwe student pas toegang na
   het aanklikken van de bevestigingsmail.
5. Sla de wijzigingen op.

De loginpagina gebruikt minimaal 8 tekens voor een wachtwoord. Je kunt in
**Authentication** -> **Password Security** strengere regels instellen als dat
past bij je beleid.

## 3. URL Configuration invullen

Ga naar **Authentication** -> **URL Configuration**.

Voor lokaal ontwikkelen:

| Instelling | Waarde |
| --- | --- |
| **Site URL** | je actieve devserver, bv. `http://localhost:3002` |
| **Redirect URLs** | `http://localhost:3000/auth/callback**`, `http://localhost:3000/auth/confirm**`, `http://localhost:3001/auth/callback**`, `http://localhost:3001/auth/confirm**`, `http://localhost:3002/auth/callback**`, `http://localhost:3002/auth/confirm**` |

Voeg bij een productieomgeving ook toe:

```text
https://jouw-domein.nl/auth/callback**
https://jouw-domein.nl/auth/confirm**
```

Zet de **Site URL** in productie op je echte domein. De callback verwerkt zowel
de bevestigingsmail na registratie als de link voor wachtwoordherstel. De
`/auth/confirm` route verwerkt uitnodigingen via `token_hash`, zodat invite-links
ook goed werken met server-side rendering.

## 3b. Invite mailtemplate instellen

1. Ga naar **Authentication** -> **Email Templates**.
2. Open **Invite user**.
3. Zet het onderwerp op:

```text
Je toegang tot CoachedBy Academy
```

4. Plak de HTML uit:

```text
docs/supabase-invite-email-template.html
```

De template gebruikt `{{ .SiteURL }}` en `{{ .TokenHash }}` om altijd rechtstreeks
naar `/auth/confirm` te linken. Zo blijft de uitnodiging werken wanneer Supabase
een niet-toegestane `redirectTo` vervangt door de Site URL. De app geeft daarnaast
een redirect naar `/auth/confirm?next=/account/update-password` mee; houd daarom
ook de productie- en previewvarianten van `/auth/confirm**` in de Redirect URLs
allowlist.

De middleware herkent oudere, fout opgebouwde links met
`/&token_hash=...&type=invite` en stuurt ze door naar `/auth/confirm`. Dit vangnet
kan worden verwijderd nadat alle uitnodigingen met de oude template zijn verlopen.

## 4. Database-migraties toepassen

De app gebruikt RLS. Een ingelogde gebruiker mag uitsluitend zijn eigen
`students`-profiel aanmaken en bekijken. De benodigde policy staat in:

```text
supabase/migrations/20260319000000_students_insert_policy.sql
```

Pas alle lokale migraties toe op het gekoppelde Supabase-project:

```bash
supabase db push
```

Gebruik je de CLI niet, voer de nog ontbrekende migraties dan in volgorde uit via
**SQL Editor** in het Dashboard.

## 5. E-mailbezorging voor productie

Voor een eerste lokale test kun je de ingebouwde Supabase-mailservice gebruiken
met e-mailadressen van leden van je Supabase-projectteam. Andere adressen worden
zonder eigen SMTP-provider geweigerd. De ingebouwde service is beperkt en niet
bedoeld voor productie. Stel voor live gebruik via
**Project Settings** -> **Authentication** -> **SMTP Settings** een eigen SMTP-provider
in en controleer de afzendernaam en het afzenderadres.

De ingebouwde service verstuurt maximaal 2 auth-mails per uur, gezamenlijk voor
registratie en wachtwoordherstel. Daarnaast geldt standaard een wachttijd van
60 seconden voordat dezelfde gebruiker opnieuw een registratie- of resetmail kan
aanvragen. Bij overschrijding antwoordt Supabase met `429 Too Many Requests`.

Met een eigen SMTP-provider kun je het projectbrede e-maillimiet daarna aanpassen
via **Authentication** -> **Rate Limits**. Laat de wachttijd per gebruiker staan
tenzij er een goede reden is om deze te verlagen.

## 6. Controleren

1. Open `http://localhost:3000`.
2. Kies **Registreren**, vul naam, e-mailadres en wachtwoord in.
3. Klik op de link in de bevestigingsmail.
4. Controleer dat je op `/dashboard` belandt.
5. Log uit en log opnieuw in met hetzelfde e-mailadres en wachtwoord.
6. Test **Wachtwoord vergeten?** en kies via de resetmail een nieuw wachtwoord.

Als registratie wel lukt maar de callback niet, controleer dan eerst
**Authentication** -> **URL Configuration**. Als de app geen profiel kan aanmaken,
controleer dan of de migratie met `students_insert_own` is toegepast.

Krijg je `429 Too Many Requests` bij registratie of wachtwoordherstel, wacht dan
tot het limiet is hersteld of configureer een eigen SMTP-provider. Dit ontstaat
voordat de callbackroute van de app wordt aangeroepen.
