import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const modules = [
  {
    key: "module-01",
    title: "Program Design en Periodisering",
    examTitle: "Program Design and Periodisering - Toets",
    slugs: [
      "training-periodisation",
      "program-design-and-periodisering",
      "program-design-periodisering",
      "training-and-periodisation",
      "program-design",
    ],
    patterns: [
      "%training%period%",
      "%program design%period%",
      "%program%periodisering%",
    ],
    objectives: [
      "Frequentie vertalen naar een haalbare trainingssplit.",
      "Compounds en assistance-oefeningen doelgericht ordenen.",
      "Full body, upper en lower vergelijken voor de context van de cliënt.",
      "Rep ranges en intensiteit verschillend toepassen per oefeningstype.",
      "Een macrocyclus opbouwen uit mesocycli met wisselende trainingsprikkels.",
    ],
    questions: [
      q(
        "Vervangen",
        "Begrijpen waarom frequentie vóór de trainingssplit wordt bepaald.",
        "Begrip",
        "Een coach kiest eerst de trainingsfrequentie en pas daarna de split. Welke redenering volgt de module?",
        [
        "De split bepaalt hoeveel vrije dagen en vaste herstelblokken de cliënt in de volledige trainingsweek moet maken.",
          "De realistisch haalbare weekfrequentie bepaalt welke spierverdeling uitvoerbaar is.",
          "De gekozen compounds bepalen automatisch hoeveel sessies iemand nodig heeft.",
          "De duur van de macrocyclus bepaalt hoeveel dagen iemand wekelijks traint.",
        ],
        1,
        "Frequentie is het aantal krachttrainingen per week en vormt de basis voor een haalbare split in de context van de general population.",
        [
          "Draait oorzaak en gevolg om.",
          "Correct: frequentie gaat vooraf aan de split.",
          "Maakt oefenkeuze ten onrechte leidend.",
          "Verwart weekfrequentie met periodeduur.",
        ],
        "Een theoretische split kiezen vóór de praktische beschikbaarheid vaststaat.",
        "learning-objectives.md LO1; concepts.md ‘Frequentie’ en ‘Trainingssplit’; 00:00-01:42",
      ),
      q(
        "Vervangen",
        "De samenhang tussen macrocyclus, mesocyclus en trainingsprikkel herkennen.",
        "Begrip",
        "Welke beschrijving geeft de verhouding tussen macro- en mesocyclus het nauwkeurigst weer?",
        [
        "Een macrocyclus beschrijft één volledige sessie; een mesocyclus omvat vervolgens de volledige trainingsloopbaan van de cliënt.",
          "Beide cycli hebben dezelfde duur, maar gebruiken andere oefeningen.",
          "Een mesocyclus bepaalt de weeksplit; een macrocyclus bepaalt de sessievolgorde.",
          "Een macrocyclus draagt het overkoepelende doel en bevat kortere mesocycli met gerichte prikkels.",
        ],
        3,
        "De module gebruikt een macrocyclus van ongeveer twaalf weken, opgebouwd uit kortere mesocycli waarin volume en load bewust kunnen veranderen.",
        [
          "Verwisselt de schaalniveaus.",
          "Negeert het verschil in duur en functie.",
          "Verwart periodisering met programmastructuur.",
          "Correct: overkoepelend doel met kortere fasen.",
        ],
        "Cycli zien als labels voor dezelfde periode in plaats van geneste planniveaus.",
        "learning-objectives.md LO5; concepts.md ‘Macrocyclus’, ‘Mesocyclus’ en ‘Volume- en loadfase’; 31:02-35:50",
      ),
      q(
        "Vervangen",
        "Twee full-bodysessies plannen met voldoende herstel.",
        "Toepassing",
        "Een cliënt kan twee keer per week trainen en is vrij op maandag, dinsdag en donderdag. Welke planning sluit het best aan bij de module?",
        [
          "Full body op maandag en donderdag, met herstel tussen beide sessies.",
          "Full body op maandag en dinsdag, zodat de trainingsprikkel gebundeld is.",
          "Upper op maandag en opnieuw upper op dinsdag, zonder lowersessie.",
          "Lower op dinsdag en isolatie op donderdag, zonder uppersessie.",
        ],
        0,
        "Bij twee trainingsdagen past een full-bodystructuur, met bij voorkeur ongeveer 48 uur tussen de sessies; maandag en donderdag respecteert beide principes.",
        [
          "Correct: juiste split én herstelruimte.",
          "Past de split toe maar negeert herstel.",
          "Dekt het lichaam onvolledig af.",
          "Vervangt full body door een onvolledige verdeling.",
        ],
        "Alle beschikbare dagen benutten zonder de herstelrelatie te beoordelen.",
        "lessons.md les 1-2; source-map.md ‘Frequentie en doelgroep’ en ‘Splits kiezen’; 00:00-06:09",
      ),
      q(
        "Vervangen",
        "Een vierdaagse upper/lowerweek logisch structureren.",
        "Toepassing",
        "Een cliënt kan vier dagen trainen en wil elke hoofdregio herhaald belasten. Welke basisstructuur past het best?",
        [
          "Vier full-bodysessies achter elkaar, met telkens dezelfde compounds.",
          "Upper, upper, lower, lower, zonder rekening te houden met herstel.",
          "Upper 1, lower 1, herstel, upper 2, lower 2.",
          "Eén full body, gevolgd door drie sessies met alleen isolatie.",
        ],
        2,
        "De module koppelt vier trainingsdagen aan een upper/lowerstructuur waarin beide regio’s terugkomen en herstel in de week wordt ingebouwd.",
        [
          "Te veel opeenvolgende volledige belasting.",
          "Groepeert dezelfde regio onnodig.",
          "Correct: herhaling, verdeling en herstel.",
          "Laat compounds en structurele dekking los.",
        ],
        "Frequentie verwarren met zoveel mogelijk opeenvolgende trainingsdagen.",
        "lessons.md les 2 en 4-5; 02:36-06:09 en 12:01-28:09",
      ),
      q(
        "Vervangen",
        "Een full-bodysessie terugbrengen tot de belangrijkste bewegingspatronen.",
        "Toepassing",
        "Een coach combineert een upper- en lowerblueprint tot één full-bodysessie met beperkte tijd. Welke aanpassing volgt de module?",
        [
        "De compounds uit beide blueprints schrappen en alleen de kortere isolatiereeksen voor upper en lower behouden.",
          "De compounds uit upper en lower behouden en de onderste isolatiereeksen weglaten.",
          "Alle oefeningen behouden en uitsluitend de rusttijden halveren.",
          "Alle loweroefeningen schrappen en de volledige upperreeks behouden.",
        ],
        1,
        "Bij de combinatie naar full body blijven de compounds uit upper en lower de kern; de onderste C-reeksen met isolatie vallen weg.",
        [
          "Keert de prioriteit om.",
          "Correct: behoudt de kern binnen de tijd.",
          "Lost de inhoudelijke overbelasting niet op.",
          "Maakt de sessie geen full body meer.",
        ],
        "Tijd besparen door de belangrijkste oefenprikkel te verwijderen.",
        "lessons.md les 6 ‘Full body combineren’; 28:09-33:53",
      ),
      q(
        "Vervangen",
        "Een toegankelijke compoundvariant kiezen zonder het bewegingsdoel te verliezen.",
        "Toepassing",
        "Een beginnende cliënt kan de barpositie van een front squat nog niet comfortabel aannemen. Welke keuze past bij het voorbeeld uit de module?",
        [
          "De squatbeweging volledig vervangen door een armisolatie.",
          "De front squat behouden en de techniekproblemen negeren.",
          "De oefening uitstellen tot de cliënt een gevorderd schema volgt.",
          "Een goblet squat gebruiken als toegankelijkere squatvariant.",
        ],
        3,
        "De module noemt de goblet squat toegankelijker voor starters wanneer de barpositie van de front squat een beperking vormt.",
        [
          "Verliest het bewegingspatroon.",
          "Past de oefening niet aan de cliënt aan.",
          "Maakt niveau in plaats van geschiktheid beslissend.",
          "Correct: zelfde patroon, toegankelijkere uitvoering.",
        ],
        "Een specifieke oefening verwarren met het onderliggende bewegingspatroon.",
        "lessons.md les 3, praktisch voorbeeld; 06:09-12:01",
      ),
      q(
        "Vervangen",
        "Rep range en intensiteit passend koppelen aan compound en isolatie.",
        "Toepassing",
        "Een coach geeft een zware compound en een isolatieoefening exact dezelfde lage rep range en loadlogica. Welke correctie sluit aan bij de module?",
        [
          "De compound zwaarder en lager in reps programmeren, en isolatie niet automatisch dezelfde logica geven.",
          "Beide oefeningen lichter maken en de rep range verder gelijk houden.",
          "De isolatie zwaarder maken dan de compound om de sessie te balanceren.",
          "Rep ranges verwijderen en alleen het aantal oefeningen noteren.",
        ],
        0,
        "De module koppelt lagere reps aan zwaardere belasting bij compounds en waarschuwt dat isolatie niet dezelfde rep- en intensiteitslogica krijgt.",
        [
          "Correct: differentieert volgens oefeningstype.",
          "Behoudt precies de fout die wordt getest.",
          "Keert de trainingsprioriteit om.",
          "Laat essentieel load management weg.",
        ],
        "Eén repregel mechanisch op ieder oefeningstype toepassen.",
        "learning-objectives.md LO4; concepts.md ‘Rep range en intensiteit’; 20:40-21:01",
      ),
      q(
        "Vervangen",
        "Een noodplanning beoordelen wanneer twee beschikbare dagen opeenvolgend vallen.",
        "Analyse en beoordeling",
        "Een cliënt die normaal vier dagen traint, kan door een reis alleen maandag en dinsdag trainen. De coach plant twee identieke full-bodysessies. Wat is de belangrijkste afwijking van de module?",
        [
          "De coach gebruikt te weinig verschillende isolatieoefeningen in beide sessies.",
          "De coach verandert tijdelijk de normale trainingsfrequentie van de cliënt.",
          "De coach belast hetzelfde volledige lichaam opnieuw zonder de aanbevolen herstelruimte.",
          "De coach gebruikt twee sessies binnen één kalenderweek.",
        ],
        2,
        "De module noemt twee full-bodysessies op opeenvolgende dagen onlogisch doordat herstel van de eerste sessie de tweede beïnvloedt.",
        [
          "Niet de centrale fout.",
          "Tijdelijke aanpassing kan nodig zijn.",
          "Correct: identificeert de herstelbotsing.",
          "Twee sessies zijn op zichzelf passend.",
        ],
        "Alleen het aantal sessies tellen en de verdeling van belasting negeren.",
        "lessons.md les 1-2, praktisch reisvoorbeeld; 00:00-06:09",
      ),
      q(
        "Vervangen",
        "Variatie afwegen tegen voldoende oefenconsistentie.",
        "Analyse en beoordeling",
        "Een coach vervangt elke week alle compounds om plateaus te voorkomen. Welke beoordeling past het best bij de module?",
        [
          "Juist, want oefenherhaling verhindert elke nieuwe trainingsprikkel.",
          "Juist, zolang de isolatieoefeningen gedurende twaalf weken gelijk blijven.",
          "Onjuist, omdat alleen extra trainingsdagen een plateau kunnen doorbreken.",
          "Onjuist, omdat oefeningen voldoende consistent moeten blijven terwijl prikkel en intensiteit over fasen veranderen.",
        ],
        3,
        "De module zoekt consistentie in oefeningen, noemt ongeveer zes weken als bruikbare periode en varieert de prikkel via periodisering in plaats van wekelijkse willekeur.",
        [
          "Maakt variatie absoluut.",
          "Verplaatst consistentie naar de verkeerde oefencategorie.",
          "Negeert periodisering.",
          "Correct: balanceert consistentie en verandering.",
        ],
        "Variatie gelijkstellen aan voortdurende oefenwissels.",
        "lessons.md les 7 ‘Periodisering, cycli en intensiteit’; 33:53-46:39",
      ),
      q(
        "Vervangen",
        "Een vlak twaalfwekenprogramma analyseren en gericht bijsturen.",
        "Analyse en beoordeling",
        "Een twaalfwekenprogramma gebruikt elke week dezelfde oefeningen, sets, reps en gemiddelde intensiteit. Resultaten vlakken af. Wat is volgens de module de meest gerichte ingreep?",
        [
          "De volledige trainingssplit wekelijks willekeurig maken.",
          "De macrocyclus opdelen in mesocycli waarin volume en load bewust stijgen en dalen.",
          "Alle assistance-oefeningen definitief verwijderen uit iedere sessie.",
          "De trainingsfrequentie verhogen zonder de belastingsopbouw te wijzigen.",
        ],
        1,
        "Periodisering maakt het lange plan dynamisch door kortere fasen met verschillende volume- en loadprikkels binnen hetzelfde overkoepelende doel.",
        [
          "Willekeur is geen periodisering.",
          "Correct: pakt de vlakke prikkel rechtstreeks aan.",
          "Is geen algemene oplossing voor plateau.",
          "Meer sessies zonder andere prikkel mist de oorzaak.",
        ],
        "Meer of anders trainen kiezen zonder de prikkel over tijd te structureren.",
        "learning-objectives.md LO5; concepts.md ‘Periodisering’ en ‘Volume- en loadfase’; 31:02-46:39",
      ),
    ],
  },
  {
    key: "module-02",
    title: "Nutrition",
    examTitle: "Nutrition - Toets",
    slugs: ["nutrition-plan-design", "nutrition"],
    patterns: ["%nutrition%"],
    objectives: [
      "Energiebalans en onderdelen van verbruik verklaren.",
      "De rol en energiewaarde van macro’s onderscheiden.",
      "BMR, activiteitsfactor en deficit/surplus als startmodel toepassen.",
      "Theorie toetsen aan gewichtsverloop en cliëntcontext.",
      "Een haalbare voedingsstrategie en macroverdeling kiezen.",
    ],
    questions: [
      q(
        "Vervangen",
        "De onderdelen van calories out van elkaar onderscheiden.",
        "Begrip",
        "Welke situatie is een voorbeeld van NEAT en niet van geplande training, BMR of TEF?",
        [
        "Na iedere maaltijd extra energie gebruiken om het opgenomen voedsel te verteren en verder te verwerken.",
          "Een geplande krachttraining van zestig minuten uitvoeren.",
          "Doorheen de werkdag extra stappen zetten en vaker de trap nemen.",
          "In rust energie gebruiken voor de basisfuncties van het lichaam.",
        ],
        2,
        "NEAT is dagelijkse beweging buiten sport, zoals stappen, fietsen en kleine bewegingen tijdens de dag.",
        [
          "Dit is TEF.",
          "Dit is geplande sport.",
          "Correct: dagelijkse niet-sportbeweging.",
          "Dit is BMR.",
        ],
        "Alle beweging of elk energieverbruik als sportactiviteit classificeren.",
        "concepts.md ‘NEAT’, ‘BMR’ en ‘TEF’; 00:51-02:25",
      ),
      q(
        "Vervangen",
        "Het statuut van een berekende caloriebehoefte begrijpen.",
        "Begrip",
        "Hoe moet een coach de uitkomst van Harris-Benedict met activiteitsfactor gebruiken?",
        [
          "Als een startschatting die aan het gewichtsverloop en de context wordt getoetst.",
          "Als een exacte onderhoudswaarde die voor de hele begeleiding vastligt.",
          "Als een vervanging voor het opvolgen van inname en lichaamsgewicht.",
          "Als een berekening die alleen bij wedstrijdatleten bruikbaar is.",
        ],
        0,
        "De formule schat BMR en daarna TDEE, maar de module benadrukt dat de praktijk kan afwijken en bijsturing nodig blijft.",
        [
          "Correct: theorie wordt praktisch gevalideerd.",
          "Maakt een schatting absoluut.",
          "Schrapt noodzakelijke feedback.",
          "Beperkt de methode zonder basis in de module.",
        ],
        "Een formule behandelen als gemeten werkelijkheid.",
        "learning-objectives.md LO3-4; concepts.md ‘Harris Benedict formule’; 09:03-16:25",
      ),
      q(
        "Vervangen",
        "Een stagnerend gewichtsverloop gebruiken om een theoretisch deficit te beoordelen.",
        "Toepassing",
        "Een berekening plaatst een cliënt in een deficit, maar het gemiddelde gewicht verandert niet. Welke volgende stap sluit het best aan bij de module?",
        [
          "Het berekende getal behouden omdat formules betrouwbaarder zijn dan de weegschaal.",
          "Onmiddellijk alle koolhydraten schrappen zonder de totale inname te bekijken.",
          "Het doel wijzigen van vetverlies naar spieropbouw zonder overleg.",
          "De praktijkrespons en context beoordelen en de calorie-inname zo nodig bijsturen.",
        ],
        3,
        "Het berekende target is een startpunt; het effect op de weegschaal en de context bepalen of het feitelijke deficit voldoende is.",
        [
          "Negeert praktijkfeedback.",
          "Verengt energiebalans tot één macro.",
          "Wijzigt het cliëntdoel zonder reden.",
          "Correct: observeert en corrigeert.",
        ],
        "Een theoretisch tekort verwarren met een aangetoond tekort.",
        "learning-objectives.md LO4; lessons.md les 3; 13:08-16:25",
      ),
      q(
        "Vervangen",
        "NEAT inzetten als hefboom naast sport.",
        "Toepassing",
        "Een cliënt traint drie keer per week maar beweegt op werkdagen nauwelijks. Welke interventie volgt het accent van de module het meest direct?",
        [
        "Alle aandacht richten op langere krachttrainingen en de beperkte beweging buiten sport negeren.",
          "Dagelijkse stappen en kleine bewegingsmomenten verhogen naast de bestaande training.",
          "De eiwitinname verlagen om het energieverbruik te verhogen.",
          "TEF vervangen door een extra wekelijkse sportsessie.",
        ],
        1,
        "De module benadrukt NEAT omdat dagelijkse beweging een belangrijke component van het totale verbruik is en sport slechts een deel vormt.",
        [
          "Onderschat NEAT.",
          "Correct: gebruikt de ontbrekende hefboom.",
          "Verwisselt inname en verbruik.",
          "TEF is geen activiteit die vervangen wordt.",
        ],
        "Alleen geplande sport als beïnvloedbaar energieverbruik zien.",
        "learning-objectives.md LO1; concepts.md ‘NEAT’; 01:34-03:35",
      ),
      q(
        "Vervangen",
        "Een voedingsstrategie aan tijdelijke onhaalbaarheid aanpassen.",
        "Toepassing",
        "Een cliënt volgt thuis nauwkeurig een voedingsschema, maar kan dit tijdens een reis niet wegen of tracken. Welke tijdelijke aanpak noemt de module passend?",
        [
          "Het traject pauzeren tot exact wegen opnieuw mogelijk is.",
          "De cliënt zonder enige structuur laten eten omdat tracking ontbreekt.",
          "Werken met richtlijnen of swaps die in de reissituatie uitvoerbaar zijn.",
          "Het normale schema behouden en afwijkingen als gebrek aan eerlijkheid behandelen.",
        ],
        2,
        "De module onderscheidt schema, tracking, richtlijnen en swaps en noemt richtlijnen bruikbaar wanneer reizen exact volgen moeilijk maakt.",
        [
          "Maakt flexibiliteit onmogelijk.",
          "Laat alle coachingstructuur los.",
          "Correct: past strategie aan context aan.",
          "Negeert haalbaarheid.",
        ],
        "Eén voedingsstrategie als universeel en permanent behandelen.",
        "learning-objectives.md LO5; concepts.md ‘Voedingsstrategie’; 16:25-19:13",
      ),
      q(
        "Vervangen",
        "Macro’s prioriteren bij het opbouwen van een verdeling.",
        "Toepassing",
        "Een coach heeft het caloriedoel bepaald en bouwt nu de macroverdeling op. Welke controle sluit het best aan bij de module?",
        [
          "Alle calorieën eerst aan koolhydraten toewijzen en de rest gelijk verdelen.",
          "Alleen percentages gebruiken; gram per kilogram hoeft niet gecontroleerd te worden.",
          "Vetten zo laag mogelijk zetten zodat meer calorieën naar proteïne kunnen.",
          "Voldoende proteïne en vet bewaken en koolhydraten afstemmen op doel en activiteit.",
        ],
        3,
        "Proteïne en vet krijgen een functionele ondergrens/prioriteit; koolhydraten variëren met doel en activiteit, en gram per kilogram blijft een controle naast percentages.",
        [
          "Negeert proteïne en vet.",
          "Mist de controle die de module expliciet noemt.",
          "Kan vetten ongunstig laag maken.",
          "Correct: combineert prioriteit en context.",
        ],
        "Een nette procentverdeling verwarren met een inhoudelijk passende verdeling.",
        "concepts.md ‘Proteïnen’, ‘Vetten’, ‘Koolhydraten’ en ‘Macroverdeling’; 03:35-08:43 en 19:57-21:59",
      ),
      q(
        "Vervangen",
        "Een passend deficit kiezen op basis van doel en levensstijl.",
        "Toepassing",
        "Twee cliënten willen vet verliezen, maar één heeft een veel zwaardere werk- en trainingsweek. Hoe past de coach deficitlogica volgens de module toe?",
        [
          "Voor beiden hetzelfde maximale percentage gebruiken om vergelijking mogelijk te maken.",
          "Het percentage afstemmen op doel en levensstijl en daarna de praktische respons opvolgen.",
          "Alleen de actiefste cliënt een surplus geven omdat die meer verbruikt.",
          "Geen caloriedoel gebruiken zolang beide cliënten een ander activiteitsniveau hebben.",
        ],
        1,
        "De grootte van deficit of surplus hangt af van doel en levensstijl en moet via de praktijkrespons worden geëvalueerd.",
        [
          "Maakt individualisering onmogelijk.",
          "Correct: keuze én opvolging zijn contextgebonden.",
          "Verwart hoger verbruik met een opbouwdoel.",
          "Verschil in activiteit is juist input voor de schatting.",
        ],
        "Eenzelfde percentage als objectief juiste standaard voor iedere cliënt zien.",
        "concepts.md ‘Deficit en surplus’; lessons.md les 3; 09:03-16:25",
      ),
      q(
        "Vervangen",
        "Een plausibele oorzaak van verschil tussen berekening en schaal analyseren.",
        "Analyse en beoordeling",
        "Een cliënt zegt het berekende caloriedoel exact te volgen, maar het verwachte gewichtsverloop blijft uit. Welke conclusie is het meest verantwoord binnen de module?",
        [
          "De energiebalans is voor deze cliënt niet van toepassing.",
          "De Harris-Benedictformule bewijst dat de weegschaal onbetrouwbaar is.",
          "De theoretische schatting of de feitelijke uitvoering kan afwijken; opvolging moet bepalen wat wordt aangepast.",
          "De macropercentages moeten gelijk blijven en alleen het aantal maaltijden moet stijgen.",
        ],
        2,
        "De module presenteert berekening als startpunt en vraagt eerlijkheid, context en schaalrespons mee te nemen voordat targets worden aangepast.",
        [
          "Verwerpt het kernprincipe.",
          "Geeft theorie voorrang zonder toetsing.",
          "Correct: houdt meerdere moduleconforme verklaringen open.",
          "Maaltijdfrequentie lost de kern niet automatisch op.",
        ],
        "Bij tegenstrijdige data meteen één meetpunt als onfeilbaar kiezen.",
        "learning-objectives.md LO4; lessons.md les 3-4; 13:08-19:13",
      ),
      q(
        "Vervangen",
        "Een rigide voedingsschema beoordelen op geschiktheid voor de cliënt.",
        "Analyse en beoordeling",
        "Een coach kiest voor iedere cliënt standaard een volledig uitgeschreven voedingsschema omdat dit maximale controle geeft. Wat ontbreekt in die redenering?",
        [
          "Een schema bevat nooit calorie- of macro-informatie.",
          "Tracking is volgens de module altijd nauwkeuriger dan ieder schema.",
          "Richtlijnen mogen alleen bij een surplus worden gebruikt.",
          "De strategie moet ook passen bij eerlijkheid, haalbaarheid en context van de cliënt.",
        ],
        3,
        "Controle is een voordeel van een schema, maar de module biedt meerdere strategieën en maakt geschiktheid afhankelijk van de persoon en situatie.",
        [
          "Feitelijk onjuist.",
          "Maakt een niet-bestaande absolute rangorde.",
          "Verzint een beperking.",
          "Correct: voegt de beslissende cliëntcontext toe.",
        ],
        "Coachcontrole boven uitvoerbaarheid plaatsen.",
        "concepts.md ‘Voedingsstrategie’; 16:25-19:13",
      ),
      q(
        "Vervangen",
        "Een macroverdeling controleren voorbij oppervlakkige percentages.",
        "Analyse en beoordeling",
        "Een macroverdeling telt exact op tot 100%, maar levert voor de cliënt weinig proteïne en zeer weinig vet. Welke beoordeling past bij de module?",
        [
          "De verdeling is onvoldoende beoordeeld; percentages moeten ook aan gram per kilogram en functies worden getoetst.",
          "De verdeling is correct omdat iedere som van 100% nutritioneel in balans is.",
          "De verdeling is alleen fout wanneer koolhydraten minder dan de helft innemen.",
          "De verdeling wordt correct zodra het aantal eetmomenten wordt verdubbeld.",
        ],
        0,
        "De module noemt percentages zoals 30/40/30, maar vraagt daarnaast proteïne en vet in gram per kilogram en hun functies te bewaken.",
        [
          "Correct: kijkt verder dan rekenkundige volledigheid.",
          "Verwart optellen met geschiktheid.",
          "Introduceert een niet-onderbouwde koolhydraatregel.",
          "Maaltijdfrequentie herstelt de macroverhouding niet.",
        ],
        "Een mathematisch sluitende verdeling als automatisch fysiologisch passend zien.",
        "learning-objectives.md LO5; concepts.md ‘Macroverdeling’; 19:57-21:59",
      ),
    ],
  },
  {
    key: "module-03",
    title: "How to Start and Standout",
    examTitle: "How to Start and Standout - Toets",
    slugs: [
      "start-stand-out-as-coach",
      "how-to-start-and-standout",
      "start-and-standout",
    ],
    patterns: ["%start%stand%", "%start%out%"],
    objectives: [
      "Een businessblueprint als structuur voor groei gebruiken.",
      "Sterktes, personal brand en content buckets vertalen naar positionering.",
      "Een cliënttype en aanbod kiezen dat bij de gewenste werkweek past.",
      "In sales luisteren en informatie verzamelen vóór de pitch.",
      "Bezwaren onderzoeken en als coach een passende beslissing begeleiden.",
    ],
    questions: [
      q(
        "Vervangen",
        "De functie van een businessblueprint begrijpen.",
        "Begrip",
        "Waarom laat de module een coach eerst een businessblueprint opbouwen?",
        [
          "Om ideeën, sterktes, doelgroep, aanbod en acties in één werkbare structuur te verbinden.",
        "Om een definitief merk- en businessplan vast te leggen dat tijdens de latere groei niet meer mag veranderen.",
          "Om de nood aan echte gesprekken en markfeedback volledig weg te nemen.",
          "Om uitsluitend prijzen te vergelijken met die van andere coaches.",
        ],
        0,
        "De blueprint brengt de bouwstenen van de business samen zodat kennis en passie kunnen worden omgezet in gerichte keuzes en acties.",
        [
          "Correct: verbindt de relevante bouwstenen.",
          "Maakt de blueprint onterecht statisch.",
          "Structuur vervangt uitvoering niet.",
          "Verengt het instrument tot prijsvergelijking.",
        ],
        "Een blueprint als einddocument zien in plaats van als beslisstructuur.",
        "learning-objectives.md LO1; lessons.md les 1; 00:00-03:23",
      ),
      q(
        "Vervangen",
        "Personal brand onderscheiden van alleen visuele identiteit.",
        "Begrip",
        "Welke omschrijving van personal brand sluit het best aan bij de module?",
        [
        "De vaste combinatie van logo, kleuren, lettertypes en visuele templates die op alle sociale media terugkomt.",
          "Het aantal volgers dat een coach via consistente posts verzamelt.",
          "Wat mensen voelen, denken en verwachten door je waarden, verhaal, energie en communicatie.",
          "De lijst van diensten en prijzen die op een website staat.",
        ],
        2,
        "De module stelt expliciet dat personal brand breder is dan logo of feed en gaat over de verwachting die jouw aanwezigheid oproept.",
        [
          "Verengt het tot vormgeving.",
          "Verwart bereik met merkbetekenis.",
          "Correct: omvat waarden en ervaren positionering.",
          "Aanbod is slechts één mogelijk onderdeel.",
        ],
        "Zichtbare huisstijl verwarren met de volledige betekenis van een merk.",
        "concepts.md ‘Personal brand’; lessons.md les 2; 03:23-11:24",
      ),
      q(
        "Vervangen",
        "Content buckets vanuit positionering toepassen.",
        "Toepassing",
        "Een coach post dagelijks over willekeurige onderwerpen en vindt moeilijk een herkenbare lijn. Welke ingreep past bij de module?",
        [
        "Op meer platforms nog vaker posten, zodat de hogere frequentie het ontbreken van een inhoudelijke lijn compenseert.",
          "Terugkerende contentthema’s kiezen die zijn sterktes, doelgroep en transformaties zichtbaar maken.",
          "Alleen prijspromoties posten zodat het aanbod centraal staat.",
          "Stoppen met persoonlijke communicatie en alleen oefeningen tonen.",
        ],
        1,
        "Content buckets zijn terugkerende thema’s die consistente zichtbaarheid verbinden met personal brand en positionering.",
        [
          "Vergroot bereik zonder de inhoudelijke fout op te lossen.",
          "Correct: creëert herkenbare samenhang.",
          "Verengt content tot verkoop.",
          "Laat belangrijke merkcomponenten weg.",
        ],
        "Consistentie gelijkstellen aan vaak posten in plaats van herkenbaar communiceren.",
        "learning-objectives.md LO2; concepts.md ‘Content buckets’; 03:23-11:24",
      ),
      q(
        "Vervangen",
        "Een businessmodel kiezen dat bij de gewenste werkweek past.",
        "Toepassing",
        "Een coach wil groeien maar krijgt weinig energie van veel vaste één-op-éénuren. Welke vraag moet volgens de module vóór verdere groei centraal staan?",
        [
          "Welke cliënt en welk begeleidingsmodel passen bij de werkweek die ik werkelijk wil bouwen?",
        "Hoe kan ik zoveel mogelijk verschillende cliënttypes tegelijk aannemen zonder mijn werkweek vooraf te begrenzen?",
          "Welke prijs kan ik kopiëren zonder mijn eigen capaciteit te berekenen?",
          "Hoe kan ik iedere aanvraag accepteren zonder selectie of pakketkeuze?",
        ],
        0,
        "De module waarschuwt dat groei op papier een business kan opleveren die niet bij de coach past; cliënttype en model moeten aansluiten op de gewenste werkweek.",
        [
          "Correct: verbindt doelgroep, model en energie.",
          "Vergroot juist de mismatch.",
          "Negeert capaciteit en eigen context.",
          "Schrapt bewuste positionering.",
        ],
        "Omzetgroei los beoordelen van de manier waarop het werk wordt geleverd.",
        "learning-objectives.md LO3; lessons.md les 3; 11:24-16:49",
      ),
      q(
        "Vervangen",
        "Een vaag aanbod omzetten naar duidelijke pakketten.",
        "Toepassing",
        "Een prospect hoort alleen: ‘Ik doe coaching en maak schema’s.’ Welke verbetering volgt de module?",
        [
          "Meer vaktermen toevoegen zonder het traject concreter te maken.",
        "De prijs weglaten en vijf vergelijkbare opties uitgebreid naast elkaar zetten zodat de prospect zelf alle verschillen afweegt.",
          "Wachten tot de prospect zelf bedenkt welke begeleiding mogelijk is.",
          "Een beperkt aantal pakketten tonen met doelgroep, inhoud en passend probleem per traject.",
        ],
        3,
        "De module adviseert een beperkt aantal duidelijke pakketten zodat de cliënt begrijpt wat hij krijgt en welke optie bij zijn situatie past.",
        [
          "Complexiteit is geen duidelijkheid.",
          "Te veel opties vergroten twijfel.",
          "Legt de coachrol bij de prospect.",
          "Correct: maakt aanbod en keuze concreet.",
        ],
        "Meer informatie verwarren met meer beslisduidelijkheid.",
        "concepts.md ‘Pakket en aanbod’; lessons.md les 4; 16:50-22:23",
      ),
      q(
        "Vervangen",
        "Informatie verzamelen vóór een pitch.",
        "Toepassing",
        "Een prospect vraagt meteen naar de prijs, maar doel, context en pijnpunten zijn nog onbekend. Welke reactie past bij de salesflow?",
        [
          "Onmiddellijk de goedkoopste prijs sturen om weerstand te voorkomen.",
          "Eerst gerichte vragen stellen en daarna pas het passende pakket en de investering kaderen.",
          "Alle beschikbare pakketten sturen en de prospect zelf laten filteren.",
          "Het gesprek beëindigen omdat een prijsvraag gebrek aan commitment toont.",
        ],
        1,
        "Information Gathering gaat vooraf aan de pitch zodat de coach doelen, pijn, context en mogelijke bezwaren begrijpt en passend kan adviseren.",
        [
          "Pitcht vóór diagnose.",
          "Correct: luistert en leidt.",
          "Ontwijkt de coachende filterrol.",
          "Interpreteert een vraag onnodig defensief.",
        ],
        "Snel antwoord geven verwarren met professioneel adviseren.",
        "learning-objectives.md LO4; concepts.md ‘Information Gathering’; 22:23-33:27",
      ),
      q(
        "Vervangen",
        "Een pakket aanbevelen vanuit de rol van coach als filter.",
        "Toepassing",
        "Na een grondige intake zijn twee pakketten mogelijk, maar één sluit duidelijk beter aan. Wat doet de coach volgens de module?",
        [
          "Alle vijf mogelijke opties opsommen en geen richting geven.",
          "Altijd het duurste pakket adviseren, los van de informatie.",
          "Het best passende pakket aanbevelen en uitleggen waarom het aansluit.",
          "Alleen de prijs noemen en de inhoud pas na betaling bespreken.",
        ],
        2,
        "De coach is de filter en gebruikt de verzamelde informatie om niet zomaar opties te dumpen, maar een passend pakket voor te stellen.",
        [
          "Creëert keuzelast.",
          "Negeert passendheid.",
          "Correct: verbindt intake en advies.",
          "Onthoudt noodzakelijke beslisinformatie.",
        ],
        "Neutraliteit verwarren met de cliënt zonder advies laten kiezen.",
        "lessons.md les 6; 33:27-38:56",
      ),
      q(
        "Vervangen",
        "Een vroege pitch als salesfout analyseren.",
        "Analyse en beoordeling",
        "Een coach geeft na twee minuten een uitgebreide pitch. De prospect zegt: ‘Ik moet erover nadenken.’ Welke eerdere stap is waarschijnlijk onvoldoende uitgevoerd volgens de module?",
        [
          "De coach heeft te weinig content buckets gebruikt tijdens het gesprek.",
          "De coach heeft zijn juridische ondernemingsvorm niet toegelicht.",
          "De coach heeft te weinig pakketten tegelijk aangeboden.",
          "De coach heeft doelen, pijnpunten, context en twijfel onvoldoende onderzocht.",
        ],
        3,
        "Een sterke pitch volgt op Information Gathering; zonder die informatie mist de pitch aansluiting en blijven bezwaren of onzekerheid onontdekt.",
        [
          "Contentplanning hoort niet bij deze gespreksdiagnose.",
          "Niet relevant voor de behoefteanalyse.",
          "Meer opties lossen gebrek aan inzicht niet op.",
          "Correct: identificeert de ontbrekende basis.",
        ],
        "Een bezwaar pas aan het einde zien in plaats van als gevolg van zwakke informatieverzameling.",
        "learning-objectives.md LO4-5; lessons.md les 5; 22:23-33:27",
      ),
      q(
        "Vervangen",
        "Een bezwaar onderzoeken zonder defensief te worden.",
        "Analyse en beoordeling",
        "Een prospect zegt dat het traject duur voelt. Welke reactie past het best bij de module?",
        [
          "Het bezwaar negeren en de betalingslink opnieuw sturen.",
          "De prospect overtuigen dat prijs nooit een geldig bezwaar is.",
          "Onderzoeken welke twijfel of zekerheid achter het bezwaar zit en daarop reageren.",
          "Onmiddellijk korting geven voordat duidelijk is wat de twijfel betekent.",
        ],
        2,
        "De module behandelt bezwaren als twijfels die om meer begrip en zekerheid kunnen vragen; eerst onderzoeken voorkomt een defensieve of automatische reactie.",
        [
          "Bouwt geen begrip op.",
          "Wordt defensief en absoluut.",
          "Correct: onderzoekt de echte twijfel.",
          "Reageert vóór diagnose.",
        ],
        "Ieder prijsbezwaar letterlijk nemen en meteen verdedigen of toegeven.",
        "learning-objectives.md LO5; concepts.md ‘Bezwaren’; 25:16-38:56",
      ),
      q(
        "Vervangen",
        "Samenhang tussen positionering, aanbod en sales beoordelen.",
        "Analyse en beoordeling",
        "Een coach trekt veel vrijblijvende aanvragen aan die zelden bij zijn pakketten passen. Welke combinatie pakt volgens de module het fundament het best aan?",
        [
          "De doelgroep breder maken en vaker dezelfde generieke pitch gebruiken.",
          "Alle content vervangen door kortingen en de intake inkorten.",
          "Meer pakketten toevoegen zodat voor iedereen iets beschikbaar is.",
          "Sterktes en ideale cliënt aanscherpen, content daarop richten en vóór de pitch beter kwalificeren.",
        ],
        3,
        "De module verbindt blueprint, personal brand, ideale cliënt, duidelijk aanbod en Information Gathering tot één lijn; mismatch ontstaat vaak vóór de closing.",
        [
          "Vergroot de vaagheid.",
          "Vermindert positionering en diagnose.",
          "Vergroot keuzelast.",
          "Correct: herstelt de hele keten.",
        ],
        "Een conversieprobleem alleen als closingtechniek behandelen.",
        "learning-objectives.md LO1-4; lessons.md les 1-5; 00:00-33:27",
      ),
    ],
  },
  {
    key: "module-04",
    title: "Leadership and Coaching Skills",
    examTitle: "Leadership and Coaching Skills - Toets",
    slugs: ["leadership-coaching-skills", "leadership-and-coaching-skills"],
    patterns: ["%leadership%coaching%"],
    objectives: [
      "Coaching onderscheiden van louter training geven.",
      "Onderliggende motivatie en veranderende doelen blijven bevragen.",
      "Van kennisoverdracht naar accountability en authentieke connectie coachen.",
      "Connectiestijlen en passende cues in sessies toepassen.",
      "Falen onderzoeken via coachverantwoordelijkheid, commitment en integriteit.",
    ],
    questions: [
      q(
        "Vervangen",
        "Brede coaching onderscheiden van personal training.",
        "Begrip",
        "Wanneer gaat begeleiding volgens de module verder dan alleen personal training?",
        [
        "Wanneer iedere sessie meer oefeningen, technische correcties en trainingsprikkels bevat dan de voorgaande sessie.",
          "Wanneer de coach training, voeding, gedrag, doelen en relatie in samenhang begeleidt.",
          "Wanneer de coach uitsluitend buiten de trainingsuren contact opneemt.",
          "Wanneer technische correcties worden vervangen door motiverende slogans.",
        ],
        1,
        "Coaching creëert blijvende meerwaarde door meer dan de uitvoering van een sessie of schema te begeleiden.",
        [
          "Meer volume maakt de begeleiding niet breder.",
          "Correct: integreert de genoemde domeinen.",
          "Contactmoment alleen is niet bepalend.",
          "Techniek en relatie zijn geen tegenstelling.",
        ],
        "Meer dienstverlening verwarren met diepere begeleiding.",
        "learning-objectives.md LO1; concepts.md ‘Coach versus personal trainer’; 00:22-00:46",
      ),
      q(
        "Vervangen",
        "Doel en commitment van elkaar onderscheiden.",
        "Begrip",
        "Welke uitspraak beschrijft het verschil tussen een doel en een commitment het best?",
        [
          "Een doel beschrijft de richting; een commitment vertaalt die richting naar een besluit en concrete actie.",
        "Een doel is de bindende afspraak met de coach; een commitment blijft een persoonlijke wens die nog geen concrete actie vereist.",
          "Een commitment komt uitsluitend van de coach; een doel uitsluitend van de cliënt.",
        "Beide betekenen inhoudelijk hetzelfde, maar commitment klinkt in een coachingsgesprek motiverender.",
        ],
        0,
        "De module gebruikt het doel als richtpunt en commitment als besluit waarop gedrag en integriteit kunnen worden opgevolgd.",
        [
          "Correct: verbindt richting en actie.",
          "Keert de betekenis om.",
          "Negeert gezamenlijk eigenaarschap.",
          "Wist het functionele onderscheid uit.",
        ],
        "Een uitgesproken wens al als gedragscommitment behandelen.",
        "concepts.md ‘Commitment versus doel’; 03:34-04:11",
      ),
      q(
        "Vervangen",
        "Een veranderd cliëntdoel tijdig herkennen.",
        "Toepassing",
        "Een cliënt startte voor vetverlies, maar noemt na maanden vooral stress, slaap en energie als zorgen. Welke coachactie past het best?",
        [
        "Het oorspronkelijke vetverliesdoel en de volledige intake-aanpak behouden omdat doelen na de start van een traject vaststaan.",
          "Alleen het trainingsvolume verhogen zodat vetverlies weer centraal komt.",
          "Het traject afsluiten omdat de cliënt niet langer consistent is.",
          "Opnieuw vragen wat het huidige doel is, waarom dit telt en de aanpak daarop afstemmen.",
        ],
        3,
        "Doelen en motivaties zijn dynamisch; de coach moet ze doorheen het traject opnieuw bevragen om relevant te blijven.",
        [
          "Behandelt het doel als statisch.",
          "Reageert technisch zonder diagnose.",
          "Verwart verandering met falen.",
          "Correct: herijkt doel en waarom.",
        ],
        "Trouw blijven aan het intakeformulier in plaats van aan de actuele cliëntbehoefte.",
        "learning-objectives.md LO2; concepts.md ‘Dynamische doelen’; 03:04-06:20",
      ),
      q(
        "Vervangen",
        "Accountability opbouwen zonder politie te spelen.",
        "Toepassing",
        "Een cliënt wil minder alcohol drinken en vraagt om opvolging. Welke aanpak weerspiegelt accountability uit de module?",
        [
        "Dagelijks alle keuzes controleren, iedere afwijking registreren en daar onmiddellijk een vaste consequentie aan koppelen.",
          "De keuze volledig loslaten omdat verantwoordelijkheid alleen bij de cliënt ligt.",
          "Een duidelijke commitment afspreken en er als betekenisvolle relatie op terugkomen.",
          "Alleen extra voedingskennis sturen zonder het gedrag te bespreken.",
        ],
        2,
        "Accountability betekent dat de cliënt verantwoording wíl afleggen binnen de relatie; dit wordt gedragen door commitment, niet door politiewerk.",
        [
          "Maakt de coach controlerend.",
          "Verwijdert de relatie uit accountability.",
          "Correct: combineert eigenaarschap en opvolging.",
          "Kennisoverdracht alleen is een oppervlakkiger niveau.",
        ],
        "Accountability verwarren met externe controle of straf.",
        "concepts.md ‘Accountability’; lessons.md les 3; 06:20-10:08",
      ),
      q(
        "Vervangen",
        "Een connectiestijl passend inzetten bij een nieuwe cliënt.",
        "Toepassing",
        "Een nieuwe cliënt reageert sterk op uitleg en wil begrijpen waarom oefeningen werken, maar haakt af bij losse humor. Wat doet de coach?",
        [
        "Meer humor gebruiken zodat de cliënt geleidelijk aan de vaste connectiestijl van de coach went.",
          "De uitleg beperken en alleen het schema laten spreken.",
          "Iedere sessie dezelfde connectiestijl gebruiken als bij andere cliënten.",
          "Via kennis en relevante uitleg verbinden en blijven observeren wat respons geeft.",
        ],
        3,
        "Connectiestijl verschilt per cliënt en kan onder meer via kennis, humor, interesses of emotionele steun verlopen.",
        [
          "Stemt niet af op de waargenomen respons.",
          "Verwijdert een werkzame verbinding.",
          "Negeert individualisering.",
          "Correct: past stijl aan en blijft observeren.",
        ],
        "Authenticiteit verwarren met één vaste sociale aanpak voor iedereen.",
        "learning-objectives.md LO4; concepts.md ‘Connectiestijl’; 10:08-13:01",
      ),
      q(
        "Vervangen",
        "Een cue kiezen die lichaamsgevoel ondersteunt.",
        "Toepassing",
        "Een cliënt verliest bij een squat het gevoel van druk over de volledige voet. Welke cue past bij de module?",
        [
          "Vraag de cliënt de druk over de volledige voet te voelen en de grond weg te duwen.",
          "Noem alleen de anatomische naam van alle betrokken spieren.",
          "Verhoog onmiddellijk het gewicht zodat de fout duidelijker wordt.",
          "Wacht tot na de sessie en stuur uitsluitend een geschreven schema.",
        ],
        0,
        "De module gebruikt proprioceptieve en metaforische cues om techniek te vertalen naar wat een cliënt moet voelen en controleren.",
        [
          "Correct: concrete lichaamsgerichte cue.",
          "Kennis benoemen is niet automatisch bruikbare feedback.",
          "Vergroot het probleem zonder cue.",
          "Mist het relevante leermoment.",
        ],
        "Technische kennis tonen verwarren met een cue die gedrag verandert.",
        "concepts.md ‘Cues’; lessons.md les 5; 13:02-16:00",
      ),
      q(
        "Vervangen",
        "Als thermostaat de sessiestandaard bewaken.",
        "Toepassing",
        "Een cliënt komt om 6.00 uur vermoeid binnen na een slechte nacht. Welke houding volgt de thermostaatmetafoor?",
        [
          "De lage energie spiegelen zodat de cliënt zich begrepen voelt.",
          "Voorbereid de sfeer en standaard dragen, terwijl je de toestand van de cliënt blijft meenemen.",
          "De sessie zonder gesprek exact uitvoeren zoals op papier staat.",
          "De cliënt verantwoordelijk maken voor de energie van de volledige sessie.",
        ],
        1,
        "De coach bepaalt als thermostaat de sfeer, energie en professionele standaard; dat sluit observeren en afstemmen niet uit.",
        [
          "Maakt de coach thermometer in plaats van thermostaat.",
          "Correct: leidt én blijft cliëntgericht.",
          "Negeert de actuele toestand.",
          "Draagt de leiderschapsrol over.",
        ],
        "Leiderschap verwarren met ofwel kopiëren, ofwel de cliënt negeren.",
        "concepts.md ‘Coach als thermostaat’; 16:23-16:53",
      ),
      q(
        "Vervangen",
        "Falen analyseren vanuit gedeelde coachverantwoordelijkheid.",
        "Analyse en beoordeling",
        "Een cliënt voert een afgesproken plan herhaaldelijk niet uit. Welke eerste analyse past het best bij de module?",
        [
          "De cliënt mist discipline; hetzelfde plan moet strenger worden opgelegd.",
        "Het doel zonder overleg schrappen omdat de uitvoering herhaaldelijk ontbreekt.",
          "Onderzoek of doel, bereidheid, ondersteuning en plan nog passen vóór je alleen de cliënt verantwoordelijk stelt.",
          "Technische kennis ontbreekt altijd en moet eerst met meer informatie worden aangevuld.",
        ],
        2,
        "De module vraagt de coach eerst te onderzoeken hoe de aanpak, ondersteuning en aansluiting beter kunnen voordat falen volledig bij de cliënt wordt gelegd.",
        [
          "Reduceert het probleem tot karakter.",
          "Neemt een beslissing zonder herbevraging.",
          "Correct: analyseert meerdere coachbare voorwaarden.",
          "Kennis is niet altijd de bottleneck.",
        ],
        "Niet-uitvoering automatisch als gebrek aan wilskracht verklaren.",
        "learning-objectives.md LO5; lessons.md les 6; 17:17-19:59",
      ),
      q(
        "Vervangen",
        "Een coachingsniveau analyseren voorbij kennisoverdracht.",
        "Analyse en beoordeling",
        "Een coach maakt perfecte schema’s en corrigeert techniek, maar bespreekt nooit motivatie, commitments of gedrag. Op welk probleem wijst de module?",
        [
          "De coach gebruikt te weinig verschillende oefenvarianten.",
          "De coach blijft vooral op kennisoverdracht en feedback, zonder diepere accountability en connectie.",
          "De coach bouwt te veel authentieke connectie en te weinig afstand.",
          "De coach behandelt de cliënt al op het diepste niveau van coaching.",
        ],
        1,
        "Schema’s en techniek zijn waardevol, maar de levels lopen verder via accountability, commitment en connecting state.",
        [
          "Oefenvariatie is niet de kern.",
          "Correct: benoemt het ontbrekende niveau.",
          "Het scenario vermeldt juist geen diepe connectie.",
          "Keert de analyse om.",
        ],
        "Vakinhoudelijke kwaliteit gelijkstellen aan volledige coachingdiepte.",
        "learning-objectives.md LO3; concepts.md ‘Levels van coaching’; 06:20-10:08",
      ),
      q(
        "Vervangen",
        "De meest waardevolle interventie in een sessie beoordelen.",
        "Analyse en beoordeling",
        "Tijdens een sessie blijkt slaap de bottleneck achter terugkerende uitval, terwijl de techniek goed is. Welke keuze past bij impactgericht leiderschap?",
        [
          "Toch extra technische cues geven omdat de sessie daarvoor betaald is.",
          "Een extra set toevoegen om de beschikbare tijd volledig te benutten.",
          "Het onderwerp vermijden omdat slaap buiten training valt.",
          "De slaapbottleneck gericht bevragen en een relevante commitment helpen formuleren.",
        ],
        3,
        "De module vraagt per sessie naar de meest waardevolle interventie; die kan een vraag of initiatief rond een leefstijl-bottleneck zijn in plaats van meer training.",
        [
          "Negeert de echte bottleneck.",
          "Meer werk is niet automatisch meer impact.",
          "Verengt coaching tot training.",
          "Correct: kiest de interventie met de meeste impact.",
        ],
        "De waarde van een sessie meten aan trainingsvolume in plaats van gedragsimpact.",
        "lessons.md les 7; 19:59-25:06",
      ),
    ],
  },
  {
    key: "module-05",
    title: "Scale Your Service",
    examTitle: "Scale Your Service - Toets",
    slugs: ["scale-your-service", "scaling-your-service"],
    patterns: ["%scale%service%", "%scaling%service%"],
    objectives: [
      "De vier acquisitiestappen in hun afhankelijkheid begrijpen.",
      "Een specifiek aanbod bouwen met niche- en Blue Ocean-logica.",
      "Een lead magnet als kleine complete probleemoplossing ontwerpen.",
      "In DM eerst verbinden en kwalificeren vóór een call.",
      "Een gekwalificeerde salescall leiden via situatie, droom, gap, pitch en closing.",
    ],
    questions: [
      q(
        "Vervangen",
        "De afhankelijkheid tussen de vier acquisitiestappen begrijpen.",
        "Begrip",
        "Waarom behandelt de module offer creation, lead generation, appointment setting en sales mastery in deze volgorde?",
        [
          "Omdat elke stap de noodzakelijke input voor de volgende stap oplevert.",
        "Omdat de vier stappen administratief verschillen en in de praktijk los van elkaar uitgevoerd kunnen worden.",
          "Omdat sales mastery moet starten voordat een aanbod bestaat.",
          "Omdat lead generation pas zinvol is nadat alle calls zijn gevoerd.",
        ],
        0,
        "Een sterk aanbod maakt gerichte leads mogelijk, gesprekken zetten leads om naar calls en sales sluit gekwalificeerde calls; de stappen bouwen op elkaar voort.",
        [
          "Correct: benoemt de ketenlogica.",
          "Negeert de inhoudelijke afhankelijkheid.",
          "Keert de volgorde om.",
          "Maakt lead generation onmogelijk.",
        ],
        "De vier onderdelen als losse tactieken zien.",
        "learning-objectives.md LO1; concepts.md ‘Acquisitiesysteem’; 00:21-02:29",
      ),
      q(
        "Vervangen",
        "Een lead magnet onderscheiden van algemene gratis content.",
        "Begrip",
        "Welke eigenschap maakt gratis content volgens de module tot een sterke lead magnet?",
        [
        "Ze beschrijft zoveel mogelijk problemen van de volledige doelgroep zonder één concreet resultaat volledig af te ronden.",
          "Ze lost een klein specifiek probleem volledig genoeg op om waarde te laten ervaren.",
          "Ze geeft alleen een kortingscode voor het betaalde traject.",
          "Ze bevat de volledige betaalde begeleiding zonder volgende stap.",
        ],
        1,
        "Een lead magnet is een complete oplossing voor een klein probleem en vormt een waardevolle eerste shift richting het betaalde aanbod.",
        [
          "Breedte vervangt geen concrete oplossing.",
          "Correct: klein, specifiek en waardevol.",
          "Korting is geen probleemoplossing.",
          "Wist de rol van het betaalde aanbod uit.",
        ],
        "Veel gratis informatie verwarren met een afgeronde eerste uitkomst.",
        "learning-objectives.md LO3; concepts.md ‘Lead magnet’; 05:29-14:05",
      ),
      q(
        "Vervangen",
        "Een generiek aanbod verscherpen met nichelogica.",
        "Toepassing",
        "Een coach biedt ‘fitnesscoaching voor iedereen’ aan en is nergens de voor de hand liggende keuze. Wat is de meest directe verbetering?",
        [
          "De prijs verlagen zodat het algemene aanbod toch opvalt.",
        "Meer methodes toevoegen zonder de brede doelgroep of de algemene uitkomst te wijzigen.",
          "Een specifieke doelgroep, context, uitkomst en methode in het aanbod verbinden.",
          "Het aanbod behouden en alleen vaker dezelfde boodschap posten.",
        ],
        2,
        "Offer creation en Blue Ocean vragen specificiteit: voor wie, welk resultaat en via welke methode, zodat de coach minder vervangbaar wordt.",
        [
          "Concurreert op prijs zonder positionering.",
          "Meer details lossen doelgroepvaagheid niet op.",
          "Correct: maakt het aanbod specifiek.",
          "Vergroot volume zonder relevantie.",
        ],
        "Een communicatieprobleem behandelen zonder het aanbod te verscherpen.",
        "learning-objectives.md LO2; concepts.md ‘Offer Creation’, ‘Niche’ en ‘Blue Ocean’; 02:29-05:29",
      ),
      q(
        "Vervangen",
        "Een lead magnet logisch laten doorstromen naar het aanbod.",
        "Toepassing",
        "Een coach voor drukke ondernemers verkoopt duurzame voedingscoaching. Welke lead magnet sluit het best aan bij de modulelogica?",
        [
        "Een algemene verzameling met honderd fitness- en voedingsweetjes die voor iedere mogelijke doelgroep bedoeld is.",
          "Een gratis kennismaking zonder concrete uitkomst of voorbereiding.",
          "Een volledig willekeurig trainingsschema voor gevorderde bodybuilders.",
          "Een korte praktische oplossing voor één voedingsprobleem van drukke ondernemers die naar verdere coaching opent.",
        ],
        3,
        "De lead magnet moet een klein relevant probleem van dezelfde niche oplossen en de stap naar het betaalde aanbod logisch kleiner maken.",
        [
          "Te breed en niet doelgroepgericht.",
          "Levert geen kleine oplossing.",
          "Mismatcht niche en aanbod.",
          "Correct: probleem, niche en vervolgstap sluiten aan.",
        ],
        "Gratis waarde kiezen op populariteit in plaats van strategische aansluiting.",
        "learning-objectives.md LO2-3; lessons.md les 2-3; 02:29-14:05",
      ),
      q(
        "Vervangen",
        "Organische lead generation voor eerste klanten toepassen.",
        "Toepassing",
        "Een startende coach heeft een helder aanbod maar nog geen leads of advertentiedata. Welke aanpak benadrukt de module eerst?",
        [
          "Organisch zichtbaar worden, relevante mensen benaderen en consequent opvolgen.",
          "Wachten tot de niche vanzelf via zoekmachines binnenkomt.",
        "Direct in advertenties investeren en persoonlijke gesprekken en opvolging voorlopig uitstellen.",
          "Het aanbod opnieuw bouwen zonder het ooit met mensen te testen.",
        ],
        0,
        "Voor de eerste klanten legt de module nadruk op organische posts, outreach, DM’s en opvolging voordat advertenties centraal staan.",
        [
          "Correct: creëert en test actieve interesse.",
          "Is passief en levert geen gesprekken.",
          "Slaat organische validatie en conversie over.",
          "Blijft plannen zonder marktcontact.",
        ],
        "Schaalbare acquisitie willen vóór er handmatig bewijs en gesprekken zijn.",
        "concepts.md ‘Lead generation’; lessons.md les 3; 05:29-14:05",
      ),
      q(
        "Vervangen",
        "Een DM-conversatie op verbinding en kwalificatie richten.",
        "Toepassing",
        "Een lead reageert op een post en vertelt kort over een probleem. Wat is volgens de module de beste volgende stap?",
        [
          "Meteen het volledige aanbod en de prijs in één bericht sturen.",
          "Een open vraag stellen, luisteren en de huidige en gewenste situatie verder begrijpen.",
          "Direct een calllink sturen zonder te weten of de persoon past.",
          "Alleen extra gratis informatie sturen en nooit richting gesprek bewegen.",
        ],
        1,
        "Appointment setting bouwt eerst verbinding en context op via open vragen en stilte, en beweegt daarna op het juiste moment naar een call.",
        [
          "Pitcht te vroeg.",
          "Correct: verbindt en kwalificeert.",
          "Slaat kwalificatie over.",
          "Vermijdt de noodzakelijke vervolgstap.",
        ],
        "DM’s zien als mini-salespage of als eindeloze gratis coaching.",
        "learning-objectives.md LO4; lessons.md les 4; 14:05-18:01",
      ),
      q(
        "Vervangen",
        "De gap zichtbaar maken vóór de pitch.",
        "Toepassing",
        "In een call kent de coach de huidige situatie en het gewenste resultaat. Welke stap maakt de nood aan begeleiding vervolgens concreet?",
        [
          "De prijs noemen voordat de obstakels zijn besproken.",
          "De lead opnieuw dezelfde beginsituatie laten beschrijven.",
          "Het verschil en de obstakels tussen huidige en gewenste situatie onderzoeken.",
          "Onmiddellijk bezwaren weerleggen die nog niet zijn uitgesproken.",
        ],
        2,
        "De gap is het verschil tussen de huidige en gewenste situatie; dit maakt helder wat ontbreekt voordat het medicijn of de pitch wordt aangeboden.",
        [
          "Komt te vroeg in de flow.",
          "Voegt geen nieuwe diagnose toe.",
          "Correct: maakt de gap zichtbaar.",
          "Behandelt hypothetische weerstand.",
        ],
        "Een droom bespreken al verwarren met voldoende koopreden.",
        "learning-objectives.md LO5; concepts.md ‘Gap’; 15:54-22:11",
      ),
      q(
        "Vervangen",
        "Een te vroege DM-pitch analyseren.",
        "Analyse en beoordeling",
        "Een coach stuurt elke nieuwe volger direct een aanbod en calllink. Er komen veel korte afwijzingen. Welke systeemsfout verklaart dit het best?",
        [
          "De coach gebruikt te veel open vragen vóór de call.",
          "De coach heeft de investering nog niet als prijs benoemd.",
          "De coach lost in DM al te veel kleine problemen volledig op.",
          "De coach slaat verbinding en kwalificatie over en probeert appointment setting als closing te gebruiken.",
        ],
        3,
        "De module waarschuwt voor te vroeg, hard en snel pitchen; DM is bedoeld om vertrouwen en kwalificatie op te bouwen richting call.",
        [
          "Het scenario bevat juist geen vragen.",
          "Prijswoordkeuze is niet de hoofdoorzaak.",
          "Het scenario geeft geen gratis coaching.",
          "Correct: verwart de functie van twee fasen.",
        ],
        "Iedere conversiefase hetzelfde verkoopdoel geven.",
        "learning-objectives.md LO4; lessons.md les 4; 14:05-18:01",
      ),
      q(
        "Vervangen",
        "Identity selling onderscheiden van alleen programmakenmerken verkopen.",
        "Analyse en beoordeling",
        "Twee pitches zijn inhoudelijk correct. Welke pitch past beter bij identity selling?",
        [
          "‘Je krijgt twaalf schema’s, check-ins en toegang tot video’s.’",
          "‘Je krijgt dezelfde onderdelen als iedere andere cliënt in dit pakket.’",
          "‘We koppelen de begeleiding aan de versie van jezelf die je wilt worden en de kloof die je nu tegenhoudt.’",
          "‘We bespreken vooral de technische functies en vermijden je gewenste situatie.’",
        ],
        2,
        "Identity selling verbindt het aanbod met de gewenste versie van de prospect en met pijn, droom en gap, niet alleen met deliverables.",
        [
          "Verkoopt vooral onderdelen.",
          "Maakt het aanbod generiek.",
          "Correct: koppelt oplossing en gewenste identiteit.",
          "Vermijdt precies de identiteitslaag.",
        ],
        "Meer deliverables verwarren met een betekenisvollere uitkomst.",
        "concepts.md ‘Identity selling’; lessons.md les 5; 21:43-22:11",
      ),
      q(
        "Vervangen",
        "Professionele closing na het noemen van de investering beoordelen.",
        "Analyse en beoordeling",
        "Een coach noemt de investering en begint de stilte meteen op te vullen met korting en extra uitleg. Welke correctie volgt de module?",
        [
          "De investering opnieuw als kost benoemen en sneller praten.",
          "De call terugbrengen naar lead generation en nieuwe posts bespreken.",
          "Een tweede pakket toevoegen voordat de prospect reageert.",
          "De investering rustig laten staan, zwijgen en de prospect ruimte geven om te antwoorden.",
        ],
        3,
        "De module noemt de prijs een investering en vraagt de coach daarna de stilte niet meteen te breken, zodat een echte reactie en beslissing kan ontstaan.",
        [
          "Verzwakt de professionele framing.",
          "Verlaat de salesfase.",
          "Vergroot keuzelast vóór reactie.",
          "Correct: houdt leiding zonder drukte.",
        ],
        "Stilte als mislukking zien en daardoor de eigen pitch ondermijnen.",
        "concepts.md ‘Investeringstaal’; 25:10-25:40",
      ),
    ],
  },
];

function q(
  status,
  objective,
  level,
  question,
  options,
  correct,
  support,
  optionNotes,
  misconception,
  source,
) {
  return {
    status,
    objective,
    level,
    question,
    options,
    correct,
    support,
    optionNotes,
    misconception,
    source,
  };
}

const letters = ["A", "B", "C", "D"];
const esc = (value) => value.replaceAll("'", "''");
const sqlArray = (values) =>
  `array[${values.map((v) => `'${esc(v)}'`).join(", ")}]::text[]`;

function validateBank() {
  const seenQuestions = new Set();
  for (const module of modules) {
    if (module.questions.length !== 10)
      throw new Error(`${module.key}: verwacht 10 vragen`);
    const levels = module.questions.map((item) => item.level);
    const expected = { Begrip: 2, Toepassing: 5, "Analyse en beoordeling": 3 };
    for (const [level, count] of Object.entries(expected)) {
      if (levels.filter((value) => value === level).length !== count)
        throw new Error(`${module.key}: onjuiste verdeling voor ${level}`);
    }
    const answers = letters.map(
      (_, index) =>
        module.questions.filter((item) => item.correct === index).length,
    );
    if (Math.max(...answers) - Math.min(...answers) > 1)
      throw new Error(
        `${module.key}: antwoordletters zijn onvoldoende gebalanceerd`,
      );
    for (const [index, item] of module.questions.entries()) {
      if (seenQuestions.has(item.question))
        throw new Error(`Dubbele vraag: ${item.question}`);
      seenQuestions.add(item.question);
      if (item.options.length !== 4 || new Set(item.options).size !== 4)
        throw new Error(
          `${module.key} vraag ${index + 1}: vier unieke opties vereist`,
        );
      if (
        !Number.isInteger(item.correct) ||
        item.correct < 0 ||
        item.correct > 3
      )
        throw new Error(
          `${module.key} vraag ${index + 1}: ongeldig correct antwoord`,
        );
      if (
        item.optionNotes.length !== 4 ||
        !item.source ||
        !item.support ||
        !item.misconception
      )
        throw new Error(
          `${module.key} vraag ${index + 1}: auditvelden ontbreken`,
        );
    }
  }
}

function auditMarkdown(module) {
  const levelCounts = Object.fromEntries(
    ["Begrip", "Toepassing", "Analyse en beoordeling"].map((level) => [
      level,
      module.questions.filter((item) => item.level === level).length,
    ]),
  );
  const answerCounts = Object.fromEntries(
    letters.map((letter, index) => [
      letter,
      module.questions.filter((item) => item.correct === index).length,
    ]),
  );
  const questions = module.questions
    .map(
      (item, index) => `## Vraag ${index + 1}

**Status bestaande vraag:** ${item.status}

**Leerdoel:**
${item.objective}

**Niveau:**
${item.level}

**Vraag:**
${item.question}

${item.options.map((option, optionIndex) => `**${letters[optionIndex]}.** ${option}`).join("\n")}

**Correct antwoord:** ${letters[item.correct]}

**Onderbouwing:**
${item.support}

**Waarom de afleiders geloofwaardig maar fout zijn:**

${item.optionNotes.map((note, optionIndex) => `- ${letters[optionIndex]}: ${note}`).join("\n")}

**Mogelijke denkfout die wordt getest:**
${item.misconception}

**Bron uit de knowledgebase:**
${item.source}
`,
    )
    .join("\n---\n\n");
  return `# Examenherziening — ${module.title}

## Belangrijkste leerdoelen

${module.objectives.map((objective) => `- ${objective}`).join("\n")}

## Beoordeling bestaande examenvragen

De tien bestaande vragen zijn **vervangen**. Ze vroegen hoofdzakelijk om definities, gebruikten afleiders uit andere domeinen en plaatsten het juiste antwoord steeds op A. Daardoor konden studenten antwoorden via herkenning en teststrategie zonder de module toe te passen.

${questions}

## Kwaliteitscontrole van de reeks

1. **Afgedekte leerdoelen:** alle vijf bovenstaande leerdoelen; elk leerdoel komt minstens één keer als toepassing of analyse terug.
2. **Nog ontbrekende leerdoelen:** geen kernleerdoelen uit \`learning-objectives.md\`; detailclaims uit ASR-onzekere passages zijn bewust niet getoetst.
3. **Niveauverdeling:** begrip ${levelCounts["Begrip"]}, toepassing ${levelCounts["Toepassing"]}, analyse en beoordeling ${levelCounts["Analyse en beoordeling"]}.
4. **Correcte antwoordletters:** A ${answerCounts.A}, B ${answerCounts.B}, C ${answerCounts.C}, D ${answerCounts.D}.
5. **Twijfel over eenduidigheid:** geen na controle; iedere vraag bevat de beslisregel die nodig is om één beste optie te bepalen.
6. **Herkenbaarheid juiste optie:** geen structurele lengte-, vaktaal- of grammaticahint vastgesteld; opties zijn per vraag van dezelfde categorie.
7. **Overlap:** begripsvragen introduceren relaties; toepassings- en analysevragen gebruiken andere beslissingen en geven elkaars antwoord niet weg.
8. **Onvoldoende duidelijke knowledgebase:** de knowledgebase en transcripties zijn als draft gemarkeerd en bevatten ASR-reviewpunten. Daarom zijn onduidelijke losse cijfers, namen en beschadigde formuleringen niet als examengrond gebruikt. Publicatie blijft afhankelijk van menselijke bronvalidatie.
`;
}

function seedSql() {
  const moduleRows = modules
    .map(
      (m) =>
        `  ('${m.key}', '${esc(m.examTitle)}', ${sqlArray(m.slugs)}, ${sqlArray(m.patterns)})`,
    )
    .join(",\n");
  const questionRows = modules
    .flatMap((m) =>
      m.questions.map(
        (item, index) =>
          `  ('${m.key}', ${index + 1}, '${esc(item.question)}', jsonb_build_array(${item.options.map((option) => `'${esc(option)}'`).join(", ")}), '${esc(item.options[item.correct])}', '${esc(`${item.support} Bron: ${item.source}.`)}')`,
      ),
    )
    .join(",\n");
  return `-- Generated by scripts/build-deep-exams.mjs. Do not edit this file by hand.
-- Replaces the active module question banks while preserving historical attempt snapshots.
begin;

create temporary table deep_exam_modules (module_key text primary key, exam_title text not null, slug_candidates text[] not null, title_patterns text[] not null) on commit drop;
insert into deep_exam_modules values
${moduleRows};

create temporary table deep_exam_targets on commit drop as
select distinct on (seed.module_key) seed.module_key, seed.exam_title, module.id as module_id
from deep_exam_modules seed
join lateral (
  select id, order_index from public.modules
  where lower(slug) = any(seed.slug_candidates) or lower(title) like any(seed.title_patterns)
  order by order_index, id limit 1
) module on true
order by seed.module_key, module.order_index, module.id;

do $$ declare missing text; begin
  select string_agg(module_key, ', ' order by module_key) into missing from deep_exam_modules
  where module_key not in (select module_key from deep_exam_targets);
  if missing is not null then raise exception 'Modules niet gevonden: %', missing; end if;
end $$;

insert into public.exams (module_id, title, description, passing_score, is_published)
select module_id, exam_title, 'Beantwoord 10 vragen die begrip, toepassing en analyse van deze module toetsen.', 70, true
from deep_exam_targets
on conflict (module_id) do update set title = excluded.title, description = excluded.description, is_published = true, updated_at = now();

create temporary table deep_exam_bank (module_key text not null, order_index integer not null, question_text text not null, options jsonb not null, correct_answer text not null, explanation text not null, primary key(module_key, order_index)) on commit drop;
insert into deep_exam_bank values
${questionRows};

-- Keep historical questions for attempt integrity, but remove them from new attempts.
-- Move their order indexes out of the active 1-10 range because the legacy schema
-- enforces uniqueness across active and inactive questions alike.
update public.exam_questions question set is_active = false, order_index = -question.id::integer, updated_at = now()
where question.exam_id in (
  select exam.id
  from deep_exam_targets target
  join public.exams exam on exam.module_id = target.module_id
);

-- In-progress attempts contain immutable question snapshots. They must be
-- restarted when the underlying question bank is replaced; submitted attempts
-- and results remain untouched. Child snapshots cascade with the attempt.
delete from public.exam_attempts attempt
where attempt.status = 'in_progress'
  and attempt.exam_id in (
    select exam.id
    from deep_exam_targets target
    join public.exams exam on exam.module_id = target.module_id
  );

insert into public.exam_questions (exam_id, module_id, question, question_text, explanation, options, correct_answer, order_index, is_active)
select exam.id, target.module_id, bank.question_text, bank.question_text, bank.explanation, bank.options, bank.correct_answer, bank.order_index, true
from deep_exam_bank bank join deep_exam_targets target using (module_key) join public.exams exam on exam.module_id = target.module_id
where not exists (select 1 from public.exam_questions existing where existing.module_id = target.module_id and existing.question_text = bank.question_text and existing.deleted_at is null);

update public.exam_questions question set question = bank.question_text, explanation = bank.explanation, options = bank.options, correct_answer = bank.correct_answer, order_index = bank.order_index, is_active = true, deleted_at = null, updated_at = now()
from deep_exam_bank bank join deep_exam_targets target using (module_key)
where question.module_id = target.module_id and question.question_text = bank.question_text;

insert into public.exam_answer_options (question_id, option_text, is_correct, order_index)
select question.id, option.value, option.value = bank.correct_answer, option.ordinality::integer - 1
from deep_exam_bank bank join deep_exam_targets target using (module_key)
join public.exam_questions question on question.module_id = target.module_id and question.question_text = bank.question_text
cross join lateral jsonb_array_elements_text(bank.options) with ordinality option(value, ordinality)
where not exists (select 1 from public.exam_answer_options existing where existing.question_id = question.id and existing.option_text = option.value);

do $$ declare invalid text; begin
  select string_agg(format('%s vraag %s', check_row.module_key, check_row.order_index), ', ' order by check_row.module_key, check_row.order_index) into invalid
  from (
    select target.module_key, bank.order_index
    from deep_exam_bank bank join deep_exam_targets target using (module_key)
    join public.exam_questions question on question.module_id = target.module_id and question.question_text = bank.question_text
    left join public.exam_answer_options option on option.question_id = question.id
    group by target.module_key, bank.order_index, question.id
    having count(option.id) <> 4 or count(option.id) filter (where option.is_correct) <> 1
  ) check_row;
  if invalid is not null then raise exception 'Ongeldige vragen: %', invalid; end if;
end $$;

do $$ declare invalid_modules text; begin
  select string_agg(check_row.module_key, ', ' order by check_row.module_key) into invalid_modules
  from (
    select target.module_key
    from deep_exam_targets target
    join public.exams exam on exam.module_id = target.module_id
    left join public.exam_questions question
      on question.exam_id = exam.id
     and question.is_active = true
     and question.deleted_at is null
    group by target.module_key
    having count(question.id) <> 10
       or count(distinct question.order_index) <> 10
       or min(question.order_index) <> 1
       or max(question.order_index) <> 10
  ) check_row;
  if invalid_modules is not null then
    raise exception 'Actieve vraagbank is niet exact 1-10 voor: %', invalid_modules;
  end if;
end $$;

commit;
`;
}

const root = process.cwd();
const auditDir = path.join(root, "docs", "exams");
validateBank();
await mkdir(auditDir, { recursive: true });
await Promise.all(
  modules.map((module) =>
    writeFile(path.join(auditDir, `${module.key}.md`), auditMarkdown(module)),
  ),
);
await writeFile(
  path.join(root, "supabase", "replace_exam_questions_deep.sql"),
  seedSql(),
);
console.log(
  `Generated ${modules.length} audit files and ${modules.reduce((sum, module) => sum + module.questions.length, 0)} exam questions.`,
);
