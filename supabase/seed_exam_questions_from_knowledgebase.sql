-- Seed exam questions from the local knowledge base.
--
-- Safe to run in the Supabase SQL editor. The script:
-- - finds modules by known slugs/titles instead of hard-coded ids;
-- - creates a published exam per found module when missing;
-- - inserts 10 active multiple-choice questions per module;
-- - fills both legacy exam_questions fields and exam_answer_options;
-- - skips exact duplicate question_text rows on rerun.

begin;

create temporary table seed_exam_modules (
  module_key text primary key,
  exam_title text not null,
  slug_candidates text[] not null,
  title_patterns text[] not null
) on commit drop;

insert into seed_exam_modules (module_key, exam_title, slug_candidates, title_patterns) values
  (
    'module-01',
    'Program Design and Periodisering - Toets',
    array[
      'training-periodisation',
      'program-design-and-periodisering',
      'program-design-periodisering',
      'training-and-periodisation',
      'program-design'
    ]::text[],
    array[
      '%training%period%',
      '%program design%period%',
      '%program%periodisering%'
    ]::text[]
  ),
  (
    'module-02',
    'Nutrition - Toets',
    array[
      'nutrition-plan-design',
      'nutrition'
    ]::text[],
    array[
      '%nutrition%'
    ]::text[]
  ),
  (
    'module-03',
    'How to Start and Standout - Toets',
    array[
      'start-stand-out-as-coach',
      'how-to-start-and-standout',
      'start-and-standout'
    ]::text[],
    array[
      '%start%stand%',
      '%start%out%'
    ]::text[]
  ),
  (
    'module-04',
    'Leadership and Coaching Skills - Toets',
    array[
      'leadership-coaching-skills',
      'leadership-and-coaching-skills'
    ]::text[],
    array[
      '%leadership%coaching%'
    ]::text[]
  ),
  (
    'module-05',
    'Scale Your Service - Toets',
    array[
      'scale-your-service',
      'scaling-your-service'
    ]::text[],
    array[
      '%scale%service%',
      '%scaling%service%'
    ]::text[]
  );

create temporary table seed_exam_targets on commit drop as
select distinct on (sm.module_key)
  sm.module_key,
  sm.exam_title,
  m.id as module_id,
  m.title as module_title
from seed_exam_modules sm
join lateral (
  select modules.id, modules.title, modules.order_index
  from public.modules
  where lower(modules.slug) = any (sm.slug_candidates)
     or lower(modules.title) like any (sm.title_patterns)
  order by modules.order_index asc, modules.id asc
  limit 1
) m on true
order by sm.module_key, m.order_index asc, m.id asc;

do $$
declare
  missing_modules text;
begin
  select string_agg(sm.module_key, ', ' order by sm.module_key)
  into missing_modules
  from seed_exam_modules sm
  where not exists (
    select 1
    from seed_exam_targets target
    where target.module_key = sm.module_key
  );

  if missing_modules is not null then
    raise notice 'Skipped modules not found in public.modules: %', missing_modules;
  end if;
end $$;

insert into public.exams (
  module_id,
  title,
  description,
  passing_score,
  is_published
)
select
  target.module_id,
  target.exam_title,
  'Beantwoord 10 willekeurige vragen om deze module af te ronden.',
  70,
  true
from seed_exam_targets target
where not exists (
  select 1
  from public.exams existing
  where existing.module_id = target.module_id
);

update public.exams exam
set
  is_published = true,
  updated_at = now()
from seed_exam_targets target
where exam.module_id = target.module_id
  and exam.is_published = false;

create temporary table seed_exam_question_bank (
  module_key text not null,
  order_index integer not null,
  question_text text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  correct_answer text not null,
  explanation text
) on commit drop;

insert into seed_exam_question_bank (
  module_key,
  order_index,
  question_text,
  options,
  correct_answer,
  explanation
) values
  (
    'module-01',
    1,
    'Wat bedoelt de module met frequentie?',
    jsonb_build_array(
      'Het aantal keren per week dat een client krachttraining uitvoert.',
      'Het aantal oefeningen dat altijd in elke sessie moet staan.',
      'De snelheid waarmee een client gewicht verliest.',
      'De totale duur van een macrocyclus.'
    ),
    'Het aantal keren per week dat een client krachttraining uitvoert.',
    'Volgens de knowledgebase bepaalt frequentie welke trainingssplit logisch en haalbaar is voor de client.'
  ),
  (
    'module-01',
    2,
    'Waarom vertrekt de module bij program design vaak vanuit de general population?',
    jsonb_build_array(
      'Omdat gewone clients werk, gezin en andere verantwoordelijkheden hebben.',
      'Omdat gevorderde atleten nooit periodisering nodig hebben.',
      'Omdat training voor beginners altijd elke dag moet gebeuren.',
      'Omdat context minder belangrijk is dan theoretische perfectie.'
    ),
    'Omdat gewone clients werk, gezin en andere verantwoordelijkheden hebben.',
    'De module benadrukt dat een programma moet passen bij realistische trainingsfrequenties en levenscontext.'
  ),
  (
    'module-01',
    3,
    'Wat is een trainingssplit volgens de module?',
    jsonb_build_array(
      'De verdeling van trainingen over full body, upper, lower of combinaties.',
      'Een voedingsverdeling over proteinen, koolhydraten en vetten.',
      'Een vaste regel dat elke client vier keer per week traint.',
      'Een salesstructuur voor intakegesprekken.'
    ),
    'De verdeling van trainingen over full body, upper, lower of combinaties.',
    'De split wordt gekozen op basis van hoeveel keer per week iemand kan trainen.'
  ),
  (
    'module-01',
    4,
    'Welke uitspraak past het best bij compound oefeningen?',
    jsonb_build_array(
      'Het zijn belangrijke basisoefeningen die meerdere gewrichten of spiergroepen aanspreken.',
      'Het zijn uitsluitend isolatieoefeningen aan het einde van een training.',
      'Het zijn oefeningen die alleen nuttig zijn in een deloadweek.',
      'Het zijn administratieve templates voor program design.'
    ),
    'Het zijn belangrijke basisoefeningen die meerdere gewrichten of spiergroepen aanspreken.',
    'De knowledgebase plaatst compounds bovenaan omdat ze de belangrijkste trainingsprikkel sturen.'
  ),
  (
    'module-01',
    5,
    'Wanneer kies je assistance oefeningen in de logica van de module?',
    jsonb_build_array(
      'Na de compounds, op basis van doel, tijd en relevantie voor de client.',
      'Voor de compounds, zonder rekening te houden met het doel.',
      'Alleen wanneer een client geen basisoefeningen mag doen.',
      'Alleen om de training willekeurig langer te maken.'
    ),
    'Na de compounds, op basis van doel, tijd en relevantie voor de client.',
    'Assistance oefeningen geven variatie zonder de kern van het schema te verliezen.'
  ),
  (
    'module-01',
    6,
    'Wat kenmerkt een lower sessie in de module?',
    jsonb_build_array(
      'Squat-, hip hinge-, lunge- en hamstring/extension-varianten met compounds als basis.',
      'Alleen bovenlichaamtraining met push- en pullbewegingen.',
      'Een sessie zonder structuur omdat onderlichaamtraining altijd intuitief gebeurt.',
      'Een herstelmoment zonder trainingsprikkel.'
    ),
    'Squat-, hip hinge-, lunge- en hamstring/extension-varianten met compounds als basis.',
    'De lower blueprint structureert onderlichaamtraining zonder willekeur.'
  ),
  (
    'module-01',
    7,
    'Hoe koppelt de module rep range aan intensiteit?',
    jsonb_build_array(
      'Lage reps horen zwaarder te zijn; isolatie krijgt niet dezelfde logica als compounds.',
      'Hoe hoger het gewicht, hoe hoger altijd het aantal reps.',
      'Rep ranges zijn volgens de module niet relevant voor load management.',
      'Elke oefening gebruikt exact dezelfde rep range.'
    ),
    'Lage reps horen zwaarder te zijn; isolatie krijgt niet dezelfde logica als compounds.',
    'De module gebruikt rep ranges om trainingsintensiteit en doel concreet te maken.'
  ),
  (
    'module-01',
    8,
    'Wat bedoelt de module met periodisering?',
    jsonb_build_array(
      'Training plannen in cycli zodat prikkels en intensiteit over tijd veranderen.',
      'Een client altijd hetzelfde schema laten doen zolang het comfortabel voelt.',
      'Alleen voeding plannen in vaste blokken.',
      'Een administratieve kalender zonder invloed op training.'
    ),
    'Training plannen in cycli zodat prikkels en intensiteit over tijd veranderen.',
    'Zonder periodisering kan resultaat afzwakken doordat prikkels onvoldoende veranderen.'
  ),
  (
    'module-01',
    9,
    'Wat is een macrocyclus in de context van deze module?',
    jsonb_build_array(
      'Een langere periode, ongeveer twaalf weken, gekoppeld aan een overkoepelend doel.',
      'Een enkele training met een warming-up en cooling-down.',
      'Een lijst van alle mogelijke assistance oefeningen.',
      'Een voedingsschema voor een rustdag.'
    ),
    'Een langere periode, ongeveer twaalf weken, gekoppeld aan een overkoepelend doel.',
    'De macrocyclus geeft richting aan meerdere trainingsblokken.'
  ),
  (
    'module-01',
    10,
    'Wat is de functie van een mesocyclus?',
    jsonb_build_array(
      'Een kortere trainingsfase binnen de macrocyclus die periodisering praktisch maakt.',
      'Een willekeurige losse sessie zonder verband met de rest van het plan.',
      'Een meetmethode voor dagelijkse stappen.',
      'Een verkoopfase in een intakegesprek.'
    ),
    'Een kortere trainingsfase binnen de macrocyclus die periodisering praktisch maakt.',
    'Meerdere mesocycli vormen samen het gemiddelde intensiteitsdoel binnen een macrocyclus.'
  ),
  (
    'module-02',
    1,
    'Wat bedoelt de module met energiebalans?',
    jsonb_build_array(
      'De verhouding tussen calorieen die binnenkomen en calorieen die buitengaan.',
      'De verhouding tussen slaapuren en trainingsvolume.',
      'Een vaste macroverdeling die voor iedereen hetzelfde is.',
      'Het aantal maaltijden per dag, los van calorie-inname.'
    ),
    'De verhouding tussen calorieen die binnenkomen en calorieen die buitengaan.',
    'De knowledgebase noemt energiebalans het belangrijkste voedingsprincipe.'
  ),
  (
    'module-02',
    2,
    'Waar staat BMR voor in de module?',
    jsonb_build_array(
      'Basal metabolic rate: energie die nodig is voor basisfuncties van het lichaam.',
      'Body movement ratio: het aantal trainingssessies per week.',
      'Basic meal routine: de vaste volgorde van maaltijden.',
      'Balanced macro range: een standaard macroverdeling.'
    ),
    'Basal metabolic rate: energie die nodig is voor basisfuncties van het lichaam.',
    'BMR is het basaal metabolisme dat blijft lopen zonder sport.'
  ),
  (
    'module-02',
    3,
    'Wat is NEAT volgens de module?',
    jsonb_build_array(
      'Dagelijkse beweging die geen sport is, zoals stappen of kleine bewegingen.',
      'Alle krachttraining die een client in de week uitvoert.',
      'De energie die nodig is om voedsel te verteren.',
      'Een formule om eiwitinname te berekenen.'
    ),
    'Dagelijkse beweging die geen sport is, zoals stappen of kleine bewegingen.',
    'De module benadrukt NEAT omdat sport relatief weinig van het totale verbruik kan zijn.'
  ),
  (
    'module-02',
    4,
    'Wat betekent TEF?',
    jsonb_build_array(
      'Thermic effect of food: energie die nodig is om voedsel te verteren en verwerken.',
      'Training effort factor: hoe zwaar een training aanvoelt.',
      'Total exercise frequency: het aantal sportsessies per week.',
      'Timed eating framework: eten binnen een vast tijdsvenster.'
    ),
    'Thermic effect of food: energie die nodig is om voedsel te verteren en verwerken.',
    'TEF is een kleiner maar benoemd onderdeel van calories out.'
  ),
  (
    'module-02',
    5,
    'Welke macronutrienten leveren volgens de module calorieen?',
    jsonb_build_array(
      'Proteinen, koolhydraten, vetten en alcohol.',
      'Alleen proteinen en vitamines.',
      'Vitamines, mineralen en water.',
      'Alleen koolhydraten en vezels.'
    ),
    'Proteinen, koolhydraten, vetten en alcohol.',
    'De module gebruikt macro''s om voedingsschema''s concreet te maken.'
  ),
  (
    'module-02',
    6,
    'Waarom plaatst de module proteinen hoog in prioriteit?',
    jsonb_build_array(
      'Proteine ondersteunt herstel, spieropbouw en verzadiging.',
      'Proteine levert nul calorieen en kan onbeperkt gegeten worden.',
      'Proteine vervangt de nood aan energiebalans.',
      'Proteine is alleen relevant voor wedstrijdatleten.'
    ),
    'Proteine ondersteunt herstel, spieropbouw en verzadiging.',
    'De knowledgebase noemt ook een richtlijn rond 1,6 tot 2,2 g/kg lichaamsgewicht.'
  ),
  (
    'module-02',
    7,
    'Hoe beschrijft de module koolhydraten?',
    jsonb_build_array(
      'Als een macronutrient met ongeveer vier calorieen per gram dat moet passen bij doel en activiteit.',
      'Als het enige macronutrient dat telt voor vetverlies.',
      'Als een onderdeel dat altijd volledig vermeden moet worden.',
      'Als een micronutrient zonder energiewaarde.'
    ),
    'Als een macronutrient met ongeveer vier calorieen per gram dat moet passen bij doel en activiteit.',
    'Carbs kunnen varieren en zijn volgens de module minder essentieel dan proteinen en vetten.'
  ),
  (
    'module-02',
    8,
    'Wat is de rol van vetten volgens de module?',
    jsonb_build_array(
      'Ze leveren ongeveer negen calorieen per gram en zijn belangrijk voor onder meer hormoonbalans.',
      'Ze leveren geen calorieen maar wel extra volume in maaltijden.',
      'Ze moeten altijd zo laag mogelijk gehouden worden.',
      'Ze zijn alleen relevant op trainingsdagen.'
    ),
    'Ze leveren ongeveer negen calorieen per gram en zijn belangrijk voor onder meer hormoonbalans.',
    'De module waarschuwt dat te weinig vet de verdeling ongunstig kan maken.'
  ),
  (
    'module-02',
    9,
    'Hoe gebruikt de module de Harris Benedict formule?',
    jsonb_build_array(
      'Als startpunt om BMR te berekenen en daarna TDEE te schatten met activiteitsniveau.',
      'Als exacte voorspeller die nooit hoeft te worden bijgestuurd.',
      'Als methode om trainingsvolume te kiezen.',
      'Als vervanging voor alle clientfeedback.'
    ),
    'Als startpunt om BMR te berekenen en daarna TDEE te schatten met activiteitsniveau.',
    'De module benadrukt dat de theoretische basis in praktijk moet worden bijgestuurd.'
  ),
  (
    'module-02',
    10,
    'Wat bedoelt de module met deficit en surplus?',
    jsonb_build_array(
      'Een deficit trekt calorieen af voor vetverlies; een surplus voegt calorieen toe voor opbouw.',
      'Een deficit betekent altijd meer koolhydraten eten.',
      'Een surplus is hetzelfde als onderhoudscalorieen.',
      'Beide begrippen gaan alleen over training en niet over voeding.'
    ),
    'Een deficit trekt calorieen af voor vetverlies; een surplus voegt calorieen toe voor opbouw.',
    'Het gekozen percentage hangt af van doel en levensstijl, en de praktijk moet opgevolgd worden.'
  ),
  (
    'module-03',
    1,
    'Wat bedoelt de module met een business blueprint?',
    jsonb_build_array(
      'Een centrale plek waar de coach ideeen, sterktes, aanbod, doelgroep en acties structureert.',
      'Een juridisch document dat automatisch alle klanten oplevert.',
      'Een trainingsschema voor de eerste maand.',
      'Een socialmediakanaal zonder duidelijke positionering.'
    ),
    'Een centrale plek waar de coach ideeen, sterktes, aanbod, doelgroep en acties structureert.',
    'De module stelt dat structuur nodig is om van passie een business te maken.'
  ),
  (
    'module-03',
    2,
    'Waarom onderzoekt een coach zijn sterktes volgens de module?',
    jsonb_build_array(
      'Om te begrijpen waarom mensen voor hem zouden kiezen en dit te vertalen naar communicatie.',
      'Om exact hetzelfde te doen als andere coaches.',
      'Om minder duidelijk te worden in zijn aanbod.',
      'Om content volledig te vermijden.'
    ),
    'Om te begrijpen waarom mensen voor hem zouden kiezen en dit te vertalen naar communicatie.',
    'Sterktes maken content, gesprekken en positionering concreter.'
  ),
  (
    'module-03',
    3,
    'Wat is personal brand in de context van de module?',
    jsonb_build_array(
      'De manier waarop een coach energie, waarden, verhaal, communicatie en transformatie zichtbaar maakt.',
      'Alleen het logo en de kleuren van een coach.',
      'Een excuus om geen aanbod te formuleren.',
      'Een lijst met willekeurige oefeningen.'
    ),
    'De manier waarop een coach energie, waarden, verhaal, communicatie en transformatie zichtbaar maakt.',
    'Volgens de module kopen mensen niet alleen schema''s, maar vertrouwen in wie jij bent.'
  ),
  (
    'module-03',
    4,
    'Waarvoor dienen content buckets?',
    jsonb_build_array(
      'Voor terugkerende inhoudsthema''s waarmee de coach consistent zichtbaar wordt.',
      'Om elke dag zonder richting andere onderwerpen te posten.',
      'Om intakegesprekken technisch te scoren.',
      'Om trainingsfrequentie te berekenen.'
    ),
    'Voor terugkerende inhoudsthema''s waarmee de coach consistent zichtbaar wordt.',
    'Content buckets helpen communiceren vanuit positionering in plaats van willekeur.'
  ),
  (
    'module-03',
    5,
    'Wat bedoelt de module met ideale client?',
    jsonb_build_array(
      'Het type persoon dat de coach bewust wil herkennen, aanspreken en helpen.',
      'Iedereen die ooit interesse in fitness toont.',
      'Alleen bestaande vrienden en familieleden.',
      'Een client die geen begeleiding nodig heeft.'
    ),
    'Het type persoon dat de coach bewust wil herkennen, aanspreken en helpen.',
    'Als je weet wie je zoekt, zie je kansen sneller en spreek je minder algemeen.'
  ),
  (
    'module-03',
    6,
    'Wat maakt een pakket en aanbod concreet volgens de module?',
    jsonb_build_array(
      'Duidelijk maken wat de client krijgt, voor wie het is en welk probleem het oplost.',
      'Alleen zeggen dat je coaching doet.',
      'De prijs verbergen tot na de aankoop.',
      'Zoveel mogelijk opties zonder structuur aanbieden.'
    ),
    'Duidelijk maken wat de client krijgt, voor wie het is en welk probleem het oplost.',
    'Duidelijkheid verlaagt twijfel en maakt aanvragen beter opvolgbaar.'
  ),
  (
    'module-03',
    7,
    'Welke sales mindset past bij de module?',
    jsonb_build_array(
      'Verkopen vertrekt vanuit oprecht kunnen helpen en professioneel leiding nemen.',
      'Sales betekent pushen tot iemand toegeeft.',
      'Sales is alleen nodig wanneer de vakkennis zwak is.',
      'Sales vermijd je door nooit een aanbod te doen.'
    ),
    'Verkopen vertrekt vanuit oprecht kunnen helpen en professioneel leiding nemen.',
    'De module ziet sales als iemand begeleiden naar een passende beslissing.'
  ),
  (
    'module-03',
    8,
    'Wat gebeurt er in de fase Information Gathering?',
    jsonb_build_array(
      'De coach stelt vragen om doelen, pijnpunten, context en bezwaren te begrijpen voordat hij pitcht.',
      'De coach pitcht meteen zonder te luisteren.',
      'De coach vermijdt moeilijke vragen over doelen.',
      'De coach sluit het gesprek af voor de behoefte helder is.'
    ),
    'De coach stelt vragen om doelen, pijnpunten, context en bezwaren te begrijpen voordat hij pitcht.',
    'Te vroeg pitchen leidt tot gemiste informatie en zwakkere beslissingen.'
  ),
  (
    'module-03',
    9,
    'Hoe kijkt de module naar bezwaren?',
    jsonb_build_array(
      'Als twijfels die vaak vragen om meer zekerheid en beter begrip.',
      'Als bewijs dat iemand nooit geholpen kan worden.',
      'Als signaal om het gesprek meteen af te breken.',
      'Als details die je beter negeert.'
    ),
    'Als twijfels die vaak vragen om meer zekerheid en beter begrip.',
    'Een bezwaar is niet automatisch nee; onderzoek waar de twijfel echt zit.'
  ),
  (
    'module-03',
    10,
    'Waarom bespreekt de module bijberoep versus hoofdberoep?',
    jsonb_build_array(
      'Omdat de startvorm een praktische keuze is rond juridisch, financieel en persoonlijk risico.',
      'Omdat elke coach meteen verplicht in hoofdberoep moet starten.',
      'Omdat ondernemingsvorm niets met risico of planning te maken heeft.',
      'Omdat dit de enige factor is die klanten aantrekt.'
    ),
    'Omdat de startvorm een praktische keuze is rond juridisch, financieel en persoonlijk risico.',
    'Starten in bijberoep kan veiliger zijn als je al een job hebt; hoofdberoep vraagt meer zekerheid.'
  ),
  (
    'module-04',
    1,
    'Wat is het verschil tussen coach en personal trainer volgens de module?',
    jsonb_build_array(
      'Een coach begeleidt breder dan alleen training en integreert training, voeding, gedrag, doelen en relatie.',
      'Een coach geeft alleen schema''s zonder opvolging.',
      'Een personal trainer begeleidt altijd voeding, gedrag en identiteit dieper dan een coach.',
      'Er is volgens de module geen verschil.'
    ),
    'Een coach begeleidt breder dan alleen training en integreert training, voeding, gedrag, doelen en relatie.',
    'Dit is het fundamentele onderscheid van de module Leadership and Coaching Skills.'
  ),
  (
    'module-04',
    2,
    'Wat bedoelt de module met onderliggende motivatie?',
    jsonb_build_array(
      'De echte reden waarom iemand een doel wil bereiken.',
      'Het exacte gewicht dat iemand wil tillen.',
      'Een standaarddoel dat de coach voor iedereen kiest.',
      'Een administratieve notitie zonder invloed op coaching.'
    ),
    'De echte reden waarom iemand een doel wil bereiken.',
    'Het waarom wordt een anker wanneer het moeilijk wordt.'
  ),
  (
    'module-04',
    3,
    'Waarom zijn doelen dynamisch volgens de module?',
    jsonb_build_array(
      'Omdat doelen tijdens het traject kunnen veranderen en opnieuw bevraagd moeten worden.',
      'Omdat een doel nooit besproken mag worden na de intake.',
      'Omdat de coach doelen beter geheim houdt.',
      'Omdat doelen alleen in de eerste week bestaan.'
    ),
    'Omdat doelen tijdens het traject kunnen veranderen en opnieuw bevraagd moeten worden.',
    'Een client kan starten met vetverlies en later meer rust, energie of mobiliteit nodig hebben.'
  ),
  (
    'module-04',
    4,
    'Wat beschrijven de levels van coaching?',
    jsonb_build_array(
      'Een schaal van kennisoverdracht naar feedback, accountability, commitment en authentieke connectie.',
      'Een vaste trainingssplit voor upper en lower sessies.',
      'Een lijst van voedingsmacro''s.',
      'Een ranking die bepaalt welke clients belangrijk zijn.'
    ),
    'Een schaal van kennisoverdracht naar feedback, accountability, commitment en authentieke connectie.',
    'De levels helpen de coach beoordelen waar hij staat en hoe hij dieper kan coachen.'
  ),
  (
    'module-04',
    5,
    'Wat betekent accountability in deze module?',
    jsonb_build_array(
      'Een relatie waarin de client verantwoording wil afleggen aan de coach.',
      'Een controlerende houding waarbij de coach politie speelt.',
      'Een juridisch contract zonder coachingrelatie.',
      'Een moment waarop de client geen eigen verantwoordelijkheid draagt.'
    ),
    'Een relatie waarin de client verantwoording wil afleggen aan de coach.',
    'De coach is geen politie, maar iemand tegenover wie de client zijn keuzes serieus neemt.'
  ),
  (
    'module-04',
    6,
    'Wat is een connecting state?',
    jsonb_build_array(
      'Een diep niveau van authentieke connectie waardoor de coach niet zomaar vervangbaar is.',
      'Een korte warming-up aan het begin van elke sessie.',
      'Een socialmediastatus die de coach dagelijks post.',
      'Een fase waarin de coach afstand neemt van de client.'
    ),
    'Een diep niveau van authentieke connectie waardoor de coach niet zomaar vervangbaar is.',
    'Dit ondersteunt langdurige retentie en bredere impact.'
  ),
  (
    'module-04',
    7,
    'Waarom let een coach op connectiestijl?',
    jsonb_build_array(
      'Omdat clients verschillend verbinding maken via humor, interesses, kennis of emotionele support.',
      'Omdat alle clients exact dezelfde aanpak nodig hebben.',
      'Omdat connectie alleen buiten coaching belangrijk is.',
      'Omdat techniek daardoor overbodig wordt.'
    ),
    'Omdat clients verschillend verbinding maken via humor, interesses, kennis of emotionele support.',
    'De module vraagt om te observeren hoe iemand het best reageert en de begeleiding daarop af te stemmen.'
  ),
  (
    'module-04',
    8,
    'Wat zijn cues in coaching?',
    jsonb_build_array(
      'Verbale, metaforische of fysieke aanwijzingen die de client helpen beter te bewegen en voelen.',
      'Alleen schriftelijke huiswerkopdrachten na de sessie.',
      'Financiele signalen in een salesgesprek.',
      'Een vaste macroverdeling voor voeding.'
    ),
    'Verbale, metaforische of fysieke aanwijzingen die de client helpen beter te bewegen en voelen.',
    'Een goede cue vertaalt techniek naar lichaamsgevoel.'
  ),
  (
    'module-04',
    9,
    'Wat betekent coach als thermostaat?',
    jsonb_build_array(
      'De coach bepaalt de sfeer, energie en standaard van de sessie.',
      'De client bepaalt altijd de professionele standaard van de sessie.',
      'De coach registreert alleen letterlijk de temperatuur in de ruimte.',
      'De coach vermijdt voorbereiding zodat de sessie spontaan blijft.'
    ),
    'De coach bepaalt de sfeer, energie en standaard van de sessie.',
    'Aanwezigheid en voorbereiding beinvloeden hoe professioneel de begeleiding voelt.'
  ),
  (
    'module-04',
    10,
    'Wat is het verschil tussen commitment en doel?',
    jsonb_build_array(
      'Een doel is een richtpunt; een commitment is een besluit dat concrete actie vraagt.',
      'Een commitment is altijd vrijblijvender dan een doel.',
      'Een doel gaat alleen over sales, een commitment alleen over voeding.',
      'Er is geen inhoudelijk verschil volgens de module.'
    ),
    'Een doel is een richtpunt; een commitment is een besluit dat concrete actie vraagt.',
    'Het onderscheid helpt praten over integriteit zonder te oordelen.'
  ),
  (
    'module-05',
    1,
    'Wat bedoelt de module met een acquisitiesysteem?',
    jsonb_build_array(
      'Een vierdelig systeem waarin aanbod, leads, gesprekken en sales op elkaar voortbouwen.',
      'Een losse lijst met posts zonder opvolging.',
      'Een trainingsschema voor nieuwe clients.',
      'Een methode om alleen bestaande klanten te behouden.'
    ),
    'Een vierdelig systeem waarin aanbod, leads, gesprekken en sales op elkaar voortbouwen.',
    'De module stelt dat je niet kan closen zonder leads en geen leads converteert zonder goed aanbod.'
  ),
  (
    'module-05',
    2,
    'Wat is Offer Creation volgens de module?',
    jsonb_build_array(
      'Een aanbod bouwen dat concreet maakt voor wie het is, welk resultaat het geeft en via welke methode.',
      'Een generieke beschrijving maken die iedereen tegelijk aanspreekt.',
      'Een gratis post plaatsen zonder duidelijke volgende stap.',
      'Een salesgesprek starten zonder aanbod.'
    ),
    'Een aanbod bouwen dat concreet maakt voor wie het is, welk resultaat het geeft en via welke methode.',
    'Een sterk aanbod is specifiek en moeilijk te negeren.'
  ),
  (
    'module-05',
    3,
    'Wat is de kern van de Blue Ocean strategie in deze module?',
    jsonb_build_array(
      'Kiezen voor een specifiek segment waar je minder vervangbaar bent.',
      'Iedereen tegelijk aanspreken met dezelfde boodschap.',
      'Concurreren op de laagste prijs.',
      'Alle positionering vermijden.'
    ),
    'Kiezen voor een specifiek segment waar je minder vervangbaar bent.',
    'Specificiteit maakt communicatie en aanbod sterker.'
  ),
  (
    'module-05',
    4,
    'Wat bedoelt de module met niche?',
    jsonb_build_array(
      'De specifieke doelgroep en context waarop het aanbod zich richt.',
      'Een willekeurig socialmediaplatform.',
      'Een algemene belofte zonder doelgroep.',
      'Een interne naam voor de administratie.'
    ),
    'De specifieke doelgroep en context waarop het aanbod zich richt.',
    'Hoe specifieker de niche, hoe duidelijker iemand begrijpt dat jij voor hem of haar bent.'
  ),
  (
    'module-05',
    5,
    'Wat is een lead magnet?',
    jsonb_build_array(
      'Een gratis waardevol onderdeel dat een klein probleem oplost en de stap naar het betaalde aanbod kleiner maakt.',
      'Een betaald traject zonder uitleg of context.',
      'Een willekeurige DM zonder waarde.',
      'Een document dat alleen de prijs vermeldt.'
    ),
    'Een gratis waardevol onderdeel dat een klein probleem oplost en de stap naar het betaalde aanbod kleiner maakt.',
    'De module noemt dit de basis van de funnel en eerste indruk.'
  ),
  (
    'module-05',
    6,
    'Hoe beschrijft de module lead generation?',
    jsonb_build_array(
      'Actief interesse aantrekken via organische posts, DMs en opvolging.',
      'Wachten tot leads vanzelf binnenkomen zonder zichtbaarheid.',
      'Alleen betaalde advertenties gebruiken vanaf dag een.',
      'Bestaande klanten vermijden om nieuwe te vinden.'
    ),
    'Actief interesse aantrekken via organische posts, DMs en opvolging.',
    'Voor de eerste klanten raadt de module organisch werk aan voordat advertenties centraal staan.'
  ),
  (
    'module-05',
    7,
    'Wat is appointment setting in de module?',
    jsonb_build_array(
      'DM-gesprekken voeren die via verbinding en kwalificatie organisch naar een call leiden.',
      'Iedereen onmiddellijk een betaalverzoek sturen.',
      'Een call plannen zonder eerst te kwalificeren.',
      'Alle gesprekken vermijden tot iemand klaar is om te kopen.'
    ),
    'DM-gesprekken voeren die via verbinding en kwalificatie organisch naar een call leiden.',
    'De module waarschuwt voor te vroeg en te hard pitchen.'
  ),
  (
    'module-05',
    8,
    'Wat bedoelt de module met de gap?',
    jsonb_build_array(
      'Het verschil tussen de huidige situatie en gewenste situatie van de prospect.',
      'Het prijsverschil tussen twee concurrenten.',
      'De afstand tussen twee trainingsdagen.',
      'Een technisch probleem in de checkout.'
    ),
    'Het verschil tussen de huidige situatie en gewenste situatie van de prospect.',
    'De gap maakt de nood aan begeleiding concreet voordat je pitcht.'
  ),
  (
    'module-05',
    9,
    'Wat is identity selling?',
    jsonb_build_array(
      'Verkopen van de versie van zichzelf die de prospect wil worden, niet alleen een programma.',
      'Alleen de technische inhoud van een schema verkopen.',
      'Een aanbod kleiner maken zodat het minder ambitieus klinkt.',
      'Een gesprek voeren zonder pijn, droom of doel te bespreken.'
    ),
    'Verkopen van de versie van zichzelf die de prospect wil worden, niet alleen een programma.',
    'De module verbindt pijn, doel en aanbod via gewenste identiteit.'
  ),
  (
    'module-05',
    10,
    'Welke volgorde past bij het Sales Mastery framework uit de module?',
    jsonb_build_array(
      'Leiding nemen, situatie begrijpen, gewenste situatie, gap, medicijn/pitch en closing deal.',
      'Prijs noemen, gesprek stoppen, later pas de behoefte ontdekken.',
      'Alleen bezwaren behandelen zonder doelen te kennen.',
      'Eerst closen, daarna pas kwalificeren.'
    ),
    'Leiding nemen, situatie begrijpen, gewenste situatie, gap, medicijn/pitch en closing deal.',
    'Het salesgesprek wordt geleid en eindigt met een beslissing.'
  );

insert into public.exam_questions (
  exam_id,
  module_id,
  question,
  question_text,
  explanation,
  options,
  correct_answer,
  order_index,
  is_active
)
select
  exam.id,
  target.module_id,
  seed.question_text,
  seed.question_text,
  seed.explanation,
  seed.options,
  seed.correct_answer,
  coalesce((
    select max(existing.order_index)
    from public.exam_questions existing
    where existing.module_id = target.module_id
  ), 0) + seed.order_index,
  true
from seed_exam_question_bank seed
join seed_exam_targets target
  on target.module_key = seed.module_key
join public.exams exam
  on exam.module_id = target.module_id
where not exists (
  select 1
  from public.exam_questions existing
  where existing.module_id = target.module_id
    and existing.question_text = seed.question_text
    and existing.deleted_at is null
);

update public.exam_questions question
set
  question = seed.question_text,
  question_text = seed.question_text,
  explanation = seed.explanation,
  options = seed.options,
  correct_answer = seed.correct_answer,
  is_active = true,
  deleted_at = null,
  updated_at = now()
from seed_exam_question_bank seed
join seed_exam_targets target
  on target.module_key = seed.module_key
join public.exams exam
  on exam.module_id = target.module_id
where question.module_id = target.module_id
  and question.exam_id = exam.id
  and question.question_text = seed.question_text;

insert into public.exam_answer_options (
  question_id,
  option_text,
  is_correct,
  order_index
)
select
  question.id,
  option_item.value,
  option_item.value = seed.correct_answer,
  option_item.ordinality::integer - 1
from seed_exam_question_bank seed
join seed_exam_targets target
  on target.module_key = seed.module_key
join public.exams exam
  on exam.module_id = target.module_id
join public.exam_questions question
  on question.module_id = target.module_id
 and question.exam_id = exam.id
 and question.question_text = seed.question_text
cross join lateral jsonb_array_elements_text(seed.options)
  with ordinality as option_item(value, ordinality)
where not exists (
  select 1
  from public.exam_answer_options existing
  where existing.question_id = question.id
    and existing.option_text = option_item.value
)
on conflict do nothing;

with option_counts as (
  select
    option.question_id,
    count(*) as option_count,
    count(*) filter (where option.is_correct) as correct_count
  from public.exam_answer_options option
  group by option.question_id
),
question_counts as (
  select
    target.module_key,
    target.module_title,
    exam.title as exam_title,
    count(question.id) filter (
      where question.is_active = true
        and question.deleted_at is null
    ) as active_question_count,
    count(question.id) filter (
      where question.is_active = true
        and question.deleted_at is null
        and coalesce(option_counts.option_count, 0) >= 2
        and coalesce(option_counts.correct_count, 0) = 1
    ) as valid_active_question_count
  from seed_exam_targets target
  join public.exams exam
    on exam.module_id = target.module_id
  left join public.exam_questions question
    on question.exam_id = exam.id
   and question.module_id = target.module_id
  left join option_counts
    on option_counts.question_id = question.id
  group by target.module_key, target.module_title, exam.title
)
select
  module_key,
  module_title,
  exam_title,
  active_question_count,
  valid_active_question_count,
  case
    when valid_active_question_count >= 10 then 'ready'
    else 'needs_more_questions'
  end as exam_status
from question_counts
order by module_key;

commit;
