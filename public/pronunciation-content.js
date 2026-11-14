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
    {id:'es-c2-language',level:'C2',topic:'Language',title:'Precisión y contexto',text:'La precisión lingüística no consiste en eliminar cualquier ambigüedad, sino en reconocer cuándo resulta significativa. Una formulación matizada permite delimitar el alcance de una afirmación sin ocultar las incertidumbres que todavía la acompañan.'},
    {"id":"es-a1-neighbourhood","level":"A1","topic":"Around town","title":"Un paseo por el barrio","text":"Los sábados camino por mi barrio. Primero compro fruta en el mercado. Después tomo un café con una amiga y volvemos a casa antes de comer."},
    {"id":"es-a2-excursion","level":"A2","topic":"Travel","title":"Preparar una excursión","text":"Mañana vamos a visitar un pueblo cerca de la montaña. Hemos preparado bocadillos y agua, y saldremos temprano para aprovechar el día. Si hace buen tiempo, haremos una ruta corta."},
    {"id":"es-b1-reading-club","level":"B1","topic":"Culture","title":"Un club de lectura","text":"La biblioteca ha creado un club de lectura para personas que quieren compartir sus opiniones sobre novelas actuales. Cada mes se elige un libro diferente y una persona voluntaria prepara algunas preguntas para iniciar la conversación."},
    {"id":"es-b2-remote-team","level":"B2","topic":"Work and study","title":"Coordinar un equipo a distancia","text":"Trabajar a distancia ofrece flexibilidad, pero exige acuerdos claros sobre los horarios y las responsabilidades. El equipo ha decidido reservar una reunión breve los lunes y documentar las decisiones para evitar malentendidos durante la semana."},
    {"id":"es-c1-urban-planning","level":"C1","topic":"Cities","title":"Planificar espacios públicos","text":"La calidad de un espacio público no depende exclusivamente de su diseño arquitectónico. También intervienen la accesibilidad, la diversidad de usos y la posibilidad de que distintos grupos lo incorporen a sus rutinas. Una evaluación rigurosa debe observar cómo se utiliza el lugar con el paso del tiempo."},
    {"id":"es-c2-evidence","level":"C2","topic":"Research","title":"El alcance de la evidencia","text":"Una conclusión metodológicamente prudente no renuncia a formular afirmaciones, sino que delimita con precisión el alcance que los datos permiten sostener. La solidez de un argumento se aprecia tanto en lo que demuestra como en su capacidad para reconocer aquello que permanece incierto."},
  ],
  fr: [
    {id:'fr-a1-day',level:'A1',topic:'Everyday life',title:'Une journée simple',text:'Je m’appelle Léa et j’habite à Lyon. Je me lève à sept heures, je prends le petit déjeuner et je vais en cours en bus. Le soir, je lis un livre.'},
    {id:'fr-a2-weekend',level:'A2',topic:'Free time',title:'Le week-end',text:'Samedi dernier, je suis allée au marché avec mon frère. Nous avons acheté des fruits, parlé avec une voisine et déjeuné dans un petit café. Ensuite, nous sommes rentrés à la maison.'},
    {id:'fr-b1-city',level:'B1',topic:'Cities',title:'Un nouveau lieu',text:'Une bibliothèque a ouvert près de chez moi. Elle propose des ateliers gratuits et un espace calme pour travailler. Les habitants espèrent que ce service encouragera davantage de personnes à lire.'},
    {id:'fr-b2-work',level:'B2',topic:'Work',title:'Le travail flexible',text:'Le travail flexible peut faciliter l’organisation du temps, à condition que les responsabilités soient clairement définies. Les équipes doivent également préserver des moments d’échange afin d’éviter les malentendus.'},
    {id:'fr-c1-evidence',level:'C1',topic:'Research',title:'Interpréter les données',text:'Les données ne parlent pas d’elles-mêmes : leur interprétation dépend des questions posées, de la méthode retenue et des limites de l’échantillon. Une analyse rigoureuse distingue donc les observations des hypothèses explicatives.'},
    {id:'fr-c2-language',level:'C2',topic:'Language',title:'Précision et contexte',text:'La précision linguistique ne consiste pas à bannir toute ambiguïté, mais à reconnaître les cas où celle-ci est porteuse de sens. Une formulation nuancée délimite la portée d’une affirmation sans masquer les incertitudes qui subsistent.'},
    {"id":"fr-a1-market","level":"A1","topic":"Everyday life","title":"Au marché","text":"Le samedi matin, je vais au marché avec mon père. Nous achetons des pommes, du pain et du fromage. Ensuite, nous rentrons à la maison en bus."},
    {"id":"fr-a2-countryside","level":"A2","topic":"Free time","title":"Un week-end à la campagne","text":"Le week-end dernier, nous avons passé deux jours à la campagne. Nous avons marché près de la rivière et visité un petit village. Le dimanche, nous avons préparé le déjeuner avant de rentrer."},
    {"id":"fr-b1-volunteers","level":"B1","topic":"Society","title":"Une équipe de bénévoles","text":"Chaque mois, des bénévoles organisent une collecte de livres pour les écoles du quartier. Les habitants peuvent apporter des ouvrages en bon état. Une partie des livres est ensuite distribuée aux classes qui en ont besoin."},
    {"id":"fr-b2-cycling","level":"B2","topic":"Cities","title":"Se déplacer à vélo","text":"La municipalité souhaite développer les déplacements à vélo, mais elle reconnaît que les infrastructures doivent être cohérentes. Des pistes isolées ne suffisent pas : les trajets doivent rester continus et les intersections doivent être aménagées avec soin."},
    {"id":"fr-c1-public-data","level":"C1","topic":"Research","title":"Comprendre les données publiques","text":"La mise à disposition de données publiques ne garantit pas, à elle seule, leur appropriation par les citoyens. Il faut également expliquer les méthodes de collecte, préciser les limites des séries statistiques et proposer des formats permettant de comparer les résultats sans en déformer le sens."},
    {"id":"fr-c2-language-choice","level":"C2","topic":"Language","title":"Les choix de formulation","text":"Une formulation ne se contente pas de transmettre une information déjà constituée : elle hiérarchise les faits, rend certaines relations plus saillantes et en laisse d'autres à l'arrière-plan. L'analyse du discours exige donc d'examiner les choix linguistiques autant que les propositions explicitement avancées."},
  ],
  it: [
    {id:'it-a1-day',level:'A1',topic:'Everyday life',title:'Una giornata semplice',text:'Mi chiamo Anna e vivo a Torino. Mi alzo alle sette, faccio colazione e vado a scuola in autobus. La sera leggo un libro.'},
    {id:'it-a2-weekend',level:'A2',topic:'Free time',title:'Il fine settimana',text:'Sabato scorso sono andato al mercato con mia sorella. Abbiamo comprato della frutta, incontrato un amico e pranzato in un piccolo bar. Nel pomeriggio siamo tornati a casa.'},
    {id:'it-b1-city',level:'B1',topic:'Cities',title:'Un nuovo spazio',text:'Nel mio quartiere ha aperto una biblioteca moderna. Offre laboratori gratuiti e un ambiente tranquillo per studiare. Molti residenti sperano che l’iniziativa coinvolga anche i più giovani.'},
    {id:'it-b2-work',level:'B2',topic:'Work',title:'Lavorare con flessibilità',text:'Il lavoro flessibile può migliorare la gestione del tempo, purché gli obiettivi siano condivisi e le responsabilità definite. Senza accordi chiari, tuttavia, la collaborazione rischia di diventare meno efficace.'},
    {id:'it-c1-evidence',level:'C1',topic:'Research',title:'Leggere i dati',text:'I dati non si interpretano da soli: il loro significato dipende dalle domande iniziali, dal metodo adottato e dai limiti del campione. Un’analisi rigorosa deve distinguere i risultati osservati dalle ipotesi che li spiegano.'},
    {id:'it-c2-language',level:'C2',topic:'Language',title:'Precisione e contesto',text:'La precisione linguistica non coincide con l’eliminazione di ogni ambiguità; consiste piuttosto nel riconoscere quando essa contribuisce al significato. Una formulazione sfumata delimita la portata di un’affermazione senza occultarne le incertezze.'},
    {"id":"it-a1-market","level":"A1","topic":"Everyday life","title":"Al mercato","text":"Il sabato mattina vado al mercato con mia madre. Compriamo mele, pane e formaggio. Poi torniamo a casa in autobus e prepariamo il pranzo."},
    {"id":"it-a2-trip","level":"A2","topic":"Travel","title":"Una gita in treno","text":"Domenica scorsa siamo andati in una città vicina in treno. Abbiamo visitato il centro storico, mangiato in una trattoria e fatto molte fotografie. Siamo tornati a casa nel tardo pomeriggio."},
    {"id":"it-b1-library","level":"B1","topic":"Education","title":"La biblioteca di quartiere","text":"La biblioteca del quartiere ha organizzato un ciclo di incontri gratuiti per chi vuole migliorare le proprie competenze digitali. I partecipanti imparano a cercare informazioni affidabili e a riconoscere le fonti poco attendibili."},
    {"id":"it-b2-public-transport","level":"B2","topic":"Cities","title":"Ripensare il trasporto pubblico","text":"Il comune sta valutando una modifica delle linee degli autobus. L'obiettivo è collegare meglio le zone residenziali con i principali servizi, senza aumentare eccessivamente i tempi di percorrenza. Prima di decidere, verranno analizzati i dati raccolti durante una fase di prova."},
    {"id":"it-c1-cultural-project","level":"C1","topic":"Culture","title":"Un progetto culturale condiviso","text":"Il progetto ha coinvolto associazioni, scuole e istituzioni locali nella definizione del programma culturale. La collaborazione ha ampliato il pubblico, ma ha anche richiesto un lavoro costante di coordinamento e una chiara distribuzione delle responsabilità."},
    {"id":"it-c2-evaluation","level":"C2","topic":"Research","title":"Valutare senza semplificare","text":"Una valutazione convincente deve evitare di confondere la facilità di misurazione con la rilevanza di ciò che viene misurato. Gli indicatori quantitativi sono indispensabili in molti contesti, ma acquistano significato soltanto se interpretati alla luce delle finalità e delle condizioni in cui sono stati elaborati."},
  ],
  pt: [
    {id:'pt-a1-day',level:'A1',topic:'Everyday life',title:'Um dia simples',text:'Chamo-me Inês e vivo em Lisboa. Levanto-me às sete, tomo o pequeno-almoço e vou para a escola de autocarro. À noite, leio um livro.'},
    {id:'pt-a2-weekend',level:'A2',topic:'Free time',title:'O fim de semana',text:'No sábado passado fui ao mercado com a minha irmã. Comprámos fruta, encontrámos um amigo e almoçámos num café pequeno. À tarde voltámos para casa.'},
    {id:'pt-b1-city',level:'B1',topic:'Cities',title:'Um espaço novo',text:'Abriu uma biblioteca nova no meu bairro. Oferece oficinas gratuitas e um espaço calmo para estudar. Os moradores esperam que o projeto atraia pessoas de diferentes idades.'},
    {id:'pt-b2-work',level:'B2',topic:'Work',title:'Trabalho flexível',text:'O trabalho flexível pode facilitar a organização do tempo, desde que os objetivos sejam claros e as responsabilidades estejam bem distribuídas. Sem acordos, porém, a colaboração pode tornar-se menos eficaz.'},
    {id:'pt-c1-evidence',level:'C1',topic:'Research',title:'Interpretar os dados',text:'Os dados não falam por si: a sua interpretação depende das perguntas colocadas, do método utilizado e dos limites da amostra. Uma análise rigorosa distingue os resultados observados das hipóteses explicativas.'},
    {id:'pt-c2-language',level:'C2',topic:'Language',title:'Precisão e contexto',text:'A precisão linguística não consiste em eliminar toda a ambiguidade, mas em reconhecer quando ela é significativa. Uma formulação matizada delimita o alcance de uma afirmação sem ocultar as incertezas que ainda a acompanham.'},
    {"id":"pt-a1-market","level":"A1","topic":"Everyday life","title":"No mercado","text":"Ao sábado de manhã vou ao mercado com a minha mãe. Compramos maçãs, pão e queijo. Depois voltamos para casa de autocarro e preparamos o almoço."},
    {"id":"pt-a2-trip","level":"A2","topic":"Travel","title":"Uma viagem de comboio","text":"No domingo passado fomos de comboio a uma cidade próxima. Visitámos o centro histórico, almoçámos num restaurante pequeno e tirámos fotografias. Voltámos a casa ao fim da tarde."},
    {"id":"pt-b1-library","level":"B1","topic":"Education","title":"A biblioteca do bairro","text":"A biblioteca do bairro começou a organizar sessões gratuitas para ajudar os moradores a utilizar melhor os serviços digitais. Os participantes aprendem a procurar informação e a reconhecer páginas que não apresentam fontes fiáveis."},
    {"id":"pt-b2-public-transport","level":"B2","topic":"Cities","title":"Melhorar os transportes públicos","text":"A autarquia está a estudar alterações nos percursos dos autocarros. Pretende ligar melhor as zonas residenciais aos serviços essenciais, sem aumentar demasiado o tempo das viagens. Antes de tomar uma decisão, vai analisar os resultados de um projeto-piloto."},
    {"id":"pt-c1-cultural-project","level":"C1","topic":"Culture","title":"Um projeto cultural participado","text":"O programa cultural foi desenvolvido em conjunto com associações, escolas e instituições locais. A participação alargou o público, mas também tornou necessário coordenar calendários, clarificar responsabilidades e conciliar expectativas diferentes."},
    {"id":"pt-c2-evaluation","level":"C2","topic":"Research","title":"Avaliar com rigor","text":"Uma avaliação rigorosa não deve confundir aquilo que é fácil de quantificar com aquilo que é efetivamente relevante. Os indicadores numéricos são úteis, mas só adquirem significado quando interpretados à luz dos objetivos, das condições de recolha e dos limites do método."},
  ],
  pl: [
    {id:'pl-a1-day',level:'A1',topic:'Everyday life',title:'Zwykły dzień',text:'Mam na imię Anna i mieszkam w Krakowie. Wstaję o siódmej, jem śniadanie i jadę do szkoły autobusem. Wieczorem czytam książkę.'},
    {id:'pl-a2-weekend',level:'A2',topic:'Free time',title:'Weekend',text:'W zeszłą sobotę poszłam na targ z bratem. Kupiliśmy owoce, spotkaliśmy znajomą i zjedliśmy obiad w małej kawiarni. Po południu wróciliśmy do domu.'},
    {id:'pl-b1-city',level:'B1',topic:'Cities',title:'Nowe miejsce',text:'W mojej dzielnicy otwarto nową bibliotekę. Można tam uczestniczyć w bezpłatnych warsztatach i spokojnie się uczyć. Mieszkańcy mają nadzieję, że projekt będzie rozwijany.'},
    {id:'pl-b2-work',level:'B2',topic:'Work',title:'Elastyczna praca',text:'Elastyczny sposób pracy może ułatwić organizację czasu, pod warunkiem że cele i obowiązki są jasno określone. Bez wspólnych ustaleń współpraca może jednak stać się mniej skuteczna.'},
    {id:'pl-c1-evidence',level:'C1',topic:'Research',title:'Interpretacja danych',text:'Dane nie interpretują się same: ich znaczenie zależy od postawionych pytań, zastosowanej metody i ograniczeń próby. Rzetelna analiza powinna odróżniać zaobserwowane wyniki od hipotez, które próbują je wyjaśnić.'},
    {id:'pl-c2-language',level:'C2',topic:'Language',title:'Precyzja i kontekst',text:'Precyzja językowa nie polega na bezwzględnym usuwaniu wieloznaczności, lecz na rozpoznaniu, kiedy wnosi ona istotną treść. Starannie sformułowana wypowiedź określa zakres twierdzenia, nie ukrywając towarzyszących mu niepewności.'},
    {"id":"pl-a1-market","level":"A1","topic":"Everyday life","title":"Na targu","text":"W sobotę rano idę na targ z mamą. Kupujemy jabłka, chleb i ser. Potem wracamy do domu autobusem i przygotowujemy obiad."},
    {"id":"pl-a2-trip","level":"A2","topic":"Travel","title":"Wycieczka pociągiem","text":"W zeszłą niedzielę pojechaliśmy pociągiem do pobliskiego miasta. Zwiedziliśmy stare centrum, zjedliśmy obiad w małej restauracji i zrobiliśmy dużo zdjęć. Wróciliśmy późnym popołudniem."},
    {"id":"pl-b1-library","level":"B1","topic":"Education","title":"Nowe zajęcia w bibliotece","text":"Biblioteka osiedlowa rozpoczęła bezpłatne spotkania dla osób, które chcą lepiej korzystać z usług internetowych. Uczestnicy uczą się wyszukiwać informacje i sprawdzać, czy strony internetowe podają wiarygodne źródła."},
    {"id":"pl-b2-public-transport","level":"B2","topic":"Cities","title":"Zmiany w komunikacji miejskiej","text":"Miasto rozważa zmianę kilku tras autobusowych. Celem jest lepsze połączenie osiedli z najważniejszymi usługami, ale bez znacznego wydłużenia podróży. Przed podjęciem decyzji urzędnicy przeanalizują wyniki pilotażowego rozwiązania."},
    {"id":"pl-c1-cultural-project","level":"C1","topic":"Culture","title":"Wspólny projekt kulturalny","text":"Program kulturalny powstał we współpracy stowarzyszeń, szkół i instytucji publicznych. Dzięki temu dotarł do szerszej publiczności, lecz wymagał również uzgodnienia harmonogramów, podziału obowiązków i pogodzenia odmiennych oczekiwań."},
    {"id":"pl-c2-evaluation","level":"C2","topic":"Research","title":"Granice pomiaru","text":"Rzetelna ocena nie powinna utożsamiać łatwości pomiaru z istotnością badanego zjawiska. Wskaźniki ilościowe bywają niezbędne, ale ich interpretacja wymaga uwzględnienia celów, warunków zbierania danych oraz ograniczeń przyjętej metody."},
  ],
  ja: [
    {id:'ja-a1-day',level:'A1',topic:'Everyday life',title:'わたしの一日',text:'わたしは学生です。毎朝七時に起きて、朝ごはんを食べます。八時にバスで学校へ行きます。夜は本を読みます。'},
    {id:'ja-a2-weekend',level:'A2',topic:'Free time',title:'週末の買い物',text:'先週の土曜日、姉と市場へ行きました。果物を買って、友だちに会いました。そのあと、小さな喫茶店で昼ごはんを食べて、家に帰りました。'},
    {id:'ja-b1-city',level:'B1',topic:'Cities',title:'新しい図書館',text:'近所に新しい図書館ができました。無料の講座があり、静かな場所で勉強することもできます。地域の人たちは、この施設を通じて交流が広がることを期待しています。'},
    {id:'ja-b2-work',level:'B2',topic:'Work',title:'柔軟な働き方',text:'柔軟な働き方は時間の使い方を改善する可能性があります。ただし、目標や役割が明確でなければ、連携が難しくなるおそれもあります。定期的に情報を共有することが重要です。'},
    {id:'ja-c1-evidence',level:'C1',topic:'Research',title:'データの読み方',text:'データはそれ自体で意味を語るわけではありません。解釈は、どのような問いを立てたか、どの方法を採用したか、標本にどのような限界があるかによって変わります。'},
    {id:'ja-c2-language',level:'C2',topic:'Language',title:'表現の精度',text:'言語表現の精度とは、あらゆる曖昧さを排除することではありません。むしろ、曖昧さが意味を担う場面を見極め、主張の射程と残された不確実性を明確に示す能力にあります。'},
    {"id":"ja-a1-market","level":"A1","topic":"Everyday life","title":"市場へ行きます","text":"土曜日の朝、母と市場へ行きます。りんごとパンを買います。そのあと、バスで家に帰って、昼ごはんを作ります。"},
    {"id":"ja-a2-trip","level":"A2","topic":"Travel","title":"電車で小旅行","text":"先週の日曜日、電車で近くの町へ行きました。古い町を歩いて、小さなレストランで昼ごはんを食べました。夕方、電車で家に帰りました。"},
    {"id":"ja-b1-library","level":"B1","topic":"Education","title":"図書館の新しい活動","text":"地域の図書館では、インターネットの情報を上手に利用するための無料講座が始まりました。参加者は情報の探し方だけでなく、情報の出どころを確認する方法も学んでいます。"},
    {"id":"ja-b2-transport","level":"B2","topic":"Cities","title":"公共交通の見直し","text":"市はバス路線の一部を見直すことを検討しています。住宅地と病院や大学を結びやすくする一方で、移動時間が長くならないようにする必要があります。試験運行の結果を分析してから、正式な計画を決める予定です。"},
    {"id":"ja-c1-cultural-project","level":"C1","topic":"Culture","title":"地域文化の取り組み","text":"この文化事業は、学校、地域団体、公共機関が協力して企画しました。参加者の幅は広がりましたが、日程の調整や役割分担には継続的な協議が必要でした。"},
    {"id":"ja-c2-evaluation","level":"C2","topic":"Research","title":"評価指標の限界","text":"評価の妥当性は、測定可能な項目をどれだけ集めたかだけでは判断できません。数値は比較に役立ちますが、何を目的として設定され、どのような条件で得られたのかを踏まえて解釈する必要があります。"},
  ]
};
