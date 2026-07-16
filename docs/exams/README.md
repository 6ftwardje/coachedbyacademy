# Verdiepte module-examens

Deze map bevat de onderwijskundige beoordeling en definitieve vraagbank per module. Iedere reeks bestaat uit tien vragen en volgt dezelfde verdeling:

- 2 vragen op begrip;
- 5 vragen op toepassing;
- 3 vragen op analyse en beoordeling.

De bestaande definitievragen zijn vervangen omdat ze grotendeels via herkenning, antwoordlengte en irrelevante afleiders oplosbaar waren. Iedere nieuwe vraag bevat vier opties uit dezelfde antwoordcategorie, één verdedigbaar correct antwoord, een bronverwijzing en een analyse van de geteste denkfout.

## Bestanden

- `module-01.md`: Program Design en Periodisering
- `module-02.md`: Nutrition
- `module-03.md`: How to Start and Standout
- `module-04.md`: Leadership and Coaching Skills
- `module-05.md`: Scale Your Service

De Markdownbestanden en `supabase/replace_exam_questions_deep.sql` worden samen gegenereerd door `scripts/build-deep-exams.mjs`. Wijzig de vragen daarom in de generator en voer daarna uit:

```bash
node scripts/build-deep-exams.mjs
```

De SQL-seed maakt de oude vragen inactief, activeert precies tien nieuwe vragen per module en bewaart bestaande examenpogingen en hun snapshots. De seed stopt met een fout wanneer een module ontbreekt of een vraag niet exact vier opties en één correct antwoord heeft.

## Publicatievoorbehoud

De course knowledge base is als draft en `review_required` gemarkeerd. De nieuwe vragen vermijden onduidelijke ASR-fragmenten en losse claims uit de reviewlijst, maar vóór gebruik als formeel examen blijft een inhoudelijke controle tegen de originele video’s of slides aanbevolen.
