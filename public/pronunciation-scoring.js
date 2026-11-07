const normalizeToken = value => value
  .toLocaleLowerCase('en-US')
  .replace(/[’‘]/gu, "'")
  .replace(/^[^a-z0-9']+|[^a-z0-9']+$/giu, '');

export function tokenizeSpeech(text) {
  return String(text || '')
    .match(/[a-z0-9]+(?:'[a-z0-9]+)*/giu)?.map(normalizeToken).filter(Boolean) || [];
}

export function compareTranscript(referenceText, recognizedText) {
  const reference = tokenizeSpeech(referenceText);
  const recognized = tokenizeSpeech(recognizedText);
  if (!reference.length) throw new Error('Reference text must contain at least one word.');

  const rows = reference.length + 1;
  const columns = recognized.length + 1;
  const costs = Array.from({ length: rows }, () => new Uint16Array(columns));

  for (let i = 0; i < rows; i++) costs[i][0] = i;
  for (let j = 0; j < columns; j++) costs[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < columns; j++) {
      const substitutionCost = reference[i - 1] === recognized[j - 1] ? 0 : 1;
      costs[i][j] = Math.min(
        costs[i - 1][j] + 1,
        costs[i][j - 1] + 1,
        costs[i - 1][j - 1] + substitutionCost
      );
    }
  }

  const aligned = [];
  let i = reference.length;
  let j = recognized.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && reference[i - 1] === recognized[j - 1] &&
        costs[i][j] === costs[i - 1][j - 1]) {
      aligned.push({ reference: reference[i - 1], recognized: recognized[j - 1], status: 'match' });
      i--; j--;
    } else if (i > 0 && j > 0 && costs[i][j] === costs[i - 1][j - 1] + 1) {
      aligned.push({ reference: reference[i - 1], recognized: recognized[j - 1], status: 'different' });
      i--; j--;
    } else if (i > 0 && costs[i][j] === costs[i - 1][j] + 1) {
      aligned.push({ reference: reference[i - 1], recognized: '', status: 'missing' });
      i--;
    } else {
      aligned.push({ reference: '', recognized: recognized[j - 1], status: 'extra' });
      j--;
    }
  }

  aligned.reverse();
  const matched = aligned.filter(item => item.status === 'match').length;
  const missing = aligned.filter(item => item.status === 'missing').length;
  const different = aligned.filter(item => item.status === 'different').length;
  const extra = aligned.filter(item => item.status === 'extra').length;

  return {
    referenceWords: reference.length,
    recognizedWords: recognized.length,
    matched,
    missing,
    different,
    extra,
    wordMatchPercent: Math.round((matched / reference.length) * 100),
    words: aligned
  };
}
