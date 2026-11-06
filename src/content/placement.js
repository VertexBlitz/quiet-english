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
