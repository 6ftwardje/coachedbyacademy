-- Add lesson takeaways and simple, lesson-scoped action tracking.

alter table public.lessons add column if not exists takeaway text;
alter table public.lessons add column if not exists action_items jsonb not null default '[]'::jsonb;

alter table public.lessons drop constraint if exists lessons_action_items_array_check;
alter table public.lessons add constraint lessons_action_items_array_check
  check (jsonb_typeof(action_items) = 'array');

create table if not exists public.lesson_action_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  lesson_id bigint not null references public.lessons (id) on delete cascade,
  action_index integer not null check (action_index >= 0),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id, action_index)
);

drop trigger if exists set_lesson_action_progress_updated_at on public.lesson_action_progress;
create trigger set_lesson_action_progress_updated_at
  before update on public.lesson_action_progress
  for each row
  execute function public.set_updated_at();

create index if not exists idx_lesson_action_progress_student_id
  on public.lesson_action_progress (student_id);
create index if not exists idx_lesson_action_progress_lesson_id
  on public.lesson_action_progress (lesson_id);

alter table public.lesson_action_progress enable row level security;

drop policy if exists "lesson_action_progress_select_own" on public.lesson_action_progress;
create policy "lesson_action_progress_select_own"
  on public.lesson_action_progress for select
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = lesson_action_progress.student_id
        and s.auth_user_id = auth.uid()
    )
  );

drop policy if exists "lesson_action_progress_insert_own" on public.lesson_action_progress;
create policy "lesson_action_progress_insert_own"
  on public.lesson_action_progress for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.students s
      where s.id = lesson_action_progress.student_id
        and s.auth_user_id = auth.uid()
    )
  );

drop policy if exists "lesson_action_progress_update_own" on public.lesson_action_progress;
create policy "lesson_action_progress_update_own"
  on public.lesson_action_progress for update
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = lesson_action_progress.student_id
        and s.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.students s
      where s.id = lesson_action_progress.student_id
        and s.auth_user_id = auth.uid()
    )
  );

drop policy if exists "lesson_action_progress_select_admin" on public.lesson_action_progress;
create policy "lesson_action_progress_select_admin"
  on public.lesson_action_progress for select
  to authenticated
  using (public.is_platform_admin());

-- Seed concise, transcript-based actions when matching modules already exist.
with content(module_pattern, lesson_order, takeaway, action_items) as (
  values
    ('start', 1, 'Bouw eerst een helder fundament: jouw sterktes, inspiratie en business blueprint.', '["Maak een Miro-bord aan voor je business blueprint.","Noteer vijftig sterktes en leg per sterkte de link met coaching.","Kies drie tot vijf merken of personal brands die jou aanspreken."]'::jsonb),
    ('start', 2, 'Een sterk personal brand maakt zichtbaar waarom mensen specifiek voor jou kiezen.', '["Kies of je start vanuit je persoonlijke pagina of een aparte businesspagina.","Definieer drie content buckets voor de komende weken.","Schrijf je eerste versie van je USP."]'::jsonb),
    ('start', 3, 'Maak je ideale manier van werken concreet en koppel die aan de cliënten die je wilt helpen.', '["Schrijf je perfecte werkweek uit per dag en per uur.","Reken je gewenste inkomen of cliëntenaantal terug naar pakketten en uren.","Definieer minstens drie cliënttypes en het passende aanbod per type."]'::jsonb),
    ('start', 4, 'Een duidelijk aanbod verlaagt de drempel om met jou te starten.', '["Definieer je drie belangrijkste pakketten en voor wie ze bedoeld zijn.","Maak een Linktree of vergelijkbare biolink met formulier of kalenderlink.","Schrijf je standaardantwoord voor mensen die meteen naar prijzen vragen."]'::jsonb),
    ('start', 5, 'Verkopen begint bij vertrouwen in de waarde die jij kunt leveren.', '["Schrijf uit waarom jij gelooft dat je mensen kunt helpen.","Noteer waarom iemand moet geloven in jou, je bedrijf en je dienst.","Maak een eerste ruwe versie van je salesstructuur."]'::jsonb),
    ('start', 6, 'Een goed salesgesprek draait eerst om luisteren en pas daarna om pitchen.', '["Schrijf minstens tien vragen voor je information-gatheringfase.","Noteer welke praktische bezwaren je vroeg in het gesprek wilt ontdekken.","Oefen een mini-pitch en volledige pitch voor een fictieve cliënt."]'::jsonb),
    ('start', 7, 'Maak de keuze eenvoudig en reageer rustig op bezwaren.', '["Schrijf twee of drie pakketopties uit.","Maak een lijst van vijf veelvoorkomende bezwaren met rustige vragen.","Bepaal je administratieve flow: betaalverzoek, timing, startmoment en intake."]'::jsonb),
    ('start', 8, 'Professionele groei vraagt financiële structuur en consequente implementatie.', '["Boek indien nodig een adviesgesprek met een boekhouder of accountant.","Plan een aparte businessrekening en bepaal wat je herinvesteert.","Maak je finale actielijst voor deze module."]'::jsonb),
    ('leadership', 1, 'Coaching gaat verder dan schema''s: begrijp waarom iemand echt begeleiding zoekt.', '["Schrijf minstens vijf redenen op waarom mensen een coach inschakelen. Denk ook aan de diepere motivaties."]'::jsonb),
    ('leadership', 2, 'Doelen veranderen. Bouw vaste momenten in om het waarom opnieuw te bevragen.', '["Bepaal hoe vaak en in welke vorm je doelen opnieuw bespreekt met cliënten.","Schrijf uit hoe je reageert wanneer de prioriteiten van een cliënt veranderen."]'::jsonb),
    ('leadership', 3, 'Ga stap voor stap van kennisoverdracht naar authentieke connectie.', '["Bepaal per cliënt of cliënttype op welk coachingniveau je nu zit.","Noteer één concrete actie waarmee je een niveau dieper kunt coachen."]'::jsonb),
    ('leadership', 4, 'De echte connectie ontstaat vaak tussen de sets door.', '["Noteer per cliënt welk connectietype het best past en hoe je dat versterkt.","Film een compound oefening voor en na jouw feedback en cues.","Bewerk het resultaat tot een korte video van ongeveer één minuut."]'::jsonb),
    ('leadership', 5, 'Als coach bepaal jij de energie en help je cliënten verantwoordelijkheid nemen.', '["Denk terug aan een commitment dat je zelf niet nakwam: was het competentie of integriteit?","Schrijf uit hoe je dit onderscheid gebruikt wanneer een cliënt iets niet nakomt."]'::jsonb),
    ('leadership', 6, 'Vertaal jouw leiderschap naar duidelijke commitments en een aanpak met impact.', '["Noteer wat jou onderscheidt als coach en leider.","Werk uit hoe je leiderschap integreert in jouw coachingstijl.","Bepaal welke coaching skills en extra service je verder wilt ontwikkelen."]'::jsonb)
)
update public.lessons l
set takeaway = content.takeaway,
    action_items = content.action_items
from public.modules m, content
where l.module_id = m.id
  and l.order_index = content.lesson_order
  and jsonb_array_length(l.action_items) = 0
  and (
    (content.module_pattern = 'start' and (lower(m.slug) like '%start%stand%' or lower(m.title) like '%start%stand%'))
    or
    (content.module_pattern = 'leadership' and (lower(m.slug) like '%leadership%' or lower(m.title) like '%leadership%'))
  );
