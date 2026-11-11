import {
  COURSE_LANGUAGES,
  COURSE_QUESTION_BANKS,
  COURSE_OBJECTIVES,
  COURSE_THEMES
} from '../src/content/multilingual-courses.js';

const LEVELS = ['A1','A2','B1','B2','C1','C2'];
const COURSE_CONTENT_VERSION = 1;
const themeRu = {
  A1: ['Приветствия и знакомство','Повседневные действия','Люди и места','Практические ситуации'],
  A2: ['Опыт и прошлое','Планы и сравнения','Город и путешествия','Повседневные разговоры'],
  B1: ['Мнения и аргументы','Работа и сотрудничество','Общество и медиа','Самостоятельное общение'],
  B2: ['Аргументация с нюансами','Официальное общение','Сложные вопросы','Точность и стиль'],
  C1: ['Анализ и критическое мышление','Публичная дискуссия','Стиль и регистр','Сложная коммуникация'],
  C2: ['Оттенки значения','Риторика и точность','Сложные дискурсы','Свободное владение стилем']
};
const themeEn = {
  A1: ['Greetings and introductions','Everyday routines','People and places','Practical situations'],
  A2: ['Experiences and the past','Plans and comparisons','The city and travel','Everyday conversations'],
  B1: ['Opinions and arguments','Work and collaboration','Society and media','Independent communication'],
  B2: ['Nuanced argumentation','Formal communication','Complex issues','Precision and style'],
  C1: ['Analysis and critical thinking','Public debate','Style and register','Complex communication'],
  C2: ['Nuances of meaning','Rhetoric and precision','Complex discourse','Stylistic mastery']
};

function exerciseRows(languageCode) {
  const language = COURSE_LANGUAGES[languageCode];
  const banks = COURSE_QUESTION_BANKS[languageCode];
  if (!language || !banks) throw new Error('Missing multilingual course bank: ' + languageCode);
  const rows = [];
  for (const level of LEVELS) {
    const bank = banks[level];
    if (!Array.isArray(bank) || bank.length !== 8) {
      throw new Error(languageCode + ' ' + level + ' must contain exactly 8 curated exercises.');
    }
    bank.forEach((item, index) => {
      if (!item.prompt || !Array.isArray(item.options) || item.options.length !== 3 ||
          !Number.isInteger(item.answer) || item.answer < 0 || item.answer > 2) {
        throw new Error('Invalid exercise item: ' + languageCode + ' ' + level + ' #' + (index + 1));
      }
      const objective = COURSE_OBJECTIVES[level];
      const id = languageCode.toUpperCase() + '-' + level + '-' + String(index + 1).padStart(2,'0');
      const options = item.options.map((text, optionIndex) => ({
        id: ['a','b','c'][optionIndex],
        text
      }));
      rows.push({
        id,
        skill: item.skill,
        level,
        objective: objective.ru,
        instructions: {
          ru: 'Выбери один правильный вариант.',
          en: 'Choose one correct option.'
        },
        content: { type: 'multiple_choice', prompt: item.prompt, options },
        answer_key: { correct_option_id: ['a','b','c'][item.answer] },
        explanation: { ru: item.explanationRu, en: item.explanationEn },
        estimated_time: item.skill === 'reading' || item.skill === 'listening' ? 5 : 4,
        tags: [language.englishName.toLowerCase(), languageCode, level.toLowerCase(), 'cefr'],
        prerequisites: [],
        srs: {
          enabled: true,
          item_type: item.skill === 'vocabulary' ? 'vocabulary' : 'grammar_rule'
        },
        success_criteria: 'Choose the correct target-language form in context.',
        objective_i18n: objective,
        language_code: languageCode,
        status: 'published',
        version: COURSE_CONTENT_VERSION,
        updated_at: new Date().toISOString()
      });
    });
  }
  return rows;
}

function templateRows(languageCode) {
  const language = COURSE_LANGUAGES[languageCode];
  const banks = COURSE_QUESTION_BANKS[languageCode];
  const templates = [];
  for (const level of LEVELS) {
    const ids = banks[level].map((_, index) =>
      languageCode.toUpperCase() + '-' + level + '-' + String(index + 1).padStart(2,'0')
    );
    const weeklyThemes = Array.from({ length: 4 }, (_, weekIndex) => {
      const tasks = Array.from({ length: 7 }, (_, dayIndex) =>
        ids[(weekIndex * 7 + dayIndex) % ids.length]
      );
      return {
        theme: COURSE_THEMES[languageCode][level][weekIndex],
        theme_ru: themeRu[level][weekIndex],
        theme_en: themeEn[level][weekIndex],
        objective: COURSE_OBJECTIVES[level].ru,
        objective_en: COURSE_OBJECTIVES[level].en,
        tasks
      };
    });
    templates.push({
      id: languageCode + '-' + level.toLowerCase() + '-4-week',
      title: language.nativeName + ' ' + level + ' · 4 недели',
      goal: 'general',
      level_min: level,
      level_max: level,
      duration_weeks: 4,
      minutes_per_day: 10,
      weekly_themes: weeklyThemes,
      status: 'published',
      language_code: languageCode,
      version: COURSE_CONTENT_VERSION,
      updated_at: new Date().toISOString()
    });
  }
  return templates;
}

export async function seedMultilingualCourses(pool) {
  const languageCodes = Object.keys(COURSE_LANGUAGES);
  for (const languageCode of languageCodes) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const version = await client.query(
        'SELECT content_version FROM language_course_seed_versions WHERE language_code=$1 FOR UPDATE',
        [languageCode]
      );
      if (Number(version.rows[0]?.content_version || 0) >= COURSE_CONTENT_VERSION) {
        await client.query('COMMIT');
        console.log('Course content already seeded:', languageCode);
        continue;
      }

      const languages = await client.query(
        "SELECT course_status FROM study_languages WHERE language_code=$1",
        [languageCode]
      );
      if (!languages.rows[0]) throw new Error('Language catalog entry is missing: ' + languageCode);

      const exercises = exerciseRows(languageCode);
      await client.query(
        `INSERT INTO exercises
          (id,skill,level,objective,instructions,content,answer_key,explanation,
           estimated_time,tags,prerequisites,srs,success_criteria,objective_i18n,
           language_code,status,version,updated_at)
         SELECT x.id,x.skill,x.level,x.objective,x.instructions,x.content,x.answer_key,x.explanation,
                x.estimated_time,x.tags,x.prerequisites,x.srs,x.success_criteria,x.objective_i18n,
                x.language_code,x.status,x.version,x.updated_at
         FROM jsonb_to_recordset($1::jsonb) AS x(
           id TEXT,skill TEXT,level TEXT,objective TEXT,instructions JSONB,content JSONB,
           answer_key JSONB,explanation JSONB,estimated_time INTEGER,tags TEXT[],
           prerequisites TEXT[],srs JSONB,success_criteria TEXT,objective_i18n JSONB,
           language_code CHAR(2),status TEXT,version INTEGER,updated_at TIMESTAMPTZ
         )
         ON CONFLICT (id) DO UPDATE SET
           skill=EXCLUDED.skill,level=EXCLUDED.level,objective=EXCLUDED.objective,
           instructions=EXCLUDED.instructions,content=EXCLUDED.content,
           answer_key=EXCLUDED.answer_key,explanation=EXCLUDED.explanation,
           estimated_time=EXCLUDED.estimated_time,tags=EXCLUDED.tags,
           prerequisites=EXCLUDED.prerequisites,srs=EXCLUDED.srs,
           success_criteria=EXCLUDED.success_criteria,objective_i18n=EXCLUDED.objective_i18n,
           language_code=EXCLUDED.language_code,status='published',
           version=EXCLUDED.version,updated_at=NOW()`,
        [JSON.stringify(exercises)]
      );

      const templates = templateRows(languageCode);
      for (const template of templates) {
        await client.query(
          `INSERT INTO plan_templates
            (id,title,goal,level_min,level_max,duration_weeks,minutes_per_day,
             weekly_themes,status,language_code,version,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,NOW())
           ON CONFLICT (id) DO UPDATE SET
             title=EXCLUDED.title,goal=EXCLUDED.goal,level_min=EXCLUDED.level_min,
             level_max=EXCLUDED.level_max,duration_weeks=EXCLUDED.duration_weeks,
             minutes_per_day=EXCLUDED.minutes_per_day,weekly_themes=EXCLUDED.weekly_themes,
             status='published',language_code=EXCLUDED.language_code,
             version=EXCLUDED.version,updated_at=NOW()`,
          [template.id,template.title,template.goal,template.level_min,template.level_max,
            template.duration_weeks,template.minutes_per_day,JSON.stringify(template.weekly_themes),
            template.status,template.language_code,template.version]
        );
      }

      await client.query(
        `UPDATE study_languages
         SET course_status='available',speech_supported=TRUE,
             content_version=$2,updated_at=NOW()
         WHERE language_code=$1`,
        [languageCode, COURSE_CONTENT_VERSION]
      );
      await client.query(
        `INSERT INTO language_course_seed_versions (language_code,content_version,updated_at)
         VALUES ($1,$2,NOW())
         ON CONFLICT (language_code) DO UPDATE SET
           content_version=EXCLUDED.content_version,updated_at=NOW()`,
        [languageCode, COURSE_CONTENT_VERSION]
      );
      await client.query('COMMIT');
      console.log('Published multilingual course:', languageCode, '(' + exercises.length + ' exercises, ' + templates.length + ' plans)');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error('Could not publish ' + languageCode + ' course: ' + error.message);
    } finally {
      client.release();
    }
  }
}
