export const placementQuestions = [
  { id: 'P01', level: 'A1', prompt: 'She ___ a student.', options: [{id:'a',text:'am'},{id:'b',text:'is'},{id:'c',text:'are'}], answer: 'b' },
  { id: 'P02', level: 'A1', prompt: 'I have ___ apple.', options: [{id:'a',text:'a'},{id:'b',text:'an'},{id:'c',text:'the'}], answer: 'b' },
  { id: 'P03', level: 'A2', prompt: 'We ___ to the museum yesterday.', options: [{id:'a',text:'go'},{id:'b',text:'have gone'},{id:'c',text:'went'}], answer: 'c' },
  { id: 'P04', level: 'A2', prompt: 'There isn’t ___ milk left.', options: [{id:'a',text:'some'},{id:'b',text:'any'},{id:'c',text:'many'}], answer: 'b' },
  { id: 'P05', level: 'B1', prompt: 'I have lived here ___ 2022.', options: [{id:'a',text:'for'},{id:'b',text:'since'},{id:'c',text:'during'}], answer: 'b' },
  { id: 'P06', level: 'B1', prompt: 'If I ___ more time, I would learn another language.', options: [{id:'a',text:'have'},{id:'b',text:'will have'},{id:'c',text:'had'}], answer: 'c' },
  { id: 'P07', level: 'B1', prompt: 'The meeting was cancelled ___ the bad weather.', options: [{id:'a',text:'because'},{id:'b',text:'because of'},{id:'c',text:'although'}], answer: 'b' },
  { id: 'P08', level: 'B2', prompt: 'Rarely ___ such a convincing argument.', options: [{id:'a',text:'I have heard'},{id:'b',text:'have I heard'},{id:'c',text:'I heard'}], answer: 'b' },
  { id: 'P09', level: 'B2', prompt: 'The proposal needs ___ before Friday.', options: [{id:'a',text:'to review'},{id:'b',text:'reviewing'},{id:'c',text:'to be reviewed'}], answer: 'c' },
  { id: 'P10', level: 'B2', prompt: 'Had we known earlier, we ___ a different decision.', options: [{id:'a',text:'would make'},{id:'b',text:'would have made'},{id:'c',text:'made'}], answer: 'b' },
  { id: 'P11', level: 'C1', prompt: 'The report was concise, ___ comprehensive.', options: [{id:'a',text:'albeit'},{id:'b',text:'whereas'},{id:'c',text:'despite'}], answer: 'a' },
  { id: 'P12', level: 'C1', prompt: 'Not until the data was published ___ the scale of the problem.', options: [{id:'a',text:'we understood'},{id:'b',text:'did we understand'},{id:'c',text:'we had understood'}], answer: 'b' },
  { id: 'P13', level: 'C2', prompt: 'Choose the closest meaning of “to equivocate”.', options: [{id:'a',text:'to speak ambiguously to avoid commitment'},{id:'b',text:'to explain with great precision'},{id:'c',text:'to contradict a numerical result'}], answer: 'a' },
  { id: 'P14', level: 'C2', prompt: 'The author’s argument is persuasive, not because it is exhaustive, but because it is ___.', options: [{id:'a',text:'perspicuous'},{id:'b',text:'perfunctory'},{id:'c',text:'pernicious'}], answer: 'a' }
];

export function estimateLevel(correct) {
  if (correct <= 1) return 'Pre-A1';
  if (correct <= 2) return 'A1';
  if (correct <= 4) return 'A2';
  if (correct <= 7) return 'B1';
  if (correct <= 10) return 'B2';
  if (correct <= 12) return 'C1';
  return 'C2';
}

export function publicQuestions() {
  return placementQuestions.map(({ id, level, prompt, options }) => ({ id, level, prompt, options }));
}

export const germanPlacementQuestions = [
  { id: 'DE-P01', level: 'A1', prompt: 'Guten Morgen! — Guten ___.', options: [{id:'a',text:'Morgen'},{id:'b',text:'Nacht'},{id:'c',text:'Abend'}], answer: 'a' },
  { id: 'DE-P02', level: 'A1', prompt: 'Ich ___ Maria.', options: [{id:'a',text:'bin'},{id:'b',text:'bist'},{id:'c',text:'ist'}], answer: 'a' },
  { id: 'DE-P03', level: 'A1', prompt: 'Das ist ___ Tisch.', options: [{id:'a',text:'ein'},{id:'b',text:'eine'},{id:'c',text:'einen'}], answer: 'a' },
  { id: 'DE-P04', level: 'A1', prompt: 'Wir ___ in Berlin.', options: [{id:'a',text:'wohnen'},{id:'b',text:'wohnt'},{id:'c',text:'wohne'}], answer: 'a' },
  { id: 'DE-P05', level: 'A1', prompt: 'Ich habe ___ Schwester.', options: [{id:'a',text:'eine'},{id:'b',text:'einen'},{id:'c',text:'ein'}], answer: 'a' },
  { id: 'DE-P06', level: 'A1', prompt: 'Am Samstag ___ ich Fußball.', options: [{id:'a',text:'spiele'},{id:'b',text:'spielen'},{id:'c',text:'spielt'}], answer: 'a' },
  { id: 'DE-P07', level: 'A1', prompt: 'Ich trinke ___ Kaffee.', options: [{id:'a',text:'keinen'},{id:'b',text:'nicht'},{id:'c',text:'keine'}], answer: 'a' },
  { id: 'DE-P08', level: 'A2', prompt: 'Gestern ___ wir nach Hamburg gefahren.', options: [{id:'a',text:'sind'},{id:'b',text:'haben'},{id:'c',text:'werden'}], answer: 'a' },
  { id: 'DE-P09', level: 'A2', prompt: 'Ich helfe ___ Nachbarin.', options: [{id:'a',text:'meiner'},{id:'b',text:'meine'},{id:'c',text:'meinen'}], answer: 'a' },
  { id: 'DE-P10', level: 'A2', prompt: 'Ich lerne Deutsch, weil ich in Deutschland ___ .', options: [{id:'a',text:'arbeite'},{id:'b',text:'arbeiten'},{id:'c',text:'arbeitet'}], answer: 'a' },
  { id: 'DE-P11', level: 'A2', prompt: 'Der Zug ist ___ als der Bus.', options: [{id:'a',text:'schneller'},{id:'b',text:'am schnellsten'},{id:'c',text:'schnell'}], answer: 'a' },
  { id: 'DE-P12', level: 'A2', prompt: 'Als Kind ___ ich oft bei meiner Oma.', options: [{id:'a',text:'war'},{id:'b',text:'bin'},{id:'c',text:'gewesen'}], answer: 'a' },
  { id: 'DE-P13', level: 'A2', prompt: 'Könnten Sie mir bitte ___?', options: [{id:'a',text:'helfen'},{id:'b',text:'hilft'},{id:'c',text:'geholfen'}], answer: 'a' },
  { id: 'DE-P14', level: 'A2', prompt: 'Kannst du mir sagen, wann der Bus ___?', options: [{id:'a',text:'ankommt'},{id:'b',text:'kommt an'},{id:'c',text:'ankommen'}], answer: 'a' },
  { id: 'DE-P15', level: 'B1', prompt: 'Wenn ich mehr Zeit ___, würde ich ein Instrument lernen.', options: [{id:'a',text:'hätte'},{id:'b',text:'habe'},{id:'c',text:'hatte'}], answer: 'a' },
  { id: 'DE-P16', level: 'B1', prompt: 'Der Bericht muss bis Freitag ___ werden.', options: [{id:'a',text:'eingereicht'},{id:'b',text:'einreichen'},{id:'c',text:'einreicht'}], answer: 'a' },
  { id: 'DE-P17', level: 'B1', prompt: 'Das ist die Kollegin, mit ___ ich arbeite.', options: [{id:'a',text:'der'},{id:'b',text:'die'},{id:'c',text:'den'}], answer: 'a' },
  { id: 'DE-P18', level: 'B1', prompt: 'Er lernt viel, damit er die Prüfung ___.', options: [{id:'a',text:'besteht'},{id:'b',text:'bestehen'},{id:'c',text:'bestanden'}], answer: 'a' },
  { id: 'DE-P19', level: 'B2', prompt: 'Die Entscheidung wurde getroffen, ___ alle Beteiligten angehört worden waren.', options: [{id:'a',text:'nachdem'},{id:'b',text:'obwohl'},{id:'c',text:'solange'}], answer: 'a' },
  { id: 'DE-P20', level: 'B2', prompt: 'Der Antrag muss bis morgen ___ werden.', options: [{id:'a',text:'eingereicht'},{id:'b',text:'einreichen'},{id:'c',text:'eingereichte'}], answer: 'a' },
  { id: 'DE-P21', level: 'B2', prompt: 'Es wäre sinnvoll, die Ergebnisse erneut zu ___.', options: [{id:'a',text:'überprüfen'},{id:'b',text:'überprüft'},{id:'c',text:'überprüfen werden'}], answer: 'a' },
  { id: 'DE-P22', level: 'B2', prompt: 'Die Maßnahme, ___ Wirksamkeit noch untersucht wird, bleibt umstritten.', options: [{id:'a',text:'deren'},{id:'b',text:'der'},{id:'c',text:'die'}], answer: 'a' },
  { id: 'DE-P23', level: 'C1', prompt: 'Die Daten legen nahe, dass die Entwicklung ___ ist.', options: [{id:'a',text:'unumkehrbar'},{id:'b',text:'umkehren'},{id:'c',text:'Umkehr'}], answer: 'a' },
  { id: 'DE-P24', level: 'C1', prompt: 'Angesichts ___ Lage wurde die Sitzung vertagt.', options: [{id:'a',text:'der'},{id:'b',text:'die'},{id:'c',text:'den'}], answer: 'a' },
  { id: 'DE-P25', level: 'C1', prompt: 'Er erklärte, der Bericht ___ noch nicht fertig.', options: [{id:'a',text:'sei'},{id:'b',text:'ist'},{id:'c',text:'wäre'}], answer: 'a' },
  { id: 'DE-P26', level: 'C1', prompt: 'Die Ergebnisse sind insofern relevant, ___ sie einen Trend zeigen.', options: [{id:'a',text:'als'},{id:'b',text:'dass'},{id:'c',text:'wie'}], answer: 'a' },
  { id: 'DE-P27', level: 'C2', prompt: 'Die Zeugenaussage steht in ___ zu den dokumentierten Fakten.', options: [{id:'a',text:'Widerspruch'},{id:'b',text:'Verfügung'},{id:'c',text:'Aussicht'}], answer: 'a' },
  { id: 'DE-P28', level: 'C2', prompt: '___ seiner Tragweite wurde der Vorschlag nur am Rande erörtert.', options: [{id:'a',text:'Ungeachtet'},{id:'b',text:'Angesichts'},{id:'c',text:'Bezüglich'}], answer: 'a' },
  { id: 'DE-P29', level: 'C2', prompt: 'Sie stellte die Behauptung entschieden in ___.', options: [{id:'a',text:'Abrede'},{id:'b',text:'Aussicht'},{id:'c',text:'Frage'}], answer: 'a' },
  { id: 'DE-P30', level: 'C2', prompt: 'Als ___ gilt, dass jede Entscheidung nachvollziehbar begründet werden muss.', options: [{id:'a',text:'Prämisse'},{id:'b',text:'Prämie'},{id:'c',text:'Präambel'}], answer: 'a' }
];

export function estimateGermanLevel(correct, answers = []) {
  if (!Array.isArray(answers) || answers.length === 0) {
    if (correct <= 7) return 'A1';
    if (correct <= 14) return 'A2';
    if (correct <= 18) return 'B1';
    if (correct <= 22) return 'B2';
    if (correct <= 26) return 'C1';
    return 'C2';
  }

  const answerMap = new Map(answers.map(item => [item?.id, item?.option_id]));
  const thresholds = { A1: 5, A2: 5, B1: 3, B2: 3, C1: 3, C2: 3 };
  let estimated = 'A1';
  for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
    const band = germanPlacementQuestions.filter(question => question.level === level);
    const bandCorrect = band.filter(question => answerMap.get(question.id) === question.answer).length;
    if (bandCorrect < thresholds[level]) break;
    estimated = level;
  }
  return estimated;
}

export function publicGermanQuestions() {
  return germanPlacementQuestions.map(({ id, level, prompt, options }) => ({ id, level, prompt, options }));
}
