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


export const GERMAN_PASSAGES = [
  { id: 'de-a1-morning', level: 'A1', topic: 'Everyday life', title: 'Mein Morgen', text: 'Ich stehe um sieben Uhr auf. Dann frühstücke ich mit meiner Familie. Um acht Uhr gehe ich zur Schule. Am Nachmittag mache ich meine Hausaufgaben und höre Musik.' },
  { id: 'de-a1-cafe', level: 'A1', topic: 'Food', title: 'Im Café', text: 'Guten Tag! Ich möchte einen Tee und ein Käsebrot, bitte. Haben Sie auch Wasser? Ja, natürlich. Das macht zusammen sechs Euro.' },
  { id: 'de-a1-family', level: 'A1', topic: 'Everyday life', title: 'Meine Familie', text: 'Meine Familie ist nicht sehr groß. Ich habe eine Schwester und einen Bruder. Wir wohnen zusammen in einer kleinen Wohnung. Am Sonntag besuchen wir oft unsere Großeltern.' },
  { id: 'de-a1-city', level: 'A1', topic: 'Around town', title: 'In meiner Stadt', text: 'In meiner Stadt gibt es einen Bahnhof, einen Park und viele Geschäfte. Der Supermarkt ist neben der Apotheke. Am Wochenende gehe ich gern mit Freunden ins Zentrum.' },
  { id: 'de-a1-hobby', level: 'A1', topic: 'Free time', title: 'Meine Freizeit', text: 'In meiner Freizeit spiele ich gern Gitarre. Zweimal pro Woche treffe ich meine Freunde. Wir gehen spazieren oder sehen zusammen einen Film. Das macht mir viel Spaß.' },
  { id: 'de-a2-travel', level: 'A2', topic: 'Travel', title: 'Ein Wochenende in Hamburg', text: 'Letztes Wochenende bin ich mit dem Zug nach Hamburg gefahren. Das Wetter war sonnig, deshalb habe ich einen langen Spaziergang am Hafen gemacht. Danach habe ich ein kleines Museum besucht und in einem Café zu Mittag gegessen.' },
  { id: 'de-a2-learning', level: 'A2', topic: 'Education', title: 'Deutsch lernen', text: 'Ich lerne seit einem Jahr Deutsch. Jeden Tag wiederhole ich neue Wörter und lese kurze Texte. Am Anfang war die Grammatik schwierig, aber regelmäßiges Üben hilft mir. Jetzt kann ich schon einfache Gespräche führen.' },
  { id: 'de-a2-health', level: 'A2', topic: 'Everyday life', title: 'Ein guter Tagesablauf', text: 'Ein guter Tagesablauf hilft mir, ruhig und konzentriert zu bleiben. Morgens frühstücke ich und plane meine Aufgaben. Nach der Arbeit oder der Schule mache ich eine Pause. Am Abend gehe ich manchmal spazieren.' },
  { id: 'de-a2-environment', level: 'A2', topic: 'Environment', title: 'Umweltfreundlich leben', text: 'Viele Menschen möchten umweltfreundlicher leben. Sie fahren öfter mit dem Fahrrad oder benutzen öffentliche Verkehrsmittel. Zu Hause sparen sie Wasser und trennen den Müll. Auch kleine Veränderungen können im Alltag helfen.' },
  { id: 'de-a2-plans', level: 'A2', topic: 'Education', title: 'Pläne für die Zukunft', text: 'Nächstes Jahr möchte ich eine neue Sprache lernen und mehr reisen. Dafür spare ich jeden Monat etwas Geld. Wenn ich genug Zeit habe, besuche ich auch einen Sprachkurs. Ich freue mich auf neue Erfahrungen.' },
  { id: 'de-b1-community', level: 'B1', topic: 'Society', title: 'Ein gemeinsames Projekt', text: 'In unserem Viertel haben mehrere Nachbarn einen kleinen Gemeinschaftsgarten angelegt. Jede Person übernimmt eine Aufgabe. Dadurch lernen sich Menschen kennen, die sich vorher kaum begegnet sind.' },
  { id: 'de-b1-education', level: 'B1', topic: 'Education', title: 'Lernen mit Plan', text: 'Wer regelmäßig lernt, sollte kurze Wiederholungen fest einplanen. So bleiben neue Wörter länger im Gedächtnis, und schwierige Themen lassen sich Schritt für Schritt verstehen.' },
  { id: 'de-b2-remote-work', level: 'B2', topic: 'Work and study', title: 'Zusammenarbeit auf Distanz', text: 'Mobiles Arbeiten bietet Flexibilität, verlangt aber klare Absprachen. Wenn Zuständigkeiten transparent sind und Entscheidungen dokumentiert werden, lassen sich Missverständnisse deutlich reduzieren.' },
  { id: 'de-b2-urban-life', level: 'B2', topic: 'Cities', title: 'Lebenswerte Städte', text: 'Eine lebenswerte Stadt entsteht nicht allein durch moderne Gebäude. Entscheidend sind erreichbare öffentliche Einrichtungen, zuverlässige Verkehrsmittel und Räume, in denen Menschen einander begegnen können.' },
  { id: 'de-c1-open-data', level: 'C1', topic: 'Research', title: 'Daten und Transparenz', text: 'Öffentliche Datensätze schaffen erst dann nachvollziehbare Transparenz, wenn ihre Herkunft, ihre methodischen Grenzen und mögliche Unsicherheiten verständlich dokumentiert werden.' },
  { id: 'de-c1-language', level: 'C1', topic: 'Language', title: 'Sprache und Perspektive', text: 'Begriffe beschreiben Wirklichkeit nicht bloß neutral. Sie lenken Aufmerksamkeit auf bestimmte Merkmale und können dadurch beeinflussen, welche Aspekte einer Debatte sichtbar werden.' },
  { id: 'de-c2-precision', level: 'C2', topic: 'Language', title: 'Präzision und Differenzierung', text: 'Sprachliche Präzision besteht nicht darin, Mehrdeutigkeit um jeden Preis auszuschließen. Sie zeigt sich vielmehr darin, Unterschiede nachvollziehbar zu begründen und die Reichweite einer Aussage kenntlich zu machen.' },
  { id: 'de-c2-public-discourse', level: 'C2', topic: 'Society', title: 'Öffentlicher Diskurs', text: 'Eine sachliche Kontroverse setzt voraus, dass Beteiligte nicht nur Gegenargumente registrieren, sondern deren Tragweite ernsthaft prüfen. Erst daraus kann eine differenzierte Neubewertung entstehen.' }
];

// Original multilingual passages used by the on-device pronunciation trainer.
export const LANGUAGE_PASSAGES = {
  es: [
    {id:'es-a1-day',level:'A1',topic:'Everyday life',title:'Un día sencillo',text:'Me llamo Elena y vivo en Valencia. Me levanto a las siete, desayuno en casa y voy a clase en autobús. Por la tarde leo un libro.'},
    {id:'es-a2-weekend',level:'A2',topic:'Free time',title:'Un fin de semana',text:'El sábado pasado fui al mercado con mi hermana. Compramos fruta, hablamos con una amiga y después comimos en una pequeña cafetería. Por la tarde volvimos a casa.'},
    {id:'es-b1-city',level:'B1',topic:'Cities',title:'Cambiar la ciudad',text:'En mi barrio han abierto una biblioteca nueva. Muchas personas la visitan porque ofrece talleres gratuitos y un lugar tranquilo para estudiar. Los vecinos esperan que el proyecto continúe.'},
    {id:'es-b2-work',level:'B2',topic:'Work',title:'Trabajar con flexibilidad',text:'El trabajo flexible puede mejorar la organización del tiempo, aunque también exige acuerdos claros. Cuando los equipos comparten objetivos y responsabilidades, resulta más fácil colaborar sin depender de un único espacio.'},
    {id:'es-c1-evidence',level:'C1',topic:'Research',title:'Interpretar los datos',text:'Los datos no hablan por sí solos: su interpretación depende de las preguntas formuladas, del método empleado y de los límites de la muestra. Por eso, un análisis riguroso debe distinguir entre resultados observados e hipótesis explicativas.'},
    {id:'es-c2-language',level:'C2',topic:'Language',title:'Precisión y contexto',text:'La precisión lingüística no consiste en eliminar cualquier ambigüedad, sino en reconocer cuándo resulta significativa. Una formulación matizada permite delimitar el alcance de una afirmación sin ocultar las incertidumbres que todavía la acompañan.'}
  ],
  fr: [
    {id:'fr-a1-day',level:'A1',topic:'Everyday life',title:'Une journée simple',text:'Je m’appelle Léa et j’habite à Lyon. Je me lève à sept heures, je prends le petit déjeuner et je vais en cours en bus. Le soir, je lis un livre.'},
    {id:'fr-a2-weekend',level:'A2',topic:'Free time',title:'Le week-end',text:'Samedi dernier, je suis allée au marché avec mon frère. Nous avons acheté des fruits, parlé avec une voisine et déjeuné dans un petit café. Ensuite, nous sommes rentrés à la maison.'},
    {id:'fr-b1-city',level:'B1',topic:'Cities',title:'Un nouveau lieu',text:'Une bibliothèque a ouvert près de chez moi. Elle propose des ateliers gratuits et un espace calme pour travailler. Les habitants espèrent que ce service encouragera davantage de personnes à lire.'},
    {id:'fr-b2-work',level:'B2',topic:'Work',title:'Le travail flexible',text:'Le travail flexible peut faciliter l’organisation du temps, à condition que les responsabilités soient clairement définies. Les équipes doivent également préserver des moments d’échange afin d’éviter les malentendus.'},
    {id:'fr-c1-evidence',level:'C1',topic:'Research',title:'Interpréter les données',text:'Les données ne parlent pas d’elles-mêmes : leur interprétation dépend des questions posées, de la méthode retenue et des limites de l’échantillon. Une analyse rigoureuse distingue donc les observations des hypothèses explicatives.'},
    {id:'fr-c2-language',level:'C2',topic:'Language',title:'Précision et contexte',text:'La précision linguistique ne consiste pas à bannir toute ambiguïté, mais à reconnaître les cas où celle-ci est porteuse de sens. Une formulation nuancée délimite la portée d’une affirmation sans masquer les incertitudes qui subsistent.'}
  ],
  it: [
    {id:'it-a1-day',level:'A1',topic:'Everyday life',title:'Una giornata semplice',text:'Mi chiamo Anna e vivo a Torino. Mi alzo alle sette, faccio colazione e vado a scuola in autobus. La sera leggo un libro.'},
    {id:'it-a2-weekend',level:'A2',topic:'Free time',title:'Il fine settimana',text:'Sabato scorso sono andato al mercato con mia sorella. Abbiamo comprato della frutta, incontrato un amico e pranzato in un piccolo bar. Nel pomeriggio siamo tornati a casa.'},
    {id:'it-b1-city',level:'B1',topic:'Cities',title:'Un nuovo spazio',text:'Nel mio quartiere ha aperto una biblioteca moderna. Offre laboratori gratuiti e un ambiente tranquillo per studiare. Molti residenti sperano che l’iniziativa coinvolga anche i più giovani.'},
    {id:'it-b2-work',level:'B2',topic:'Work',title:'Lavorare con flessibilità',text:'Il lavoro flessibile può migliorare la gestione del tempo, purché gli obiettivi siano condivisi e le responsabilità definite. Senza accordi chiari, tuttavia, la collaborazione rischia di diventare meno efficace.'},
    {id:'it-c1-evidence',level:'C1',topic:'Research',title:'Leggere i dati',text:'I dati non si interpretano da soli: il loro significato dipende dalle domande iniziali, dal metodo adottato e dai limiti del campione. Un’analisi rigorosa deve distinguere i risultati osservati dalle ipotesi che li spiegano.'},
    {id:'it-c2-language',level:'C2',topic:'Language',title:'Precisione e contesto',text:'La precisione linguistica non coincide con l’eliminazione di ogni ambiguità; consiste piuttosto nel riconoscere quando essa contribuisce al significato. Una formulazione sfumata delimita la portata di un’affermazione senza occultarne le incertezze.'}
  ],
  pt: [
    {id:'pt-a1-day',level:'A1',topic:'Everyday life',title:'Um dia simples',text:'Chamo-me Inês e vivo em Lisboa. Levanto-me às sete, tomo o pequeno-almoço e vou para a escola de autocarro. À noite, leio um livro.'},
    {id:'pt-a2-weekend',level:'A2',topic:'Free time',title:'O fim de semana',text:'No sábado passado fui ao mercado com a minha irmã. Comprámos fruta, encontrámos um amigo e almoçámos num café pequeno. À tarde voltámos para casa.'},
    {id:'pt-b1-city',level:'B1',topic:'Cities',title:'Um espaço novo',text:'Abriu uma biblioteca nova no meu bairro. Oferece oficinas gratuitas e um espaço calmo para estudar. Os moradores esperam que o projeto atraia pessoas de diferentes idades.'},
    {id:'pt-b2-work',level:'B2',topic:'Work',title:'Trabalho flexível',text:'O trabalho flexível pode facilitar a organização do tempo, desde que os objetivos sejam claros e as responsabilidades estejam bem distribuídas. Sem acordos, porém, a colaboração pode tornar-se menos eficaz.'},
    {id:'pt-c1-evidence',level:'C1',topic:'Research',title:'Interpretar os dados',text:'Os dados não falam por si: a sua interpretação depende das perguntas colocadas, do método utilizado e dos limites da amostra. Uma análise rigorosa distingue os resultados observados das hipóteses explicativas.'},
    {id:'pt-c2-language',level:'C2',topic:'Language',title:'Precisão e contexto',text:'A precisão linguística não consiste em eliminar toda a ambiguidade, mas em reconhecer quando ela é significativa. Uma formulação matizada delimita o alcance de uma afirmação sem ocultar as incertezas que ainda a acompanham.'}
  ],
  pl: [
    {id:'pl-a1-day',level:'A1',topic:'Everyday life',title:'Zwykły dzień',text:'Mam na imię Anna i mieszkam w Krakowie. Wstaję o siódmej, jem śniadanie i jadę do szkoły autobusem. Wieczorem czytam książkę.'},
    {id:'pl-a2-weekend',level:'A2',topic:'Free time',title:'Weekend',text:'W zeszłą sobotę poszłam na targ z bratem. Kupiliśmy owoce, spotkaliśmy znajomą i zjedliśmy obiad w małej kawiarni. Po południu wróciliśmy do domu.'},
    {id:'pl-b1-city',level:'B1',topic:'Cities',title:'Nowe miejsce',text:'W mojej dzielnicy otwarto nową bibliotekę. Można tam uczestniczyć w bezpłatnych warsztatach i spokojnie się uczyć. Mieszkańcy mają nadzieję, że projekt będzie rozwijany.'},
    {id:'pl-b2-work',level:'B2',topic:'Work',title:'Elastyczna praca',text:'Elastyczny sposób pracy może ułatwić organizację czasu, pod warunkiem że cele i obowiązki są jasno określone. Bez wspólnych ustaleń współpraca może jednak stać się mniej skuteczna.'},
    {id:'pl-c1-evidence',level:'C1',topic:'Research',title:'Interpretacja danych',text:'Dane nie interpretują się same: ich znaczenie zależy od postawionych pytań, zastosowanej metody i ograniczeń próby. Rzetelna analiza powinna odróżniać zaobserwowane wyniki od hipotez, które próbują je wyjaśnić.'},
    {id:'pl-c2-language',level:'C2',topic:'Language',title:'Precyzja i kontekst',text:'Precyzja językowa nie polega na bezwzględnym usuwaniu wieloznaczności, lecz na rozpoznaniu, kiedy wnosi ona istotną treść. Starannie sformułowana wypowiedź określa zakres twierdzenia, nie ukrywając towarzyszących mu niepewności.'}
  ],
  ja: [
    {id:'ja-a1-day',level:'A1',topic:'Everyday life',title:'わたしの一日',text:'わたしは学生です。毎朝七時に起きて、朝ごはんを食べます。八時にバスで学校へ行きます。夜は本を読みます。'},
    {id:'ja-a2-weekend',level:'A2',topic:'Free time',title:'週末の買い物',text:'先週の土曜日、姉と市場へ行きました。果物を買って、友だちに会いました。そのあと、小さな喫茶店で昼ごはんを食べて、家に帰りました。'},
    {id:'ja-b1-city',level:'B1',topic:'Cities',title:'新しい図書館',text:'近所に新しい図書館ができました。無料の講座があり、静かな場所で勉強することもできます。地域の人たちは、この施設を通じて交流が広がることを期待しています。'},
    {id:'ja-b2-work',level:'B2',topic:'Work',title:'柔軟な働き方',text:'柔軟な働き方は時間の使い方を改善する可能性があります。ただし、目標や役割が明確でなければ、連携が難しくなるおそれもあります。定期的に情報を共有することが重要です。'},
    {id:'ja-c1-evidence',level:'C1',topic:'Research',title:'データの読み方',text:'データはそれ自体で意味を語るわけではありません。解釈は、どのような問いを立てたか、どの方法を採用したか、標本にどのような限界があるかによって変わります。'},
    {id:'ja-c2-language',level:'C2',topic:'Language',title:'表現の精度',text:'言語表現の精度とは、あらゆる曖昧さを排除することではありません。むしろ、曖昧さが意味を担う場面を見極め、主張の射程と残された不確実性を明確に示す能力にあります。'}
  ]
};
