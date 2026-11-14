import { buildExpandedQuestionBanks } from './expanded-question-bank.js';

const EXPANDED_BANKS = buildExpandedQuestionBanks();

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const GRAMMAR = {
  A1: [
    ['Present Simple', 'My brother ___ to school every morning.', ['go', 'goes', 'going', 'gone'], 1, 'With he, she or it, add -s to the verb in the Present Simple.'],
    ['Articles', 'She has ___ orange in her lunch box.', ['a', 'an', 'the', 'some'], 1, 'Use an before a singular countable noun that begins with a vowel sound.'],
    ['Verb to be', 'The books ___ on the table.', ['is', 'am', 'are', 'be'], 2, 'Use are with plural subjects such as books.'],
    ['Can / can’t', 'A bird ___ fly, but a fish cannot.', ['can', 'has', 'does', 'is'], 0, 'Use can + the base form to describe ability.'],
    ['There is / There are', '___ two windows in our classroom.', ['There is', 'There are', 'It is', 'They is'], 1, 'Use there are before plural nouns.'],
    ['Prepositions of place', 'The keys are ___ the bag.', ['in', 'at', 'from', 'to'], 0, 'Use in to show that something is inside a bag.']
  ],
  A2: [
    ['Past Simple', 'We ___ the science museum yesterday.', ['visit', 'visited', 'have visited', 'visiting'], 1, 'Use Past Simple for a finished action at a specific time in the past.'],
    ['Comparatives', 'This experiment is ___ than the first one.', ['interesting', 'more interesting', 'most interesting', 'the more interesting'], 1, 'Use more + adjective with longer adjectives to compare two things.'],
    ['Going to', 'Look at those clouds. It ___ rain.', ['is going to', 'will to', 'going to', 'is'], 0, 'Use be going to for a prediction based on present evidence.'],
    ['Countable nouns', 'How ___ books do we need for the project?', ['much', 'many', 'little', 'any of'], 1, 'Use how many with plural countable nouns.'],
    ['Present Continuous', 'Please be quiet. The students ___ a test.', ['take', 'takes', 'are taking', 'took'], 2, 'Use Present Continuous for an action happening now.'],
    ['Adverbs of frequency', 'She ___ forgets her homework; she is very organised.', ['never', 'yesterday', 'now', 'tomorrow'], 0, 'Use never to describe something that does not happen.']
  ],
  B1: [
    ['Past Simple', 'Scientists ___ a new species in the forest last year.', ['have discovered', 'discovered', 'discover', 'were discovering'], 1, 'Use Past Simple with a finished time expression such as last year.'],
    ['Zero Conditional', 'If plants ___ enough light, they cannot grow well.', ['didn’t get', 'won’t get', 'don’t get', 'haven’t got'], 2, 'Use Present Simple in both clauses of the Zero Conditional for general truths.'],
    ['Comparative adjectives', 'The new laboratory is ___ than the old one.', ['most modern', 'more modern', 'moderner', 'as modern'], 1, 'Use more + adjective + than with longer adjectives.'],
    ['Phrasal verbs', 'The astronaut had to ___ her equipment before entering the capsule.', ['take off', 'put on', 'look after', 'get up'], 0, 'Take off means to remove something that is being worn or carried.'],
    ['Cause and effect', 'The experiment succeeded ___ the team followed the instructions carefully.', ['although', 'because', 'unless', 'despite'], 1, 'Use because to introduce the reason why something happened.'],
    ['Present Perfect', 'Researchers ___ this problem for several years.', ['study', 'studied', 'have studied', 'are study'], 2, 'Use Present Perfect for a situation that began in the past and continues or remains relevant.']
  ],
  B2: [
    ['Passive Voice', 'The results ___ by an independent team last month.', ['reviewed', 'were reviewed', 'have reviewing', 'are review'], 1, 'Use was or were + past participle to form the Past Simple passive.'],
    ['Reported Speech', 'Maya said that she ___ the report the previous day.', ['finishes', 'has finished', 'had finished', 'will finish'], 2, 'Reported speech often shifts Past Simple to Past Perfect when reporting a prior event.'],
    ['Modal verbs', 'You ___ wear safety glasses during this laboratory activity; it is compulsory.', ['might', 'must', 'would', 'could'], 1, 'Must expresses a strong obligation or rule.'],
    ['Past Perfect', 'By the time the lecture started, we ___ our notes.', ['prepared', 'have prepared', 'had prepared', 'prepare'], 2, 'Use Past Perfect for an action completed before another past event.'],
    ['Conditionals', 'If the data were more reliable, the conclusion ___ stronger.', ['will be', 'would be', 'is', 'has been'], 1, 'Use the Second Conditional for an unreal or hypothetical present situation.'],
    ['Linking words', 'The method was expensive. ___, it produced very accurate results.', ['However', 'Because', 'Unless', 'Therefore of'], 0, 'Use however to introduce a contrast with the previous statement.']
  ],
  C1: [
    ['Mixed Conditionals', 'If the team had checked the figures, it ___ this mistake now.', ['would not be making', 'will not make', 'did not make', 'has not made'], 0, 'A past condition with a present result can use Past Perfect + would + continuous infinitive.'],
    ['Inversion', 'Rarely ___ such a clear explanation of the results.', ['we have seen', 'have we seen', 'we saw', 'did we have seen'], 1, 'After a negative or limiting adverb such as rarely, use subject–auxiliary inversion.'],
    ['Participle clauses', '___ carefully, the evidence supports the original theory.', ['Examining', 'Having examined', 'To examine', 'Examined it'], 1, 'Use a perfect participle clause when its action is completed before the main clause.'],
    ['Subjunctive', 'The committee recommended that the proposal ___ revised.', ['is', 'was', 'be', 'being'], 2, 'The mandative subjunctive uses the base form of the verb after recommend that.'],
    ['Collocations', 'The study provides ___ evidence for the proposed explanation.', ['compelling', 'convincing strongly', 'strongly compel', 'compelled'], 0, 'Compelling evidence is a natural academic collocation meaning highly persuasive evidence.'],
    ['Concessive clauses', 'Much ___ the findings were unexpected, the researchers remained cautious.', ['although', 'as', 'despite', 'however'], 1, 'Much as introduces a strong concession and is followed by a clause.']
  ]
};

const VOCABULARY = {
  A1: [
    ['Everyday words', 'I am thirsty. I would like a glass of ___.', ['water', 'bread', 'chair', 'window'], 0, 'Water is a drink, so it fits the meaning of thirsty.'],
    ['Places', 'You can borrow books from a ___.', ['library', 'bakery', 'station', 'factory'], 0, 'A library is a place where people can borrow books.'],
    ['Daily routine', 'I brush my ___ every morning.', ['teeth', 'shoes', 'hands', 'books'], 0, 'The natural expression is brush your teeth.'],
    ['Weather', 'Take an umbrella. It is ___.', ['raining', 'hungry', 'careful', 'expensive'], 0, 'Raining describes wet weather.'],
    ['Family', 'My mother’s brother is my ___.', ['cousin', 'uncle', 'nephew', 'grandfather'], 1, 'Your mother’s brother is your uncle.'],
    ['Food', 'A person who does not eat meat is a ___.', ['vegetarian', 'waiter', 'customer', 'farmer'], 0, 'A vegetarian does not eat meat.']
  ],
  A2: [
    ['Travel vocabulary', 'We need to ___ a table before we arrive at the restaurant.', ['book', 'lend', 'miss', 'repair'], 0, 'Book means to reserve something in advance.'],
    ['Adjectives', 'The instructions were very clear, so the task was ___.', ['confusing', 'straightforward', 'crowded', 'impatient'], 1, 'Straightforward means easy to understand or do.'],
    ['Phrasal verbs', 'Please ___ the lights when you leave the room.', ['turn off', 'look for', 'take after', 'get over'], 0, 'Turn off means to stop a light or device from working.'],
    ['Work vocabulary', 'She applied ___ a part-time job at the bookshop.', ['for', 'at', 'from', 'with'], 0, 'The standard collocation is apply for a job.'],
    ['Environment', 'We should ___ water instead of leaving the tap running.', ['waste', 'save', 'spend up', 'damage'], 1, 'Save water means to use less water and avoid wasting it.'],
    ['Feelings', 'He felt ___ when he passed the difficult exam.', ['relieved', 'ordinary', 'empty', 'local'], 0, 'Relieved describes feeling better after worry or difficulty ends.']
  ],
  B1: [
    ['Collocations', 'The school decided to ___ a survey about transport habits.', ['make', 'do', 'take', 'give'], 1, 'The natural collocation is do a survey.'],
    ['Word choice', 'The new evidence may ___ our understanding of climate patterns.', ['improve', 'increase to', 'rise', 'grow up'], 0, 'Improve means to make something better.'],
    ['Academic vocabulary', 'The article provides a useful ___ of the main causes.', ['overview', 'overlook', 'overhead', 'overcoat'], 0, 'An overview is a general summary of a subject.'],
    ['Phrasal verbs', 'We had to ___ the meeting because the speaker was ill.', ['put off', 'put out', 'put up', 'put through'], 0, 'Put off means to postpone something.'],
    ['Adjectives', 'The instructions were ___, so nobody knew what to do.', ['ambiguous', 'reliable', 'efficient', 'accurate'], 0, 'Ambiguous means open to more than one interpretation.'],
    ['Word formation', 'The discovery was a major scientific ___.', ['achieve', 'achievement', 'achievable', 'achievingly'], 1, 'Achievement is the noun form needed after a major scientific.']
  ],
  B2: [
    ['Nuance', 'The committee will ___ the proposal before making a decision.', ['assess', 'assume', 'assure', 'attach'], 0, 'Assess means to evaluate the quality or importance of something.'],
    ['Collocations', 'The new policy aims to ___ awareness of energy consumption.', ['raise', 'lift up', 'rise', 'grow'], 0, 'Raise awareness is the standard collocation.'],
    ['Phrasal verbs', 'The researchers had to ___ several unexpected difficulties.', ['come across', 'come along', 'come over', 'come through to'], 0, 'Come across means to encounter something unexpectedly.'],
    ['Precision', 'The results were ___ with the original prediction.', ['consistent', 'convenient', 'considerate', 'constant'], 0, 'Consistent with means in agreement with something.'],
    ['Word formation', 'The device is remarkably ___ and uses very little energy.', ['economy', 'economical', 'economise', 'economically'], 1, 'Economical is the adjective describing something that saves money or resources.'],
    ['Register', 'The report ___ the need for further research.', ['highlights', 'lights up', 'brings light', 'brightens'], 0, 'Highlights is a formal verb meaning draws attention to.']
  ],
  C1: [
    ['Academic vocabulary', 'The author’s argument is persuasive but not entirely ___.', ['tenable', 'tenacity', 'tenanted', 'tender'], 0, 'Tenable means able to be defended or maintained logically.'],
    ['Collocations', 'The findings cast ___ on the reliability of the earlier estimate.', ['doubt', 'suspicion', 'questionable', 'uncertain'], 0, 'Cast doubt on is the established collocation.'],
    ['Nuance', 'The results should be interpreted with ___.', ['caution', 'cautious', 'cautiously', 'cautioned'], 0, 'With caution is the correct noun phrase after the preposition with.'],
    ['Advanced phrasal verbs', 'The report attempts to ___ the differences between the two approaches.', ['account for', 'count on', 'make up for', 'come down with'], 0, 'Account for means to explain or provide a reason for something.'],
    ['Precision', 'The proposal was rejected because its central claim was ___.', ['untenable', 'unattainable', 'unmistakable', 'unanimous'], 0, 'Untenable means impossible to justify or defend.'],
    ['Academic style', 'The article offers a ___ analysis of the long-term consequences.', ['nuanced', 'newly', 'numerical', 'notable'], 0, 'Nuanced describes an analysis that recognises subtle distinctions.']
  ]
};

const PASSAGES = {
  A1: {
    title: 'A Day at the School Garden',
    text: 'On Friday, our class visits the school garden. We plant small flowers and water the vegetables. The teacher shows us how bees help plants grow. After lunch, we write the names of the plants in our notebooks. Everyone enjoys working outside, and we plan to visit the garden again next week.',
    questions: [
      ['When does the class visit the garden?', ['On Friday', 'On Monday', 'On Sunday', 'Every evening'], 0, 'The first sentence says the class visits on Friday.'],
      ['What does the class water?', ['The vegetables', 'The classroom', 'The books', 'The trees in the park'], 0, 'The text says they water the vegetables.'],
      ['What do bees help plants do?', ['Grow', 'Sleep', 'Move', 'Change colour'], 0, 'The teacher explains that bees help plants grow.'],
      ['What do students write in notebooks?', ['Plant names', 'Homework marks', 'Phone numbers', 'Shopping lists'], 0, 'After lunch, they write the names of the plants.']
    ]
  },
  A2: {
    title: 'A Small Town Science Fair',
    text: 'Last Saturday, a small town held its first science fair in the community hall. Local students presented simple projects about clean water, plants and renewable energy. Visitors could ask questions and try a few safe experiments. A group from the local school won a prize for a model that used sunlight to heat water. The organisers hope to make the event an annual tradition.',
    questions: [
      ['Where did the science fair take place?', ['In the community hall', 'At the railway station', 'In a sports centre', 'At the library'], 0, 'The fair took place in the community hall.'],
      ['What topics did students present?', ['Water, plants and renewable energy', 'Music, painting and dance', 'Cars, fashion and cooking', 'History, sport and travel'], 0, 'The passage lists clean water, plants and renewable energy.'],
      ['What won a prize?', ['A model using sunlight to heat water', 'A robot that cleaned the hall', 'A painting of the town', 'A new computer game'], 0, 'A school group won with a solar water-heating model.'],
      ['What do organisers hope to do?', ['Hold the fair every year', 'Move it to another country', 'Close the community hall', 'Invite only teachers'], 0, 'They hope to make it an annual tradition.']
    ]
  },
  B1: {
    title: 'Why Urban Trees Matter',
    text: 'Trees in cities do more than make streets attractive. Their leaves provide shade, while their roots help rainwater enter the soil instead of flowing directly into drains. Trees can also reduce the temperature of nearby areas on hot days. However, city planners must choose suitable species and leave enough space for roots to grow. A well-designed planting programme can make neighbourhoods healthier and more comfortable.',
    questions: [
      ['What do tree roots help rainwater do?', ['Enter the soil', 'Evaporate immediately', 'Become drinking water', 'Flow into buildings'], 0, 'The passage says roots help rainwater enter the soil.'],
      ['What can trees reduce on hot days?', ['Nearby temperatures', 'The number of streets', 'The length of the day', 'The amount of sunlight everywhere'], 0, 'Trees can lower the temperature of nearby areas.'],
      ['Why must planners choose suitable species?', ['Trees need enough space to grow', 'All trees grow at the same speed', 'Trees do not need water', 'City streets must be covered'], 0, 'The passage says suitable species and root space are important.'],
      ['What is the main idea?', ['Urban trees provide environmental benefits but need planning', 'Trees are useful only for decoration', 'Cities should remove all drains', 'Every tree species grows well in cities'], 0, 'The text describes several benefits and the need for careful planning.']
    ]
  },
  B2: {
    title: 'The Value of Repair Cafés',
    text: 'Repair cafés bring volunteers and local residents together to fix household objects that might otherwise be thrown away. These events can reduce waste, but their value is not purely environmental. Participants exchange practical knowledge, learn how products work and develop a stronger sense of community. Nevertheless, organisers must make sure that repairs are safe and that volunteers do not attempt work beyond their expertise. Their success depends on clear guidance and realistic expectations.',
    questions: [
      ['What is one environmental benefit of repair cafés?', ['They can reduce waste', 'They increase product packaging', 'They encourage people to replace everything', 'They make transport unnecessary'], 0, 'The passage explicitly says repair cafés can reduce waste.'],
      ['What do participants exchange?', ['Practical knowledge', 'House keys', 'School grades', 'Travel tickets'], 0, 'Participants share practical knowledge while repairing objects.'],
      ['What should volunteers avoid?', ['Work beyond their expertise', 'Explaining simple repairs', 'Working with other people', 'Learning how products function'], 0, 'The text warns against attempting work beyond their expertise.'],
      ['Which statement best summarises the passage?', ['Repair cafés offer social and environmental benefits when properly organised', 'Repair cafés are useful only for professional engineers', 'The events should accept every possible repair', 'Their main purpose is to sell new products'], 0, 'The passage combines environmental and community benefits with safety conditions.']
    ]
  },
  C1: {
    title: 'How Scientific Models Shape Decisions',
    text: 'Scientific models are simplified representations of complex systems. Their purpose is not to reproduce every detail, but to make certain relationships easier to examine. A climate model, for example, may reveal how changes in one variable influence several others. Yet the usefulness of a model depends on the assumptions behind it and the quality of the available evidence. Decision-makers should therefore treat model outputs as informed estimates rather than unquestionable predictions.',
    questions: [
      ['Why are scientific models simplified?', ['To make selected relationships easier to examine', 'To reproduce every detail of reality', 'To remove the need for evidence', 'To guarantee exact predictions'], 0, 'The passage says simplification helps examine selected relationships.'],
      ['What can a climate model reveal?', ['How one variable influences others', 'The exact weather on every future day', 'The personal opinions of scientists', 'The cost of every scientific instrument'], 0, 'The example describes relationships between variables.'],
      ['What affects a model’s usefulness?', ['Its assumptions and the quality of evidence', 'The number of colours in its charts', 'The age of the decision-maker', 'Whether it produces a simple headline'], 0, 'The passage directly identifies assumptions and evidence quality.'],
      ['What attitude should decision-makers adopt?', ['Treat outputs as informed estimates', 'Accept every output as certain', 'Ignore all model results', 'Replace evidence with intuition'], 0, 'The final sentence advises against treating outputs as unquestionable predictions.']
    ]
  }
};

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffleOptions(options, correctIndex) {
  const values = options.map((text, index) => ({ text, correct: index === correctIndex }));
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  const mapped = values.map((item, index) => ({
    id: ['a', 'b', 'c', 'd'][index],
    text: item.text
  }));
  return {
    options: mapped,
    correct_option_id: ['a', 'b', 'c', 'd'][values.findIndex(item => item.correct)]
  };
}

function makeQuestion(entry, index, category) {
  const [learningPoint, prompt, options, correctIndex, explanation] = entry;
  const shuffled = shuffleOptions(options, correctIndex);
  return {
    id: 'q' + (index + 1),
    prompt,
    category,
    learning_point: learningPoint,
    options: shuffled.options,
    correct_option_id: shuffled.correct_option_id,
    explanation
  };
}

export function buildInstantPracticeExercise({ level, skill, topic, focus = [] }) {
  if (!LEVELS.includes(level)) throw new Error('Unsupported CEFR level.');
  const passagesRequired = ['reading', 'listening'].includes(skill);
  let title = '';
  let instructions = '';
  let passage = '';
  let questions = [];

  if (passagesRequired) {
    const source = PASSAGES[level];
    title = (skill === 'listening' ? 'Listen and understand: ' : '') + source.title;
    instructions = skill === 'listening'
      ? 'Прослушай текст с помощью кнопки воспроизведения, затем ответь на вопросы по содержанию.'
      : 'Прочитай текст и выбери правильный ответ на каждый вопрос.';
    passage = source.text;
    questions = source.questions.map((item, index) => makeQuestion([
      skill === 'listening' ? 'Listening comprehension' : 'Reading comprehension',
      item[0], item[1], item[2], item[3]
    ], index, skill));
  } else {
    const grammar = [...GRAMMAR[level], ...EXPANDED_BANKS.grammar[level]];
    const vocabulary = [...VOCABULARY[level], ...EXPANDED_BANKS.vocabulary[level]];
    let entries = [];
    if (skill === 'grammar') {
      entries = grammar.map(entry => ({ entry, category: 'grammar' }));
      title = 'Quick grammar practice';
      instructions = 'Выбери правильный вариант. Упражнение готово сразу — ответы проверяются сервером.';
    } else if (skill === 'vocabulary') {
      entries = vocabulary.map(entry => ({ entry, category: 'vocabulary' }));
      title = 'Quick vocabulary practice';
      instructions = 'Выбери слово или выражение, которое лучше всего подходит по смыслу.';
    } else {
      entries = [
        ...grammar.slice(0, 4).map(entry => ({ entry, category: 'grammar' })),
        ...vocabulary.slice(0, 4).map(entry => ({ entry, category: 'vocabulary' }))
      ];
      title = 'Quick mixed practice';
      instructions = 'Проверь грамматику и словарный запас в коротком смешанном упражнении.';
    }

    const requestedFocus = focus.map(item => String(item.area || '').toLowerCase()).filter(Boolean);
    let selected;
    if (requestedFocus.length) {
      const matched = entries.filter(item => requestedFocus.some(area =>
        item.entry[0].toLowerCase().includes(area) || area.includes(item.entry[0].toLowerCase())
      ));
      selected = matched.length ? matched : entries;
    } else {
      selected = entries;
    }
    const selectedEntries = selected.slice().sort(() => Math.random() - 0.5).slice(0, 5);
    while (selectedEntries.length < 5) selectedEntries.push(entries[selectedEntries.length % entries.length]);
    questions = selectedEntries.map((item, index) => makeQuestion(item.entry, index, item.category));
  }

  return {
    title,
    instructions,
    passage,
    level,
    skill,
    topic,
    questions
  };
}
