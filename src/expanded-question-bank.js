const SCENES = {
  A1: ['before breakfast', 'after school', 'at the weekend', 'on school days', 'before going to bed'],
  A2: ['yesterday afternoon', 'during the school trip', 'last weekend', 'at the end of the lesson', 'earlier this month'],
  B1: ['during the field study', 'while preparing the project', 'at the research centre', 'during the class discussion', 'after the experiment'],
  B2: ['during the review process', 'at the annual conference', 'while examining the evidence', 'before the final decision', 'throughout the investigation'],
  C1: ['in the final analysis', 'having considered the evidence', 'throughout the consultation', 'under the revised framework', 'in the published report']
};

const PEOPLE = {
  A1: ['My brother', 'The class teacher', 'A young musician', 'Our neighbour', 'The shop assistant', 'My best friend', 'A school pupil', 'The bus driver', 'Her older sister', 'The museum guide'],
  A2: ['The local guide', 'My younger cousin', 'The science teacher', 'A group of visitors', 'The new student', 'The shop manager', 'Our neighbours', 'The project leader', 'A young artist', 'The football coach'],
  B1: ['The research team', 'A local journalist', 'The project leader', 'Several students', 'The museum curator', 'The science teacher', 'A group of volunteers', 'The town council', 'The new assistant', 'The visiting professor'],
  B2: ['The review committee', 'The research director', 'Several specialists', 'The project coordinator', 'The policy adviser', 'The editorial team', 'The laboratory manager', 'A group of analysts', 'The visiting researcher', 'The department head'],
  C1: ['The advisory panel', 'The principal investigator', 'The editorial board', 'Several independent reviewers', 'The academic committee', 'The policy commission', 'The senior researcher', 'The research consortium', 'The programme director', 'The external assessor']
};

function entry(point, prompt, correct, distractors, explanation) {
  return [point, prompt, [correct, ...distractors], 0, explanation];
}

function expandCross(items, contexts, build) {
  const output = [];
  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    for (let contextIndex = 0; contextIndex < contexts.length; contextIndex++) {
      output.push(build(items[itemIndex], contexts[contextIndex], itemIndex, contextIndex));
    }
  }
  return output;
}

const THIRD_PERSON_ACTIONS = [
  ['walk', 'walks', 'to the station'],
  ['check', 'checks', 'the class timetable'],
  ['carry', 'carries', 'a notebook'],
  ['study', 'studies', 'English vocabulary'],
  ['watch', 'watches', 'the evening news'],
  ['read', 'reads', 'a science magazine'],
  ['teach', 'teaches', 'a music lesson'],
  ['wash', 'washes', 'the family car'],
  ['write', 'writes', 'short stories'],
  ['fix', 'fixes', 'old bicycles']
];
const PLURAL_GROUPS = ['The library books', 'Those science projects', 'The new students', 'Our neighbours', 'The museum visitors', 'Several small boats', 'The garden flowers', 'These computer programmes', 'The history documents', 'The local buses'];
const ARTICLE_NOUNS = [
  ['apple', 'an'], ['umbrella', 'an'], ['idea', 'an'], ['experiment', 'an'], ['orange', 'an'],
  ['uniform', 'a'], ['book', 'a'], ['museum ticket', 'a'], ['yellow pencil', 'a'], ['useful map', 'a']
];
const HAVE_SUBJECTS = ['My cousin', 'The new teacher', 'A young scientist', 'Our neighbour', 'The shop owner', 'Her brother', 'The museum guide', 'A careful driver', 'The school nurse', 'My best friend'];
const HAVE_OBJECTS = ['a blue bicycle', 'a small notebook', 'two helpful assistants', 'a new camera', 'an interesting idea'];
const CAN_SUBJECTS = ['A dolphin', 'My little sister', 'The new computer', 'A good guide dog', 'Our school team', 'A strong swimmer', 'This mobile phone', 'The young athlete', 'A well-trained horse', 'My music teacher'];
const CAN_ACTIONS = ['swim long distances', 'speak three languages', 'solve difficult puzzles', 'carry heavy bags', 'play several instruments'];
const PLACE_OBJECTS = ['The school bag', 'The clean towels', 'A small lamp', 'The lunch box', 'My history book', 'The sports equipment', 'A warm jacket', 'The new computer', 'The kitchen plates', 'Our travel documents'];
const PLACE_SCENES = [
  ['in', 'the cupboard'], ['on', 'the wooden shelf'], ['under', 'the kitchen table'],
  ['in', 'the blue suitcase'], ['on', 'the teacher’s desk']
];

const PAST_VERBS = [
  ['visit', 'visited', 'the science exhibition'], ['collect', 'collected', 'local plants'],
  ['discover', 'discovered', 'an unusual rock'], ['measure', 'measured', 'the river level'],
  ['prepare', 'prepared', 'a short presentation'], ['record', 'recorded', 'the results'],
  ['compare', 'compared', 'two different maps'], ['interview', 'interviewed', 'the museum guide'],
  ['organise', 'organised', 'a school event'], ['design', 'designed', 'a simple experiment']
];
const A2_SUBJECTS = ['The visitors', 'Our class', 'The local team', 'My cousin', 'Several researchers', 'The school group', 'A young photographer', 'The volunteers', 'Our neighbours', 'The project leader'];
const CONTINUOUS_SUBJECTS = [
  ['The students', 'are'], ['My brother', 'is'], ['The scientists', 'are'], ['A teacher', 'is'],
  ['Our neighbours', 'are'], ['The museum guide', 'is'], ['Several children', 'are'],
  ['The project manager', 'is'], ['My friends', 'are'], ['A local artist', 'is']
];
const CONTINUOUS_ACTIONS = ['preparing a presentation', 'examining a sample', 'writing a report', 'building a model', 'discussing the results'];
const COMPARATIVES = [
  ['small', 'smaller'], ['bright', 'brighter'], ['careful', 'more careful'], ['efficient', 'more efficient'],
  ['modern', 'more modern'], ['wide', 'wider'], ['reliable', 'more reliable'], ['simple', 'simpler'],
  ['comfortable', 'more comfortable'], ['useful', 'more useful']
];
const COMPARISON_CONTEXTS = ['the previous design', 'the old classroom', 'the first experiment', 'the original route', 'the earlier model'];
const QUANTIFIERS = [
  ['books', 'many'], ['information', 'much'], ['questions', 'many'], ['equipment', 'much'],
  ['visitors', 'many'], ['research', 'much'], ['apples', 'many'], ['advice', 'much'],
  ['laboratories', 'many'], ['electricity', 'much']
];
const QUANTIFIER_FRAMES = ['How ___ {noun} do we need for the project?', 'How ___ {noun} did the team collect?', 'How ___ {noun} is available in the library?', 'How ___ {noun} should we order?', 'How ___ {noun} can the students use?'];
const DURATION_SUBJECTS = [
  ['She', 'has'], ['The research group', 'has'], ['They', 'have'], ['My parents', 'have'],
  ['The new student', 'has'], ['Our neighbours', 'have'], ['The teacher', 'has'],
  ['Several organisations', 'have'], ['He', 'has'], ['The volunteers', 'have']
];
const DURATIONS = ['for three years', 'since last September', 'for several months', 'since 2021', 'for a long time'];
const FUTURE_SUBJECTS = ['The sky', 'Those dark clouds', 'The weather forecast', 'The broken bridge', 'The empty fuel tank', 'The packed suitcase', 'The scheduled train', 'The wet ground', 'The rising river', 'The almost finished project'];
const FUTURE_RESULTS = ['rain soon', 'cause a delay', 'change before noon', 'need repairs', 'run out of fuel', 'leave early tomorrow', 'arrive in ten minutes', 'remain slippery', 'reach the path', 'be ready this afternoon'];

const ZERO_CONDITIONS = [
  ['water reaches 100°C', 'it', 'boils'], ['plants receive no light', 'they', 'stop growing'],
  ['metal gets hot', 'it', 'expands'], ['ice gets warm', 'it', 'melts'],
  ['people do not drink enough water', 'they', 'become thirsty'], ['the temperature falls below zero', 'water', 'freezes'],
  ['you mix blue and yellow paint', 'you', 'get green'], ['a battery is empty', 'the device', 'stops working'],
  ['the sun sets', 'the sky', 'becomes darker'], ['you heat butter', 'it', 'softens']
];
const ZERO_OUTCOMES = ['in a controlled experiment', 'under normal conditions', 'according to the basic rule', 'in this simple example', 'as a general scientific fact'];
const RELATIVE_ITEMS = [
  ['The researcher', 'person'], ['The laboratory', 'place'], ['The instrument', 'thing'], ['The scientist', 'person'],
  ['The archive', 'place'], ['The invention', 'thing'], ['The engineer', 'person'], ['The institution', 'place'],
  ['The document', 'thing'], ['The professor', 'person']
];
const RELATIVE_FRAMES = {
  person: ['works at the university', 'presented the results', 'helped the team yesterday', 'won the annual award', 'is leading the study'],
  place: ['we conducted the experiment', 'the museum held the exhibition', 'visitors can borrow books', 'the team met the guide', 'the archive stores historical maps'],
  thing: ['was designed by students', 'the researchers tested yesterday', 'contains the original records', 'the team discussed earlier', 'uses very little energy']
};
const GERUND_ITEMS = [
  ['enjoy', 'reading'], ['avoid', 'wasting'], ['consider', 'changing'], ['finish', 'writing'], ['suggest', 'using'],
  ['decide', 'to investigate'], ['hope', 'to publish'], ['plan', 'to compare'], ['manage', 'to complete'], ['refuse', 'to accept']
];
const GERUND_CONTEXTS = ['the final report', 'the new method', 'the research plan', 'the results carefully', 'the first draft'];
const PHRASAL_ITEMS = [
  ['put off', 'postpone'], ['carry out', 'perform'], ['find out', 'discover'], ['look into', 'investigate'],
  ['set up', 'establish'], ['bring about', 'cause'], ['point out', 'draw attention to'],
  ['come across', 'encounter'], ['work out', 'solve'], ['take over', 'assume control of']
];
const PHRASAL_CONTEXTS = ['the investigation', 'the meeting', 'the project', 'the unexpected problem', 'the new department'];
const LINKER_ITEMS = [
  ['because', 'a reason introduced by a subordinate clause'],
  ['although', 'a concession introduced by a subordinate clause'],
  ['unless', 'a condition meaning if not'],
  ['whereas', 'a comparison between contrasting facts'],
  ['therefore', 'a result at the beginning of a new sentence'],
  ['despite', 'a concession followed by a noun or gerund'],
  ['since', 'a reason or cause expressed as a subordinate clause'],
  ['however', 'a contrast between independent statements'],
  ['provided that', 'a condition meaning only if'],
  ['consequently', 'a consequence of a previous event']
];
const LINKER_FRAMES = [
  'Choose a linker expressing {meaning}: ___',
  'Which connector is used for {meaning}? ___',
  'Complete the grammar note: an expression of {meaning} is ___.',
  'A writer needs a connector for {meaning}. Select it: ___.',
  'Which linking expression introduces {meaning}? ___'
];

const PASSIVE_ITEMS = [
  ['The new bridge', 'inspect', 'by engineers', 'inspected', 'was'],
  ['The annual report', 'publish', 'by the director', 'published', 'was'],
  ['The samples', 'analyse', 'by the laboratory', 'analysed', 'were'],
  ['The old building', 'restore', 'by specialists', 'restored', 'was'],
  ['The results', 'review', 'by an independent panel', 'reviewed', 'were'],
  ['The software', 'update', 'by the technical team', 'updated', 'was'],
  ['The documents', 'archive', 'by the university', 'archived', 'were'],
  ['The equipment', 'deliver', 'by the supplier', 'delivered', 'was'],
  ['The exhibition', 'open', 'by the mayor', 'opened', 'was'],
  ['The proposal', 'approve', 'by the committee', 'approved', 'was']
];
const PASSIVE_TIMES = ['last month', 'in 2024', 'yesterday afternoon', 'at the end of the year', 'during the previous term'];
const REPORTED_ITEMS = [
  ['Maya said that she', 'complete', 'the report the previous day', 'completed'],
  ['The guide explained that the museum', 'close', 'at six o’clock', 'closed'],
  ['The director announced that the team', 'finish', 'the first stage', 'finished'],
  ['The scientist said that the device', 'work', 'correctly', 'worked'],
  ['The students explained that they', 'collect', 'all the samples', 'collected'],
  ['The witness told us that he', 'see', 'the vehicle earlier', 'seen'],
  ['The editor said that she', 'receive', 'the manuscript', 'received'],
  ['The manager reported that the office', 'move', 'to a new building', 'moved'],
  ['The coach said that the team', 'win', 'the previous match', 'won'],
  ['The lecturer explained that the experiment', 'begin', 'before noon', 'begun']
];
const REPORTED_OPTIONS = ['had completed', 'has completed', 'will complete', 'completes'];
const PAST_PERFECT_ITEMS = [
  ['the lecture began', 'we', 'prepare', 'our notes', 'prepared'],
  ['the train arrived', 'the passengers', 'buy', 'their tickets', 'bought'],
  ['the storm started', 'the residents', 'leave', 'the beach', 'left'],
  ['the shop closed', 'I', 'find', 'the correct address', 'found'],
  ['the film started', 'they', 'take', 'their seats', 'taken'],
  ['the test began', 'the students', 'read', 'the instructions', 'read'],
  ['the meeting started', 'the director', 'review', 'the agenda', 'reviewed'],
  ['the lights went out', 'the technicians', 'check', 'the system', 'checked'],
  ['the guests arrived', 'we', 'prepare', 'the room', 'prepared'],
  ['the bus departed', 'she', 'pack', 'her bag', 'packed']
];
const CONDITIONAL_SUBJECTS = ['I', 'The research team', 'Our school', 'The local council', 'The company', 'The museum', 'The students', 'The laboratory', 'The organisers', 'The town'];
const CONDITIONAL_ACTIONS = ['have more funding', 'know the final result', 'own a larger building', 'receive additional support', 'have better equipment'];
const MODAL_EVIDENCE = [
  ['The lights are off and the doors are locked.', 'cannot be open', ['must be open', 'should be open', 'would have open']],
  ['The researcher has a laboratory key and works there every day.', 'must be authorised', ['might not exist', 'cannot have access', 'would be a visitor']],
  ['There are dark clouds and strong winds outside.', 'might rain soon', ['must have snowed yesterday', 'cannot change', 'will never rain']],
  ['The report contains no supporting data.', 'cannot be conclusive', ['must be complete', 'has to be accurate', 'cannot be revised']],
  ['The team has checked the calculation three times.', 'is likely to be accurate', ['must be unrelated', 'cannot be checked', 'might never exist']],
  ['Nobody has answered the phone, but the office is open.', 'may be busy', ['must be closed yesterday', 'cannot have a phone', 'has to be empty']],
  ['The machine is making an unusual noise.', 'may need inspection', ['must be brand new', 'cannot be running', 'has to be silent']],
  ['All the seats are occupied and people are standing.', 'must be crowded', ['cannot be popular', 'might be empty', 'would have closed']],
  ['The package has not arrived and the tracking page shows a delay.', 'may arrive later', ['must have been delivered', 'cannot be delayed', 'has to be lost']],
  ['The evidence comes from several independent studies.', 'is likely to be reliable', ['cannot be examined', 'must be fictional', 'has to be incomplete']]
];
const B2_LINKERS = [
  ['nevertheless', 'a contrast between two independent statements'],
  ['whereas', 'a comparison between two contrasting facts'],
  ['provided that', 'a condition meaning only if'],
  ['therefore', 'a result or logical consequence'],
  ['although', 'a concession within a subordinate clause'],
  ['consequently', 'a consequence that follows from earlier information'],
  ['insofar as', 'a limitation meaning to the extent that'],
  ['notwithstanding', 'a concession meaning despite'],
  ['hence', 'a result or conclusion drawn from previous information'],
  ['alternatively', 'a different option or possibility']
];
const B2_LINKER_FRAMES = [
  'Choose the connector that expresses {meaning}: ___',
  'Which linking expression has this function: {meaning}? ___',
  'Complete the academic writing note: a phrase for {meaning} is ___.',
  'A writer needs to signal {meaning}. Which connector should be used? ___',
  'Select the word or phrase used to introduce {meaning}: ___.'
];

const C1_INVERSION = [
  ['Rarely', 'the committee has reached such a clear decision'],
  ['Not only', 'the findings challenged the theory, but they also changed the research plan'],
  ['Under no circumstances', 'the data should be released before review'],
  ['Little', 'the researchers knew about the unexpected result'],
  ['Only after the trial', 'the team understood the full effect'],
  ['Seldom', 'such careful analysis has been published'],
  ['At no point', 'the report suggests that the evidence is complete'],
  ['Hardly ever', 'the institution changes its policy'],
  ['No sooner', 'the lecture had begun than the alarm sounded'],
  ['Not until the final chapter', 'the author explains the central argument']
];
const MIXED_CONDITION_ITEMS = [
  ['If the committee had approved the plan', 'the project', 'be underway now'],
  ['If I had taken the earlier train', 'I', 'be at the conference now'],
  ['If the researchers had saved the files', 'the data', 'be available today'],
  ['If the city had invested sooner', 'public transport', 'be more efficient now'],
  ['If she had accepted the offer', 'she', 'work abroad now'],
  ['If the team had tested the design', 'the device', 'not fail today'],
  ['If the report had been clearer', 'readers', 'understand the findings now'],
  ['If the school had updated its equipment', 'students', 'use the new system now'],
  ['If we had booked earlier', 'we', 'stay closer to the venue now'],
  ['If the council had acted sooner', 'the problem', 'be less serious today']
];
const SUBJUNCTIVE_ITEMS = [
  ['The panel recommended that the proposal', 'be'],
  ['The adviser insisted that the document', 'be'],
  ['The committee demanded that the procedure', 'remain'],
  ['The supervisor suggested that the experiment', 'be'],
  ['The board requested that the figures', 'be'],
  ['The judge ordered that the records', 'be'],
  ['The director proposed that the policy', 'be'],
  ['The review team urged that the report', 'be'],
  ['The tutor requested that the assignment', 'be'],
  ['The chairperson insisted that the decision', 'be']
];
const PARTICIPLE_ITEMS = [
  ['After the researchers had reviewed the evidence', 'Having reviewed', 'the evidence'],
  ['Because the team had completed the survey', 'Having completed', 'the survey'],
  ['After the committee had considered each option', 'Having considered', 'each option'],
  ['Because the author had examined the sources', 'Having examined', 'the sources'],
  ['After the engineers had tested the prototype', 'Having tested', 'the prototype'],
  ['Because the students had compared the results', 'Having compared', 'the results'],
  ['After the panel had discussed the proposal', 'Having discussed', 'the proposal'],
  ['Because the curator had checked the records', 'Having checked', 'the records'],
  ['After the analysts had assessed the risk', 'Having assessed', 'the risk'],
  ['Because the university had approved the plan', 'Having approved', 'the plan']
];
const CONCESSION_ITEMS = [
  ['The evidence was limited', 'the conclusion was carefully qualified', 'Much as'],
  ['The task was demanding', 'the students completed it on time', 'Hard as'],
  ['The proposal was innovative', 'the committee requested further details', 'Innovative as'],
  ['The method was expensive', 'the results justified the investment', 'Expensive though'],
  ['The instructions were complex', 'the team followed them accurately', 'Complex as'],
  ['The findings were unexpected', 'they were supported by independent data', 'Unexpected as'],
  ['The journey was long', 'the group remained enthusiastic', 'Long as'],
  ['The question was difficult', 'the class discussed it thoughtfully', 'Difficult as'],
  ['The policy was unpopular', 'it achieved its stated objective', 'Unpopular though'],
  ['The results were promising', 'the researchers avoided strong claims', 'Promising as']
];

const VOCAB_SCENES = {
  A1: [
    ['Before school, students usually', 'to get ready on time.'],
    ['At weekends, families often', 'together.'],
    ['On busy mornings, young people', 'before leaving home.'],
    ['To stay organised, people should', 'as part of a simple routine.'],
    ['In the evening, friends can', 'after finishing their work.'],
    ['At home, children often', 'with their families.'],
    ['During the school week, pupils', 'before their lessons begin.'],
    ['When helping at home, everyone can', 'to keep things tidy.'],
    ['On a normal day, people sometimes', 'without thinking about it.'],
    ['Before an activity, a careful person should', 'in the right order.']
  ],
  A2: [
    ['Before travelling, people need to', 'so that the journey goes smoothly.'],
    ['During a school project, students often', 'to complete the task.'],
    ['When planning a trip, visitors should', 'before they leave.'],
    ['To protect the environment, local residents can', 'in their neighbourhood.'],
    ['After checking the instructions, the group decided to', 'together.'],
    ['At the end of the lesson, the class had to', 'before going home.'],
    ['When shopping online, customers should', 'before paying.'],
    ['During the holidays, visitors often', 'to learn more about the area.'],
    ['To stay healthy, people should', 'as part of their daily routine.'],
    ['When a problem occurs, a helpful neighbour may', 'without being asked.']
  ],
  B1: [
    ['When preparing a report, the research team should', 'before drawing a conclusion.'],
    ['During the project, students were asked to', 'in a clear and organised way.'],
    ['To solve the problem, the group decided to', 'rather than guess.'],
    ['In an academic discussion, speakers often', 'to support their argument.'],
    ['After reviewing the results, the editor chose to', 'in the final version.'],
    ['When presenting evidence, researchers must', 'so that readers can check it.'],
    ['During a debate, participants should', 'without interrupting one another.'],
    ['Before publishing an article, an editor needs to', 'for accuracy.'],
    ['To make steady progress, learners should', 'rather than memorise isolated facts.'],
    ['After receiving feedback, the author decided to', 'before sending the text again.']
  ],
  B2: [
    ['Before publishing the report, the committee must', 'using reliable sources.'],
    ['During the evaluation, the analysts agreed to', 'in a consistent manner.'],
    ['To improve the proposal, the team should', 'rather than make unsupported claims.'],
    ['When presenting the findings, the author needs to', 'with precise terminology.'],
    ['After considering the evidence, the reviewers decided to', 'in the final recommendation.'],
    ['When assessing the proposal, the panel must', 'against clearly defined criteria.'],
    ['Before reaching a conclusion, analysts should', 'from independent sources.'],
    ['To avoid unnecessary ambiguity, the writer needs to', 'with careful wording.'],
    ['During the consultation, both sides agreed to', 'in good faith.'],
    ['After the audit, the organisation was required to', 'across all departments.']
  ],
  C1: [
    ['In a formal review, the panel is expected to', 'before reaching a judgement.'],
    ['When assessing a complex claim, scholars should', 'rather than rely on intuition.'],
    ['To strengthen the argument, the author must', 'with carefully selected evidence.'],
    ['During the consultation, participants were asked to', 'in a constructive manner.'],
    ['In the final report, the committee chose to', 'with appropriate qualifications.'],
    ['When interpreting conflicting accounts, the historian must', 'before advancing an explanation.'],
    ['To avoid overstating the findings, researchers should', 'in their conclusions.'],
    ['Before accepting a theoretical claim, reviewers need to', 'with close attention to method.'],
    ['In a scholarly exchange, contributors are expected to', 'while acknowledging uncertainty.'],
    ['When revising a complex argument, the author should', 'without sacrificing precision.']
  ]
};

const VOCABULARY_ITEMS = {
  A1: [
    ['brush', 'their teeth', ['wash', 'open', 'carry'], 'The natural collocation is brush your teeth.'],
    ['make', 'the bed', ['do', 'build', 'take'], 'Make the bed means to arrange the sheets and covers.'],
    ['pack', 'a school bag', ['pour', 'peel', 'borrow'], 'Pack a bag means to put the things you need inside it.'],
    ['feed', 'the family pet', ['wear', 'close', 'spell'], 'Feed means to give food to a person or animal.'],
    ['water', 'the garden plants', ['catch', 'repair', 'count'], 'Water plants means to give them water.'],
    ['catch', 'the morning bus', ['grow', 'draw', 'break'], 'Catch a bus means to get on it in time.'],
    ['borrow', 'a book from the library', ['lend', 'spend', 'build'], 'Borrow means to take something temporarily and return it.'],
    ['peel', 'a ripe banana', ['stir', 'fold', 'hide'], 'Peel means to remove the skin from fruit or vegetables.'],
    ['wear', 'a warm coat outside', ['eat', 'bring', 'make'], 'Wear means to have clothes on your body.'],
    ['tidy', 'the bedroom before guests arrive', ['taste', 'travel', 'teach'], 'Tidy means to make a place neat and organised.']
  ],
  A2: [
    ['book', 'a room before arriving at the hotel', ['lend', 'miss', 'repair'], 'Book means to reserve something in advance.'],
    ['cancel', 'the trip because of heavy rain', ['collect', 'compare', 'continue'], 'Cancel means to decide that a planned event will not happen.'],
    ['recycle', 'paper and glass separately', ['borrow', 'damage', 'deliver'], 'Recycle means to process used materials so they can be used again.'],
    ['improve', 'your pronunciation through regular practice', ['invite', 'imagine', 'include'], 'Improve means to make something better.'],
    ['replace', 'the broken part with a new one', ['repeat', 'refuse', 'recognise'], 'Replace means to put something new in the place of another thing.'],
    ['complain', 'about the noisy room politely', ['prepare', 'prevent', 'protect'], 'Complain means to say that something is unsatisfactory.'],
    ['compare', 'the prices before choosing a product', ['connect', 'contain', 'control'], 'Compare means to examine similarities and differences.'],
    ['arrange', 'a meeting with the project leader', ['avoid', 'allow', 'appear'], 'Arrange means to organise or plan something.'],
    ['reduce', 'the amount of plastic packaging', ['refuse', 'repeat', 'remove'], 'Reduce means to make something smaller or less.'],
    ['remind', 'your friend about the homework deadline', ['return', 'repair', 'receive'], 'Remind means to help someone remember something.']
  ],
  B1: [
    ['conduct', 'a survey among local residents', ['construct', 'consume', 'confuse'], 'Conduct a survey is a standard collocation meaning to carry out research.'],
    ['postpone', 'the meeting until next Thursday', ['predict', 'persuade', 'provide'], 'Postpone means to arrange for something to happen later.'],
    ['clarify', 'the main point before the discussion', ['classify', 'calculate', 'combine'], 'Clarify means to make an idea easier to understand.'],
    ['maintain', 'a steady pace throughout the experiment', ['measure', 'mention', 'manage'], 'Maintain means to keep something at the same level or condition.'],
    ['obtain', 'permission before using the photographs', ['observe', 'organise', 'occur'], 'Obtain means to get or acquire something.'],
    ['emphasise', 'the importance of checking the source', ['estimate', 'escape', 'exchange'], 'Emphasise means to give special importance to something.'],
    ['contribute', 'useful ideas during the group task', ['compete', 'compare', 'complain'], 'Contribute means to give or add something to a shared activity.'],
    ['investigate', 'the cause of the unexpected result', ['illustrate', 'introduce', 'increase'], 'Investigate means to examine something systematically.'],
    ['recommend', 'a reliable source for further reading', ['recognise', 'recover', 'remove'], 'Recommend means to suggest something as suitable or useful.'],
    ['interpret', 'the data without changing its meaning', ['interrupt', 'interview', 'invent'], 'Interpret means to explain the meaning of information.']
  ],
  B2: [
    ['assess', 'the long-term impact of the new policy', ['assume', 'assure', 'attach'], 'Assess means to evaluate the quality, importance or effect of something.'],
    ['allocate', 'resources to the most urgent tasks', ['alter', 'alert', 'attain'], 'Allocate means to distribute resources for a particular purpose.'],
    [' substantiate', 'the claim with reliable evidence', ['substitute', 'subordinate', 'subtract'], 'Substantiate means to support a claim with evidence.'],
    ['undermine', 'the argument by ignoring relevant data', ['undergo', 'undertake', 'underline'], 'Undermine means to weaken something gradually or indirectly.'],
    ['implement', 'the revised procedure across the department', ['imply', 'impress', 'impose'], 'Implement means to put a plan or decision into effect.'],
    ['anticipate', 'possible delays in the delivery schedule', ['appreciate', 'associate', 'accumulate'], 'Anticipate means to expect something and prepare for it.'],
    ['distinguish', 'reliable findings from unsupported opinions', ['distribute', 'discharge', 'dismiss'], 'Distinguish means to recognise or show the difference between things.'],
    ['justify', 'the decision using clear criteria', ['jeopardise', 'generate', 'illustrate'], 'Justify means to give good reasons for a decision.'],
    ['facilitate', 'cooperation between the two research groups', ['fluctuate', 'formulate', 'frustrate'], 'Facilitate means to make an action or process easier.'],
    ['refine', 'the proposal after receiving feedback', ['reject', 'release', 'resolve'], 'Refine means to improve something by making small changes.']
  ],
  C1: [
    ['corroborate', 'the initial findings with independent evidence', ['contradict', 'contemplate', 'consolidate'], 'Corroborate means to confirm a statement with additional evidence.'],
    ['mitigate', 'the potential effects of the policy change', ['mediate', 'manipulate', 'motivate'], 'Mitigate means to make something harmful or serious less severe.'],
    ['scrutinise', 'the methodology before accepting the conclusion', ['summarise', 'simulate', 'subsidise'], 'Scrutinise means to examine something very carefully.'],
    ['articulate', 'the limitations of the proposed approach', ['accumulate', 'alleviate', 'anticipate'], 'Articulate means to express an idea clearly and effectively.'],
    ['reconcile', 'the conflicting accounts of the event', ['recall', 'recruit', 'reform'], 'Reconcile means to make different ideas or accounts compatible.'],
    ['extrapolate', 'a likely trend from the available data', ['elaborate', 'eliminate', 'exaggerate'], 'Extrapolate means to estimate beyond known information using existing trends.'],
    ['qualify', 'the conclusion to reflect the uncertainty', ['quantify', 'qualify for', 'question'], 'Qualify a statement means to limit or modify its force.'],
    ['concede', 'the weakness in the opposing argument', ['conceal', 'conceive', 'concentrate'], 'Concede means to admit that something is true, often reluctantly.'],
    ['delineate', 'the boundaries of the research question', ['delegate', 'dedicate', 'deviate'], 'Delineate means to describe or define something precisely.'],
    ['preserve', 'the distinction between evidence and interpretation', ['pursue', 'persuade', 'propose'], 'Preserve means to keep something unchanged or protected.']
  ]
};


const EXTRA_VOCABULARY_ITEMS = {
  A1: [
    ['draw', 'a picture of the school garden', ['sleep', 'arrive', 'believe'], 'Draw means to make a picture using a pen or pencil.'],
    ['count', 'the coins in the small box', ['swim', 'listen', 'borrow'], 'Count means to find the total number of things.'],
    ['pick', 'a flower from the garden', ['repair', 'study', 'close'], 'Pick means to take a flower or fruit from a plant.'],
    ['turn on', 'the light in the hallway', ['wear', 'eat', 'write'], 'Turn on means to start a light or machine.'],
    ['turn off', 'the television before bedtime', ['bring', 'grow', 'ask'], 'Turn off means to stop a device from working.'],
    ['send', 'a message to a classmate', ['peel', 'sweep', 'climb'], 'Send means to cause a message to go to another person.'],
    ['choose', 'a story from the classroom shelf', ['boil', 'catch', 'wash'], 'Choose means to decide which thing you want.'],
    ['cross', 'the road at the traffic lights', ['taste', 'paint', 'sleep'], 'Cross means to go from one side to the other.'],
    ['wait for', 'the bus near the station', ['drink', 'draw', 'clean'], 'Wait for means to stay until someone or something arrives.'],
    ['unlock', 'the front door with a key', ['bake', 'read', 'swim'], 'Unlock means to open a lock with a key.'],
    ['sweep', 'the kitchen floor after lunch', ['borrow', 'wear', 'sing'], 'Sweep means to clean a floor using a broom.'],
    ['fold', 'the clean clothes after washing', ['arrive', 'count', 'drive'], 'Fold means to bend something so one part lies over another.'],
    ['hang', 'the wet coat near the heater', ['cook', 'find', 'teach'], 'Hang means to put something on a hook or line.'],
    ['carry', 'a heavy school bag upstairs', ['sleep', 'taste', 'draw'], 'Carry means to hold and move something from one place to another.'],
    ['fix', 'a broken toy with a new part', ['drink', 'open', 'listen'], 'Fix means to repair something that is broken.'],
    ['plant', 'a small tree in the garden', ['read', 'wear', 'catch'], 'Plant means to put a seed or plant into soil.'],
    ['mix', 'the flour and water in a bowl', ['drive', 'borrow', 'climb'], 'Mix means to combine two or more things together.'],
    ['pour', 'some milk into the glass', ['write', 'close', 'play'], 'Pour means to make a liquid flow from one container to another.'],
    ['slice', 'the bread for the sandwiches', ['swim', 'count', 'wait'], 'Slice means to cut something into thin pieces.'],
    ['boil', 'the water before making tea', ['wear', 'ask', 'paint'], 'Boil means to heat a liquid until it bubbles.']
  ],
  A2: [
    ['reserve', 'a seat on the early train', ['remove', 'repeat', 'reduce'], 'Reserve means to arrange for something to be kept for you.'],
    ['pack', 'light clothes for the summer trip', ['predict', 'protect', 'produce'], 'Pack means to put the things you need into a bag.'],
    ['explore', 'the old part of the town on foot', ['explain', 'expect', 'exchange'], 'Explore means to travel around a place to learn about it.'],
    ['delay', 'the departure because of heavy snow', ['deliver', 'design', 'divide'], 'Delay means to make something happen later than planned.'],
    ['recommend', 'a quiet café near the station', ['recognise', 'recover', 'remove'], 'Recommend means to suggest something as a good choice.'],
    ['compare', 'the travel costs before booking', ['complain', 'compete', 'complete'], 'Compare means to examine two or more things to see how they differ.'],
    ['download', 'the timetable before leaving home', ['discover', 'decorate', 'describe'], 'Download means to copy a file from the internet to a device.'],
    ['charge', 'the phone before the long journey', ['change', 'check', 'choose'], 'Charge means to put electrical energy into a battery.'],
    ['miss', 'the last bus because we arrived late', ['manage', 'measure', 'mention'], 'Miss a bus means to arrive too late to catch it.'],
    ['reach', 'the hotel before the reception closes', ['raise', 'realise', 'reduce'], 'Reach means to arrive at a place.'],
    ['revise', 'the vocabulary before the end-of-term test', ['reviewed', 'remove', 'replace'], 'Revise means to study something again to prepare for a test.'],
    ['underline', 'the key information in the article', ['understand', 'undertake', 'undergo'], 'Underline means to draw a line under words for emphasis.'],
    ['summarise', 'the main points in three sentences', ['support', 'suppose', 'supply'], 'Summarise means to give the main ideas briefly.'],
    ['submit', 'the completed assignment before Friday', ['suggest', 'succeed', 'survive'], 'Submit means to give work to someone for consideration or marking.'],
    ['concentrate', 'on the listening task without distractions', ['communicate', 'celebrate', 'continue'], 'Concentrate means to give all your attention to something.'],
    ['recycle', 'empty bottles at the local collection point', ['receive', 'repair', 'replace'], 'Recycle means to process used materials so they can be used again.'],
    ['conserve', 'electricity by switching off unused lights', ['consider', 'connect', 'contain'], 'Conserve means to use something carefully and avoid waste.'],
    ['reuse', 'a glass jar instead of throwing it away', ['reduce', 'remove', 'refuse'], 'Reuse means to use an object again.'],
    ['repair', 'the damaged handle instead of replacing it', ['prepare', 'prevent', 'predict'], 'Repair means to fix something that is broken.'],
    ['protect', 'local wildlife from unnecessary disturbance', ['provide', 'produce', 'pretend'], 'Protect means to keep someone or something safe.']
  ],
  B1: [
    ['compile', 'the results from several independent surveys', ['compete', 'complain', 'confuse'], 'Compile means to collect information from different sources into one document.'],
    ['verify', 'the figures before submitting the report', ['vary', 'value', 'vanish'], 'Verify means to check that something is accurate or true.'],
    ['justify', 'the choice with clear supporting evidence', ['jeopardise', 'generate', 'graduate'], 'Justify means to provide a good reason for something.'],
    ['outline', 'the main stages of the research project', ['overlook', 'overcome', 'overhear'], 'Outline means to describe the main points without every detail.'],
    ['highlight', 'the most important findings in the summary', ['hide', 'hesitate', 'handle'], 'Highlight means to draw attention to something important.'],
    ['estimate', 'the total cost before ordering materials', ['establish', 'entertain', 'escape'], 'Estimate means to make an approximate calculation or judgement.'],
    ['conclude', 'the discussion with a short summary', ['confuse', 'confirm', 'continue'], 'Conclude means to bring something to an end.'],
    ['identify', 'the main cause of the delay', ['illustrate', 'ignore', 'imagine'], 'Identify means to recognise or name something.'],
    ['disturb', 'the concentration of other students', ['distribute', 'discover', 'discuss'], 'Disturb means to interrupt someone or make it difficult to continue.'],
    ['respond to', 'the feedback before the next meeting', ['recover from', 'result in', 'rely on'], 'Respond to means to react or give an answer to something.'],
    ['bring up', 'an important issue during the discussion', ['bring about', 'bring in', 'bring down'], 'Bring up means to mention a topic.'],
    ['carry out', 'a series of interviews with local residents', ['carry on', 'carry over', 'carry off'], 'Carry out means to conduct or perform a task.'],
    ['come up with', 'a practical solution to the problem', ['come across', 'come down with', 'come into'], 'Come up with means to think of an idea or plan.'],
    ['look into', 'the reasons behind the unexpected result', ['look after', 'look down on', 'look forward to'], 'Look into means to investigate something.'],
    ['put forward', 'a proposal for improving public transport', ['put off', 'put out', 'put up with'], 'Put forward means to suggest an idea for discussion.'],
    ['set out', 'the reasons for the decision in the introduction', ['set up', 'set aside', 'set off'], 'Set out means to explain or present information clearly.'],
    ['point out', 'a weakness in the original argument', ['point to', 'point at', 'point up'], 'Point out means to draw attention to a fact or detail.'],
    ['take into account', 'the needs of different age groups', ['take after', 'take over', 'take up'], 'Take into account means to consider something when making a decision.'],
    ['run out of', 'time before the final question', ['run into', 'run over', 'run through'], 'Run out of means to have none of something left.'],
    ['get across', 'the main idea to the audience', ['get over', 'get by', 'get away'], 'Get across means to communicate an idea successfully.']
  ],
  B2: [
    ['scrutinise', 'the contractual terms before signing the agreement', ['summarise', 'simulate', 'subsidise'], 'Scrutinise means to examine something very carefully.'],
    ['allocate', 'the available funding according to priority', ['alter', 'alert', 'attain'], 'Allocate means to distribute resources for a particular purpose.'],
    ['facilitate', 'a constructive exchange of ideas between departments', ['fluctuate', 'formulate', 'frustrate'], 'Facilitate means to make a process or action easier.'],
    ['undermine', 'the credibility of the findings with unsupported claims', ['undergo', 'undertake', 'underline'], 'Undermine means to weaken something gradually or indirectly.'],
    ['substantiate', 'the central claim with independently verified evidence', ['substitute', 'subordinate', 'subtract'], 'Substantiate means to support a claim with evidence.'],
    ['anticipate', 'potential delays and prepare an alternative schedule', ['appreciate', 'associate', 'accumulate'], 'Anticipate means to expect something and prepare for it.'],
    ['mitigate', 'the negative impact of the construction work', ['mediate', 'manipulate', 'motivate'], 'Mitigate means to make something harmful less severe.'],
    ['implement', 'the revised procedure across all regional offices', ['imply', 'impress', 'impose'], 'Implement means to put a plan or decision into effect.'],
    ['distinguish', 'reliable evidence from personal interpretation', ['distribute', 'discharge', 'dismiss'], 'Distinguish means to recognise or show a difference.'],
    ['refine', 'the proposal in response to the reviewers’ comments', ['reject', 'release', 'resolve'], 'Refine means to improve something by making small changes.'],
    ['compelling', 'because the evidence strongly supports the conclusion', ['complicated', 'comparable', 'complacent'], 'Compelling means convincing or persuasive.'],
    ['plausible', 'because the explanation is reasonable and supported by some evidence', ['possible', 'pleasant', 'partial'], 'Plausible means seeming reasonable or likely to be true.'],
    ['comprehensive', 'because it covers all the relevant aspects of the topic', ['competitive', 'compulsory', 'convenient'], 'Comprehensive means complete and including all or nearly all details.'],
    ['substantial', 'because the improvement is large and clearly noticeable', ['subtle', 'superficial', 'sufficient'], 'Substantial means considerable in size, amount or importance.'],
    ['tentative', 'because the conclusion may change when more data become available', ['temporary', 'tangible', 'typical'], 'Tentative means not certain or final.'],
    ['consistent with', 'the findings reported by the independent research team', ['similar for', 'aware about', 'capable with'], 'Consistent with means in agreement with something.'],
    ['in contrast to', 'the earlier model, the new design uses less energy', ['in addition to', 'on behalf of', 'in response for'], 'In contrast to introduces a difference between two things.'],
    ['in light of', 'the latest evidence, the policy was revised', ['in spite from', 'in case to', 'in order with'], 'In light of means taking new information into consideration.'],
    ['on behalf of', 'the entire research group, the director thanked the volunteers', ['in contrast to', 'in charge for', 'in favour with'], 'On behalf of means as a representative of someone.'],
    ['with regard to', 'the proposed changes, the committee requested more detail', ['as a result for', 'by means with', 'in place to'], 'With regard to means concerning or about something.']
  ],
  C1: [
    ['corroborate', 'the initial findings with evidence from an independent source', ['contradict', 'contemplate', 'consolidate'], 'Corroborate means to confirm a statement with additional evidence.'],
    ['extrapolate', 'a likely trend from the available longitudinal data', ['elaborate', 'eliminate', 'exaggerate'], 'Extrapolate means to estimate beyond known information using existing trends.'],
    ['delineate', 'the precise boundaries of the proposed research question', ['delegate', 'dedicate', 'deviate'], 'Delineate means to describe or define something precisely.'],
    ['reconcile', 'the conflicting accounts before publishing the final analysis', ['recall', 'recruit', 'reform'], 'Reconcile means to make different ideas or accounts compatible.'],
    ['qualify', 'the conclusion to reflect the uncertainty in the sample', ['quantify', 'question', 'qualify for'], 'Qualify a statement means to limit or modify its force.'],
    ['concede', 'a weakness in the opposing argument without abandoning the main claim', ['conceal', 'conceive', 'concentrate'], 'Concede means to admit that something is true, often reluctantly.'],
    ['articulate', 'the theoretical implications in a concise academic style', ['accumulate', 'alleviate', 'anticipate'], 'Articulate means to express an idea clearly and effectively.'],
    ['mitigate', 'the unintended consequences of the proposed intervention', ['mediate', 'manipulate', 'motivate'], 'Mitigate means to make something harmful or serious less severe.'],
    ['scrutinise', 'the assumptions underlying the statistical model', ['summarise', 'simulate', 'subsidise'], 'Scrutinise means to examine something very carefully.'],
    ['preserve', 'the distinction between empirical evidence and interpretation', ['pursue', 'persuade', 'propose'], 'Preserve means to keep something unchanged or protected.'],
    ['tenable', 'because the claim can be defended with the available evidence', ['tenacious', 'tentative', 'tenuous'], 'Tenable means able to be defended or maintained logically.'],
    ['nuanced', 'because the analysis recognises several subtle distinctions', ['numerical', 'notable', 'novel'], 'Nuanced describes an approach that recognises subtle distinctions.'],
    ['salient', 'because this point is especially relevant to the central argument', ['silent', 'solitary', 'similar'], 'Salient means most noticeable or important.'],
    ['ubiquitous', 'because the practice is found almost everywhere', ['ambiguous', 'obscure', 'obsolete'], 'Ubiquitous means present or found everywhere.'],
    ['pervasive', 'because the influence affects many different areas of society', ['persuasive', 'peripheral', 'permissive'], 'Pervasive means spreading widely throughout an area or group.'],
    ['inherent in', 'the structure of the institution rather than an isolated decision', ['involved with', 'interested about', 'in contrast for'], 'Inherent in means existing as a natural or essential part of something.'],
    ['contingent on', 'the availability of independent confirmation', ['consistent of', 'conducive with', 'contemporary to'], 'Contingent on means dependent on a particular condition.'],
    ['commensurate with', 'the scale of the resources invested in the project', ['compatible to', 'comparable for', 'complementary with'], 'Commensurate with means matching something in size or degree.'],
    ['tantamount to', 'an admission that the original framework is inadequate', ['equivalent with', 'similar for', 'inherent at'], 'Tantamount to means equivalent in effect or value.'],
    ['predicated on', 'the assumption that the source material is reliable', ['preoccupied for', 'presented by', 'preserved at'], 'Predicated on means based on a particular idea or assumption.']
  ]
};
const VOCAB_QUESTION_FRAMES = [
  'Which word or phrase best matches this meaning: "{meaning}"? ___',
  'Select the vocabulary item defined as "{meaning}": ___',
  'A learner wants to express this idea: "{meaning}". Which option fits? ___',
  'Complete the vocabulary note. "{meaning}" = ___',
  'Choose the expression described here: "{meaning}" ___',
  'Which item would be appropriate when you need to say "{meaning}"? ___',
  'The dictionary gives this explanation: "{meaning}". Which headword matches it? ___',
  'Identify the word or phrase whose meaning is "{meaning}": ___',
  'A text uses an expression meaning "{meaning}". Choose it: ___',
  'Which vocabulary item is described by the definition "{meaning}"? ___'
];

function makeGrammarBank(level) {
  const people = PEOPLE[level];
  const scenes = SCENES[level];
  const rows = [];

  if (level === 'A1') {
    rows.push(...expandCross(people, THIRD_PERSON_ACTIONS, (person, action) =>
      entry('Present Simple: third-person singular',
        person + ' ___ ' + action[2] + ' ' + randomItem(scenes) + '.',
        action[1], [action[0], action[0] + 'ing', action[0] + 'ed'],
        'With he, she or a singular noun, add -s or -es in the Present Simple.'
      )));
    rows.push(...expandCross(PLURAL_GROUPS, scenes, (group, scene) =>
      entry('Verb to be: plural subjects',
        group + ' ___ ready ' + scene + '.',
        'are', ['is', 'am', 'be'],
        'Use are with plural subjects.'
      )));
    rows.push(...expandCross(ARTICLE_NOUNS, scenes, (noun, scene) =>
      entry('Articles: a / an',
        'We found ___ ' + noun[0] + ' ' + scene + ' during the class activity.',
        noun[1], [noun[1] === 'an' ? 'a' : 'an', 'the', 'some'],
        'Choose a or an according to the first sound of the singular countable noun.'
      )));
    rows.push(...expandCross(HAVE_SUBJECTS, HAVE_OBJECTS, (person, object) =>
      entry('Have / has',
        person + ' ___ ' + object + '.',
        'has', ['have', 'having', 'had'],
        'Use has with he, she, it and singular subjects.'
      )));
    rows.push(...expandCross(CAN_SUBJECTS, CAN_ACTIONS, (subject, action) =>
      entry('Can: ability',
        subject + ' ___ ' + action + '.',
        'can', ['has', 'does', 'is'],
        'Use can + the base form of a verb to describe ability.'
      )));
    rows.push(...expandCross(PLACE_OBJECTS, PLACE_SCENES, (object, scene) =>
      entry('Prepositions of place',
        object + ' is ___ ' + scene[1] + '.',
        scene[0], ['at', 'between', 'from'],
        'Use the preposition that describes the stated position.'
      )));
  } else if (level === 'A2') {
    rows.push(...expandCross(A2_SUBJECTS, PAST_VERBS, (subject, verb) =>
      entry('Past Simple: finished actions',
        subject + ' ___ ' + verb[2] + ' ' + randomItem(scenes) + '.',
        verb[1], [verb[0], 'has ' + verb[1], verb[0] + 'ing'],
        'Use Past Simple for an action completed at a finished time in the past.'
      )));
    rows.push(...expandCross(CONTINUOUS_SUBJECTS, CONTINUOUS_ACTIONS, (subject, action) =>
      entry('Present Continuous',
        subject[0] + ' ___ ' + action + ' right now.',
        subject[1] + ' ' + (action.split(' ')[0].endsWith('e') ? action.split(' ')[0].slice(0, -1) + 'ing' : action.split(' ')[0] + 'ing') + ' ' + action.split(' ').slice(1).join(' '),
        [subject[1] === 'is' ? 'are' : 'is', 'was', 'have'],
        'Use am/is/are + verb-ing for an action happening now.'
      )));
    rows.push(...expandCross(COMPARATIVES, COMPARISON_CONTEXTS, (adjective, context) =>
      entry('Comparative adjectives',
        'The new design is ___ than ' + context + '.',
        adjective[1], [adjective[0], 'the most ' + adjective[0], 'as ' + adjective[0] + ' as'],
        'Use the comparative form + than when comparing two things.'
      )));
    rows.push(...expandCross(QUANTIFIERS, QUANTIFIER_FRAMES, (noun, frame) =>
      entry('Much / many',
        frame.replace('{noun}', noun[0]),
        noun[1], [noun[1] === 'many' ? 'much' : 'many', 'few', 'several'],
        noun[1] === 'many' ? 'Use many with plural countable nouns.' : 'Use much with uncountable nouns.'
      )));
    rows.push(...expandCross(DURATION_SUBJECTS, DURATIONS, (subject, duration) =>
      entry('Present Perfect: has / have',
        subject[0] + ' ___ worked on this project ' + duration + '.',
        subject[1], [subject[1] === 'has' ? 'have' : 'has', 'is', 'was'],
        'Use have or has + past participle for a situation continuing to the present.'
      )));
    rows.push(...expandCross(FUTURE_SUBJECTS, FUTURE_RESULTS, (subject, result) =>
      entry('Be going to: predictions',
        'Look at ' + subject.toLowerCase() + '. It ___ ' + result + '.',
        'is going to', ['will to', 'going to', 'is'],
        'Use be going to for a prediction based on present evidence.'
      )));
  } else if (level === 'B1') {
    rows.push(...expandCross(A2_SUBJECTS, PAST_VERBS, (subject, verb) =>
      entry('Past Simple: finished time',
        subject + ' ___ ' + verb[2] + ' last year.',
        verb[1], [verb[0], 'has ' + verb[1], 'was ' + verb[1] + 'ing'],
        'A finished time such as last year normally requires the Past Simple.'
      )));
    rows.push(...expandCross(ZERO_CONDITIONS, ZERO_OUTCOMES, (condition, scene) =>
      entry('Zero Conditional',
        scene + ': If ' + condition[0] + ', ' + condition[1] + ' ___.',
        condition[2], [condition[2] + 's', 'will ' + condition[2], 'would ' + condition[2]],
        'Use the Present Simple in both clauses for general truths and scientific facts.'
      )));
    rows.push(...RELATIVE_ITEMS.flatMap(item =>
      expandCross([item], RELATIVE_FRAMES[item[1]], (target, frame) =>
        entry('Relative pronouns',
          target[0] + ' ___ ' + frame + '.',
          target[1] === 'person' ? 'who' : target[1] === 'place' ? 'where' : 'which',
          target[1] === 'person' ? ['which', 'where', 'whose'] : target[1] === 'place' ? ['who', 'which', 'whose'] : ['who', 'where', 'whose'],
          'Use who for people, where for places and which for things.'
        )
      )
    ));
    rows.push(...expandCross(GERUND_ITEMS, GERUND_CONTEXTS, (item, context) =>
      entry('Gerund or infinitive',
        'The team ' + item[0] + ' ___ ' + context + '.',
        item[1], [item[1].startsWith('to ') ? item[1].slice(3) + 'ing' : 'to ' + item[1], 'to do', 'doing'],
        'Some verbs are followed by a gerund, while others are followed by a to-infinitive.'
      )));
    rows.push(...expandCross(PHRASAL_ITEMS, PHRASAL_CONTEXTS, (item, context) =>
      entry('Phrasal verbs: meaning',
        'In this context, the team had to ' + item[0] + ' ' + context + '. Which meaning fits?',
        item[1], ['ignore', 'damage', 'repeat'],
        'Phrasal verbs often have meanings that cannot be understood from each word separately.'
      )));
    rows.push(...expandCross(LINKER_ITEMS, LINKER_FRAMES, (item, frame) =>
      entry('Linking words: ' + item[1],
        frame.replace('{meaning}', item[1]),
        item[0], LINKER_ITEMS.filter(other => other[0] !== item[0]).slice(0, 3).map(other => other[0]),
        'This expression is used to signal ' + item[1] + '.'
      )));
  } else if (level === 'B2') {
    rows.push(...expandCross(PASSIVE_ITEMS, PASSIVE_TIMES, (item, time) =>
      entry('Passive Voice: Past Simple',
        item[0] + ' ___ ' + time + ' ' + item[2] + '.',
        item[4] + ' ' + item[3], [item[3], 'has ' + item[3], 'is ' + item[1] + 'ing'],
        'Use was/were + past participle for the Past Simple passive.'
      )));
    rows.push(...expandCross(REPORTED_ITEMS, SCENES[level], (item, scene) =>
      entry('Reported Speech',
        item[0] + ' ___ ' + item[2] + ' ' + scene + '.',
        'had ' + item[3], REPORTED_OPTIONS.filter(value => value !== 'had ' + item[3]).slice(0, 3),
        'Reported speech often shifts a completed earlier action to the Past Perfect.'
      )));
    rows.push(...expandCross(PAST_PERFECT_ITEMS, SCENES[level], (item, scene) =>
      entry('Past Perfect',
        'By the time ' + item[0] + ', ' + item[1] + ' ___ ' + item[3] + ' ' + scene + '.',
        'had ' + item[4], ['has ' + item[4], item[2] + 's', 'was ' + item[2] + 'ing'],
        'Use the Past Perfect for an action completed before another past event.'
      )));
    rows.push(...expandCross(CONDITIONAL_SUBJECTS, CONDITIONAL_ACTIONS, (subject, action) =>
      entry('Second Conditional',
        'If ' + subject + ' ___, the situation would be different.',
        'had ' + action, ['has ' + action, 'will have ' + action, 'have ' + action],
        'Use if + Past Simple and would + base verb for an unreal present situation.'
      )));
    rows.push(...expandCross(MODAL_EVIDENCE, SCENES[level], (item, scene) =>
      entry('Modals of deduction',
        scene + ': ' + item[0] + ' The best conclusion is that it ' + '___' + '.',
        item[1], item[2],
        'Choose the modal expression that best matches the strength of the available evidence.'
      )));
    rows.push(...expandCross(B2_LINKERS, B2_LINKER_FRAMES, (item, frame) =>
      entry('Advanced linking expressions',
        frame.replace('{meaning}', item[1]),
        item[0], B2_LINKERS.filter(other => other[0] !== item[0]).slice(0, 3).map(other => other[0]),
        'This expression signals ' + item[1] + '.'
      )));
  } else {
    rows.push(...expandCross(C1_INVERSION, SCENES[level], (item, scene) =>
      entry('Inversion after limiting adverbs',
        item[0] + ' ___ ' + scene + '.',
        item[1].replace(/^the committee has/u, 'has the committee').replace(/^the findings challenged/u, 'did the findings challenge').replace(/^the data should/u, 'should the data').replace(/^the researchers knew/u, 'did the researchers know').replace(/^the team understood/u, 'did the team understand').replace(/^such careful analysis has/u, 'has such careful analysis').replace(/^the report suggests/u, 'does the report suggest').replace(/^the institution changes/u, 'does the institution change').replace(/^the lecture had/u, 'had the lecture').replace(/^the author explains/u, 'does the author explain'),
        ['the committee has', 'the findings challenged', 'the data should', 'the researchers knew'].filter(value => !item[1].startsWith(value)).slice(0, 3),
        'Negative or restrictive expressions at the beginning of a clause require subject–auxiliary inversion.'
      )));
    rows.push(...expandCross(MIXED_CONDITION_ITEMS, SCENES[level], (item, scene) =>
      entry('Mixed Conditionals',
        item[0] + ', ' + item[1] + ' ___ ' + scene + '.',
        'would ' + item[2], ['will be available', 'would have been available', 'is available'],
        'A past unreal condition with a present result uses Past Perfect + would + base form.'
      )));
    rows.push(...expandCross(SUBJUNCTIVE_ITEMS, SCENES[level], (item, scene) =>
      entry('Mandative subjunctive',
        item[0] + ' ___ revised ' + scene + '.',
        item[1], ['is', 'was', 'being'],
        'After verbs such as recommend, insist and demand, formal English can use the base form in a that-clause.'
      )));
    rows.push(...expandCross(PARTICIPLE_ITEMS, SCENES[level], (item, scene) =>
      entry('Perfect participle clauses',
        '___, the team presented its conclusions ' + scene + '.',
        item[1] + ' ' + item[2], ['Being reviewing ' + item[2], 'To have reviewed ' + item[2], 'Having been review ' + item[2]],
        'Use Having + past participle to show that one action was completed before another.'
      )));
    rows.push(...expandCross(CONCESSION_ITEMS, SCENES[level], (item, scene) =>
      entry('Concessive clauses',
        item[0] + ', ' + item[1] + '. Choose the best opening expression: ___ ' + scene + ', ...',
        item[2], ['Because', 'Unless', 'Therefore'],
        'Concessive expressions introduce an unexpected contrast between two facts.'
      )));
    rows.push(...expandCross(PHRASAL_ITEMS, SCENES[level], (item, scene) =>
      entry('Precision and academic vocabulary',
        scene + ': In this sentence, the expression "' + item[0] + '" means ___.',
        item[1], PHRASAL_ITEMS.filter(other => other[1] !== item[1]).slice(0, 3).map(other => other[1]),
        'Choose the meaning that matches the expression in context.'
      )));
  }
  return rows;
}

function makeVocabularyBank(level) {
  const items = [...VOCABULARY_ITEMS[level], ...EXTRA_VOCABULARY_ITEMS[level]];
  return expandCross(items, VOCAB_QUESTION_FRAMES, (item, frame, itemIndex, frameIndex) =>
    entry('Vocabulary in context: ' + (itemIndex < 10 ? 'core' : 'extended'),
      frame.replace('{meaning}', item[3]),
      item[0], item[2], item[3]
    )
  );
}

export function buildExpandedQuestionBanks() {
  const grammar = {};
  const vocabulary = {};
  for (const level of LEVELS) {
    grammar[level] = makeGrammarBank(level);
    vocabulary[level] = makeVocabularyBank(level);
  }
  return { grammar, vocabulary };
}

export function getExpandedQuestionBankStats() {
  const bank = buildExpandedQuestionBanks();
  const grammarCount = LEVELS.reduce((sum, level) => sum + bank.grammar[level].length, 0);
  const vocabularyCount = LEVELS.reduce((sum, level) => sum + bank.vocabulary[level].length, 0);
  const prompts = [
    ...LEVELS.flatMap(level => bank.grammar[level].map(item => level + '|grammar|' + item[1])),
    ...LEVELS.flatMap(level => bank.vocabulary[level].map(item => level + '|vocabulary|' + item[1]))
  ];
  return {
    grammarCount,
    vocabularyCount,
    total: grammarCount + vocabularyCount,
    uniquePrompts: new Set(prompts).size,
    byLevel: Object.fromEntries(LEVELS.map(level => [level, {
      grammar: bank.grammar[level].length,
      vocabulary: bank.vocabulary[level].length
    }]))
  };
}
