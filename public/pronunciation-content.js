export const PASSAGES = [
  { id: 'a1-morning', level: 'A1', topic: 'Everyday life', text: 'I get up at seven. I have breakfast with my family and walk to school. My first lesson starts at nine.' },
  { id: 'a1-cafe', level: 'A1', topic: 'Food', text: 'I would like a cheese sandwich and a glass of water, please. Can I sit near the window?' },
  { id: 'a1-weekend', level: 'A1', topic: 'Free time', text: 'On Saturday, I play football with my friends. In the evening, we watch a film and eat pizza.' },
  { id: 'a2-city', level: 'A2', topic: 'Around town', text: 'There is a small bookshop next to the station. I often go there after school because the owner recommends interesting stories.' },
  { id: 'a2-travel', level: 'A2', topic: 'Travel', text: 'Last summer, we stayed in a quiet village near the sea. Every morning, we went swimming before visiting the local market.' },
  { id: 'a2-hobbies', level: 'A2', topic: 'Hobbies', text: 'Learning to play the guitar takes patience. I practise for twenty minutes each day, and I can already play three simple songs.' },
  { id: 'b1-learning', level: 'B1', topic: 'Education', text: 'Studying a language becomes easier when you use it regularly. Short conversations, reading and listening to podcasts can all help you build confidence.' },
  { id: 'b1-environment', level: 'B1', topic: 'Environment', text: 'Many people want to protect the environment, but small daily choices also matter. Using public transport and avoiding unnecessary packaging can reduce waste.' },
  { id: 'b1-technology', level: 'B1', topic: 'Technology', text: 'Although smartphones make communication faster, they can distract us from the people around us. It is useful to take breaks from notifications.' },
  { id: 'b2-remote', level: 'B2', topic: 'Work and study', text: 'Working remotely offers flexibility, yet it also requires clear routines. Without regular breaks and realistic priorities, people may find it difficult to separate work from personal time.' },
  { id: 'b2-culture', level: 'B2', topic: 'Culture', text: 'Museums can make history accessible by connecting objects with the lives of ordinary people. A thoughtful exhibition encourages visitors to question familiar assumptions.' },
  { id: 'b2-transport', level: 'B2', topic: 'Cities', text: 'A reliable public transport system can improve urban life in several ways. It gives residents more choices, reduces congestion and makes essential services easier to reach.' },
  { id: 'c1-libraries', level: 'C1', topic: 'Society', text: 'Public libraries remain valuable not simply because they lend books, but because they provide shared spaces where knowledge, discussion and community life can develop.' },
  { id: 'c1-media', level: 'C1', topic: 'Media literacy', text: 'The abundance of online information has made critical reading more important than ever. Rather than accepting a confident claim at face value, readers should examine its evidence and context.' },
  { id: 'c1-innovation', level: 'C1', topic: 'Innovation', text: 'Technological progress is often presented as inevitable, although its effects depend on social priorities. Meaningful innovation should be judged by whom it benefits and which problems it actually solves.' }
];

export function getReviewWords(words) {
  const seen = new Set();
  return (Array.isArray(words) ? words : [])
    .filter(item => item && (item.status === 'missing' || item.status === 'different'))
    .map(item => String(item.reference || '').trim())
    .filter(word => {
      const key = word.toLocaleLowerCase('en-US');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function buildProgressSeries(attempts) {
  return (Array.isArray(attempts) ? attempts : [])
    .map((attempt, index) => {
      const score = Number(attempt?.word_match_score);
      const parsedDate = Date.parse(attempt?.created_at || '');
      return {
        score,
        timestamp: Number.isFinite(parsedDate) ? parsedDate : index,
        createdAt: attempt?.created_at || ''
      };
    })
    .filter(point => Number.isFinite(point.score) && point.score >= 0 && point.score <= 100)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-8)
    .map((point, index, points) => {
      const date = new Date(point.timestamp);
      const dateLabel = Number.isFinite(date.getTime())
        ? String(date.getDate()).padStart(2, '0') + '.' + String(date.getMonth() + 1).padStart(2, '0')
        : String(index + 1);
      return { score: Math.round(point.score), dateLabel, attempt: index + 1, total: points.length };
    });
}
