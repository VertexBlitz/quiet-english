// Curated starter banks for the six planned study languages.
// The first five items in each CEFR band also form that band's placement questions.
export const COURSE_LANGUAGES = {
  es: { englishName: 'Spanish', nativeName: 'Español', locale: 'es-ES', whisper: 'spanish' },
  fr: { englishName: 'French', nativeName: 'Français', locale: 'fr-FR', whisper: 'french' },
  it: { englishName: 'Italian', nativeName: 'Italiano', locale: 'it-IT', whisper: 'italian' },
  pt: { englishName: 'Portuguese', nativeName: 'Português', locale: 'pt-PT', whisper: 'portuguese' },
  pl: { englishName: 'Polish', nativeName: 'Polski', locale: 'pl-PL', whisper: 'polish' },
  ja: { englishName: 'Japanese', nativeName: '日本語', locale: 'ja-JP', whisper: 'japanese' }
};

const q = (skill, prompt, options, answer, ru, en) => ({ skill, prompt, options, answer, explanationRu: ru, explanationEn: en });

export const COURSE_QUESTION_BANKS = {
  es: {
    A1: [
      q('grammar','Hola, ¿cómo ___ llamas?',['te','se','me'],0,'В вопросе о том, как кого-то зовут, используется возвратная форма te llamas.','The reflexive form te llamas asks someone’s name.'),
      q('grammar','Yo ___ de Madrid.',['soy','eres','es'],0,'С местоимением yo используется форма soy.','Use soy with the subject yo.'),
      q('grammar','¿Dónde ___ Ana?',['vive','vives','vivimos'],0,'С Ana (она) глагол vivir имеет форму vive.','Ana is third-person singular, so use vive.'),
      q('vocabulary','Tengo ___ hermano.',['un','una','unos'],0,'Hermano — существительное мужского рода в единственном числе.','Hermano is a masculine singular noun.'),
      q('grammar','Nosotros ___ estudiantes.',['somos','son','sois'],0,'С nosotros используется форма somos.','Use somos with nosotros.'),
      q('grammar','Me gusta ___ música.',['la','el','los'],0,'Música — существительное женского рода: la música.','Música is feminine: la música.'),
      q('vocabulary','¿Qué día viene después del lunes? — ___.',['Martes','Jueves','Domingo'],0,'После lunes идёт martes.','Martes follows lunes.'),
      q('reading','Lee: «Lucía vive en Sevilla y estudia por la mañana». ¿Dónde vive Lucía?',['En Sevilla','En Valencia','En Bilbao'],0,'В тексте прямо сказано, что Лусия живёт в Севилье.','The text says Lucía lives in Seville.')
    ],
    A2: [
      q('grammar','Ayer ___ al cine con mis amigos.',['fui','iba','iré'],0,'Ayer указывает на завершённое событие в прошлом: fui.','Ayer signals a completed past event: fui.'),
      q('grammar','Este libro es ___ interesante que el otro.',['más','muy','mucho'],0,'Для сравнения используется конструкция más ... que.','Use más ... que to form a comparison.'),
      q('grammar','Cuando ___ en casa, te llamaré.',['esté','estoy','estaré'],0,'После cuando при указании будущего действия употребляется presente de subjuntivo.','A future reference after cuando takes the present subjunctive.'),
      q('grammar','No tengo ___ tiempo hoy.',['mucho','muchos','mucha'],0,'Tiempo — неисчисляемое существительное мужского рода.','Tiempo is an uncountable masculine noun.'),
      q('grammar','Si llueve, ___ en casa.',['me quedaré','me quedaba','me quedaría'],0,'В реальном условии о будущем используется si + presente и futuro.','A likely future condition uses si + present and the future.'),
      q('grammar','¿Puedes decirme dónde ___ la estación?',['está','es','esté'],0,'Для местоположения используется estar.','Use estar to express location.'),
      q('vocabulary','Para viajar en tren necesito comprar un ___.',['billete','tenedor','tejado'],0,'Billete — билет на транспорт.','Billete means a ticket for transport.'),
      q('reading','Lee: «El sábado Marta visitó a su abuela y después prepararon la cena». ¿Qué hicieron después?',['Prepararon la cena','Fueron al museo','Compraron un coche'],0,'После визита они приготовили ужин.','After the visit, they prepared dinner.')
    ],
    B1: [
      q('grammar','Espero que mañana ___ buen tiempo.',['haga','hace','hará'],0,'После espero que выражается желание или ожидание через subjuntivo.','Espero que introduces a wish or expectation and takes the subjunctive.'),
      q('grammar','Si tuviera más tiempo, ___ otro idioma.',['estudiaría','estudiaré','estudiaba'],0,'Нереальное условие: imperfecto de subjuntivo + condicional.','An unreal condition uses the imperfect subjunctive and conditional.'),
      q('grammar','La novela fue ___ por una autora joven.',['escrita','escribiendo','escribe'],0,'В пассивной конструкции согласуется причастие: novela — женский род.','The passive participle agrees with novela, a feminine noun.'),
      q('grammar','No creo que ellos ___ la respuesta.',['sepan','saben','sabrán'],0,'После отрицания мнения no creo que требуется subjuntivo.','A negative opinion with no creo que takes the subjunctive.'),
      q('grammar','Llevo tres años ___ español.',['estudiando','estudié','estudiaré'],0,'Llevar + время + gerundio показывает длительность действия.','Llevar + time + gerund expresses an ongoing duration.'),
      q('vocabulary','Aunque estaba cansada, decidió ___ con el proyecto.',['seguir','huir de','quitar'],0,'Seguir con algo означает продолжать работу над чем-либо.','Seguir con algo means to continue working on it.'),
      q('reading','Lee: «El ayuntamiento amplió los carriles bici para reducir el tráfico». ¿Cuál era el objetivo?',['Reducir el tráfico','Aumentar los aparcamientos','Cerrar las tiendas'],0,'Цель прямо обозначена: сократить движение автомобилей.','The stated aim was to reduce traffic.'),
      q('grammar','Te llamaré en cuanto ___ los resultados.',['reciba','recibo','recibiré'],0,'В придаточном времени с будущим значением используется subjuntivo.','A future time clause takes the subjunctive.')
    ],
    B2: [
      q('grammar','No es que la propuesta ___ imposible; necesita ajustes.',['sea','es','será'],0,'Оборот no es que обычно вводит subjuntivo.','No es que normally introduces the subjunctive.'),
      q('grammar','De haberlo sabido, te ___ antes.',['habría avisado','avisaré','avisaba'],0,'De haberlo sabido — условие нереального прошлого; далее condicional compuesto.','De haberlo sabido expresses an unreal past condition and takes the conditional perfect.'),
      q('grammar','La medida, ___ aplicación comenzó en enero, sigue vigente.',['cuya','que','quien'],0,'Cuyo выражает принадлежность и согласуется с существительным aplicación.','Cuyo expresses possession and agrees with aplicación.'),
      q('grammar','El informe no solo es claro, ___ también resulta convincente.',['sino que','aunque','por si'],0,'Корреляция no solo ... sino que también добавляет второй аргумент.','No solo ... sino que también adds a second point.'),
      q('vocabulary','El portavoz intentó ___ las críticas con datos verificables.',['rebatir','aplazar','heredar'],0,'Rebatir significa опровергать аргументы или критику.','Rebatir means to refute an argument or criticism.'),
      q('grammar','Por mucho que lo ___, no cambiará de opinión.',['expliques','explicas','explicarás'],0,'Por mucho que вводит уступительное придаточное с subjuntivo.','Por mucho que introduces a concessive clause with the subjunctive.'),
      q('reading','Lee: «La reforma se aplazó para recabar opiniones de los sectores afectados». ¿Por qué se aplazó?',['Para recoger opiniones','Por falta de presupuesto','Por un error técnico'],0,'Отсрочка нужна для сбора мнений затронутых групп.','It was postponed to gather the views of affected groups.'),
      q('grammar','Se publicó el estudio después de que los datos ___ revisados.',['fueran','fueron','serán'],0,'После después de que для ещё не завершённого/предшествующего действия в таком контексте используется subjuntivo.','Después de que takes the subjunctive in this non-asserted context.')
    ],
    C1: [
      q('grammar','No cabe duda de que la medida ___ efectos duraderos.',['tendrá','tenga','tuviera'],0,'После утвердительного no cabe duda de que обычно используется indicativo.','An affirmative no cabe duda de que normally takes the indicative.'),
      q('vocabulary','El artículo ofrece una interpretación ___ del conflicto.',['matizada','casual','escasa'],0,'Matizada означает учитывающая оттенки и нюансы.','Matizada means nuanced.'),
      q('grammar','De no ___ medidas, el problema podría agravarse.',['adoptarse','adoptando','adoptó'],0,'De + infinitivo en pasiva выражает условие: если меры не будут приняты.','De + passive infinitive expresses a condition.'),
      q('grammar','La autora cuestiona que se ___ una relación causal directa.',['establezca','establece','establecerá'],0,'Cuestionar que вводит сомнение и требует subjuntivo.','Cuestionar que expresses doubt and takes the subjunctive.'),
      q('vocabulary','El argumento resulta ___ porque omite una variable decisiva.',['endeble','inminente','afable'],0,'Endeble означает слабый, недостаточно обоснованный.','Endeble means weak or poorly supported.'),
      q('grammar','La cuestión no es tanto qué se decidió, ___ cómo se justificó.',['sino','aunque','mientras'],0,'Конструкция no tanto ... sino противопоставляет два аспекта.','No tanto ... sino contrasts two aspects.'),
      q('reading','Lee: «El análisis distingue entre correlación estadística y causalidad». ¿Qué evita esa distinción?',['Confundir asociación con causa','Eliminar todos los datos','Sustituir el análisis por opiniones'],0,'Различение не позволяет считать простую связь доказательством причины.','The distinction avoids treating association as proof of causation.'),
      q('grammar','Por más que se ___ los plazos, no conviene sacrificar la calidad.',['reduzcan','reducen','reducirán'],0,'Por más que с уступительным значением требует subjuntivo.','Por más que in a concessive sense takes the subjunctive.')
    ],
    C2: [
      q('vocabulary','El autor recurre a una ironía apenas ___ para cuestionar la premisa.',['perceptible','perentoria','perenne'],0,'Perceptible означает едва заметный, но различимый.','Perceptible means noticeable or discernible.'),
      q('grammar','La hipótesis, lejos de ___ refutada, ha cobrado fuerza.',['quedar','quedando','quedó'],0,'После lejos de употребляется infinitivo.','Lejos de is followed by the infinitive.'),
      q('vocabulary','Su exposición fue tan ___ que no dejó margen para equívocos.',['diáfana','azarosa','exigua'],0,'Diáfana описывает предельно ясное изложение.','Diáfana describes exceptionally clear expression.'),
      q('grammar','No por ___ más veces una afirmación se convierte en verdadera.',['repetir','repetida','repite'],0,'Конструкция no por + infinitivo выражает отрицание предполагаемой причинности.','No por + infinitive rejects the assumed causal relationship.'),
      q('vocabulary','La crítica no es ___: reconoce los méritos antes de señalar los límites.',['unívoca','hostil','superflua'],0,'Unívoca означает однозначная; здесь подчёркнута сложность оценки.','Unívoca means unambiguous; the sentence describes a more balanced critique.'),
      q('grammar','Sea cual ___ la interpretación, deben explicitarse sus criterios.',['fuere','es','será'],0,'Sea cual fuere — устойчивый формальный оборот со значением «какой бы ни была».','Sea cual fuere is a formal expression meaning “whatever the interpretation”.'),
      q('reading','Lee: «La conclusión es provisional, no por falta de rigor, sino por la naturaleza revisable de la evidencia». ¿Qué implica?',['Que puede revisarse con nuevas pruebas','Que carece de fundamento','Que es definitivamente falsa'],0,'Вывод обоснован, но допускает пересмотр при появлении новых данных.','The conclusion is supported but open to revision when new evidence appears.'),
      q('grammar','La autora no niega el fenómeno; antes bien, ___ delimitar su alcance.',['procura','procure','procuraría'],0,'В утвердительном контексте используется indicativo: procura.','The affirmative statement takes the indicative: procura.')
    ]
  },
  fr: {
    A1: [
      q('grammar','Je ___ étudiant.',['suis','es','est'],0,'С je используется форма suis.','Use suis with je.'),
      q('grammar','Tu ___ à Paris.',['habites','habite','habitent'],0,'С tu у глагола habiter окончание -es.','The verb habiter takes -es with tu.'),
      q('grammar','C’est ___ pomme.',['une','un','des'],0,'Pomme — существительное женского рода.','Pomme is feminine.'),
      q('grammar','Nous ___ français.',['parlons','parlez','parlent'],0,'С nous используется окончание -ons.','Use the -ons form with nous.'),
      q('vocabulary','Quel mot désigne le contraire de «grand» ?',['petit','long','jeune'],0,'Petit — антоним слова grand.','Petit is the opposite of grand.'),
      q('grammar','Je vais ___ école.',['à l’','au','aux'],0,'Перед école (женский род, гласная) используется à l’.','Use à l’ before a feminine noun beginning with a vowel.'),
      q('grammar','Elle ___ un frère.',['a','as','ont'],0,'С elle у avoir используется форма a.','Use a with elle.'),
      q('reading','Lis : «Paul habite à Lyon et travaille dans une école». Où habite Paul ?',['À Lyon','À Lille','À Nice'],0,'В тексте сказано, что Поль живёт в Лионе.','The text says Paul lives in Lyon.')
    ],
    A2: [
      q('grammar','Hier, nous ___ un film.',['avons regardé','regardons','regarderons'],0,'Завершённое действие в прошлом выражается passé composé.','A completed past action uses the passé composé.'),
      q('grammar','Elle est ___ à huit heures.',['partie','parti','partir'],0,'С être причастие согласуется с подлежащим женского рода.','With être, the past participle agrees with the feminine subject.'),
      q('grammar','Il n’y a ___ de pain.',['plus','beaucoup','très'],0,'Ne ... plus выражает прекращение действия или отсутствие чего-либо.','Ne ... plus expresses “no longer” or “no more”.'),
      q('grammar','Ce sac est ___ cher que l’autre.',['moins','le moins','très'],0,'Для сравнительной степени используется moins ... que.','Use moins ... que for a comparative.'),
      q('grammar','Quand tu ___, appelle-moi.',['arrives','arriveras','arriver'],0,'После quand для будущего события во французском обычно используется présent.','French commonly uses the present after quand for a future event.'),
      q('grammar','Je voudrais ___ café, s’il vous plaît.',['un','une','des'],0,'Café — существительное мужского рода.','Café is masculine.'),
      q('vocabulary','Pour acheter un billet, on va à la ___.',['gare','plage','cuisine'],0,'Gare — вокзал.','Gare means railway station.'),
      q('reading','Lis : «Samedi, Léa a visité le musée puis elle a déjeuné avec sa sœur». Qu’a-t-elle fait ensuite ?',['Elle a déjeuné avec sa sœur','Elle est rentrée au travail','Elle a pris le train'],0,'После музея Леа пообедала с сестрой.','After the museum, Léa had lunch with her sister.')
    ],
    B1: [
      q('grammar','Il faut que tu ___ à l’heure.',['sois','es','seras'],0,'После il faut que требуется subjonctif.','Il faut que is followed by the subjunctive.'),
      q('grammar','Si j’avais plus de temps, je ___ davantage.',['voyagerais','voyagerai','voyageais'],0,'Нереальное условие: imparfait + conditionnel présent.','An unreal condition uses imparfait plus the present conditional.'),
      q('grammar','La lettre a été ___ hier.',['envoyée','envoyé','envoyer'],0,'Причастие согласуется с lettre, женский род.','The participle agrees with lettre, a feminine noun.'),
      q('grammar','Je ne pense pas qu’il ___ raison.',['ait','a','aura'],0,'Отрицание мнения ne pas penser que требует subjonctif.','Negative penser que takes the subjunctive.'),
      q('grammar','Elle vient de ___ son examen.',['réussir','réussi','réussit'],0,'Venir de + infinitif обозначает недавнее действие.','Venir de + infinitive expresses the recent past.'),
      q('vocabulary','Cette explication permet de ___ le problème.',['clarifier','détruire','retarder'],0,'Clarifier означает прояснять.','Clarifier means to clarify.'),
      q('reading','Lis : «La mairie a créé une piste cyclable afin de réduire la circulation». Quel est le but ?',['Réduire la circulation','Augmenter les parkings','Fermer les écoles'],0,'Цель проекта — уменьшить автомобильное движение.','The purpose is to reduce traffic.'),
      q('grammar','Je t’appellerai dès que je ___ disponible.',['serai','sois','étais'],0,'После dès que для реального будущего используется indicatif futur.','Dès que takes the future indicative for a real future event.')
    ],
    B2: [
      q('grammar','Bien que la solution ___ coûteuse, elle reste efficace.',['soit','est','sera'],0,'Bien que требует subjonctif.','Bien que is followed by the subjunctive.'),
      q('grammar','Si nous avions anticipé le problème, nous l’___ évité.',['aurions','avons','avions'],0,'Условие о прошлом требует conditionnel passé.','An unreal past condition takes the past conditional.'),
      q('grammar','C’est une décision ___ les conséquences restent incertaines.',['dont','que','où'],0,'Dont заменяет дополнение с de.','Dont replaces a complement introduced by de.'),
      q('grammar','Non seulement il a accepté, ___ il a proposé son aide.',['mais encore','pourtant','sinon'],0,'Устойчивая корреляция non seulement ... mais encore.','The paired structure is non seulement ... mais encore.'),
      q('vocabulary','Le rapport cherche à ___ les effets de la réforme.',['nuancer','abolir','deviner'],0,'Nuancer — уточнять и показывать оттенки.','Nuancer means to qualify or add nuance.'),
      q('grammar','Quel que ___ le résultat, nous publierons les données.',['soit','est','sera'],0,'Quel que soit — уступительный оборот с subjonctif.','Quel que soit is a concessive expression with the subjunctive.'),
      q('reading','Lis : «Le vote a été reporté afin que chaque membre puisse consulter le dossier». Pourquoi ?',['Pour permettre l’examen du dossier','Parce que le dossier a disparu','Pour annuler le vote'],0,'Голосование отложили, чтобы участники изучили материалы.','The vote was postponed so members could review the file.'),
      q('grammar','Après que les experts ___ le rapport, la décision a été annoncée.',['ont examiné','examinent','examineraient'],0,'После après que в нормативной речи используется indicatif.','Après que is followed by the indicative in standard usage.')
    ],
    C1: [
      q('grammar','Il est peu probable que cette mesure ___ les résultats attendus.',['produise','produit','produira'],0,'Оценка вероятности с peu probable que требует subjonctif.','Peu probable que takes the subjunctive.'),
      q('vocabulary','Son analyse est particulièrement ___ : elle tient compte des exceptions.',['nuancée','sommaire','hasardeuse'],0,'Nuancée означает учитывающая тонкие различия.','Nuancée means nuanced.'),
      q('grammar','À supposer que les chiffres ___ exacts, la conclusion reste fragile.',['soient','sont','seront'],0,'À supposer que требует subjonctif.','À supposer que takes the subjunctive.'),
      q('grammar','La question mérite d’___ examinée sous un autre angle.',['être','avoir','étant'],0,'После mérite d’ используется infinitif; пассив — être examinée.','Mérite de takes the infinitive; the passive is être examinée.'),
      q('vocabulary','Cette objection est loin d’être ___.',['négligeable','négligée','négligente'],0,'Négligeable означает несущественный; здесь отрицается незначимость.','Négligeable means insignificant; the phrase denies that.'),
      q('grammar','Ce n’est pas tant le résultat ___ la méthode qui pose problème.',['que','mais','dont'],0,'Конструкция ce n’est pas tant ... que подчёркивает второй элемент.','Ce n’est pas tant ... que focuses on the second element.'),
      q('reading','Lis : «L’étude distingue les données observées des hypothèses interprétatives». Pourquoi ?',['Pour séparer les faits des interprétations','Pour supprimer les données','Pour éviter toute conclusion'],0,'Различение не позволяет смешивать наблюдения с гипотезами.','The distinction separates observations from hypotheses.'),
      q('grammar','Encore faut-il que les résultats ___ reproductibles.',['soient','sont','seront'],0,'Il faut que требует subjonctif.','Il faut que requires the subjunctive.')
    ],
    C2: [
      q('vocabulary','Sa démonstration est d’une ___ remarquable.',['limpidité','lourdeur','rareté'],0,'Limpidité означает предельную ясность изложения.','Limpidité means exceptional clarity.'),
      q('grammar','Loin de ___ une réponse définitive, ce texte ouvre le débat.',['fournir','fournissant','fourni'],0,'Loin de употребляется с infinitif.','Loin de is followed by the infinitive.'),
      q('vocabulary','Cette remarque, en apparence anodine, est en réalité ___.',['subversive','subséquente','sommaire'],0,'Subversive указывает на способность ставить под сомнение основы.','Subversive suggests challenging established assumptions.'),
      q('grammar','Quelque discutables que ___ ces prémisses, elles doivent être examinées.',['soient','sont','seront'],0,'Quelque + adjectif + que требует subjonctif.','Quelque + adjective + que takes the subjunctive.'),
      q('vocabulary','L’auteur refuse toute lecture ___ du phénomène.',['réductrice','rédhibitoire','récurrente'],0,'Réductrice означает чрезмерно упрощённая, сводящая к одному аспекту.','Réductrice means reductive or oversimplifying.'),
      q('grammar','Pour peu qu’on y ___ attention, la contradiction apparaît.',['prête','prêtez','prêtait'],0,'Pour peu que вводит условие и требует subjonctif.','Pour peu que introduces a condition and takes the subjunctive.'),
      q('reading','Lis : «La réserve formulée ne récuse pas le principe, mais en circonscrit la portée». Que fait-elle ?',['Elle en précise les limites','Elle rejette entièrement le principe','Elle en confirme tous les effets'],0,'Оговорка не отвергает принцип, а ограничивает область его действия.','The qualification narrows the principle’s scope rather than rejecting it.'),
      q('grammar','Encore que la thèse ___ séduisante, elle appelle des vérifications.',['soit','est','sera'],0,'Encore que вводит уступительное придаточное с subjonctif.','Encore que introduces a concessive clause with the subjunctive.')
    ]
  },
  it: {
    A1: [
      q('grammar','Io ___ Marco.',['sono','sei','è'],0,'С io используется форма sono.','Use sono with io.'),
      q('grammar','Tu ___ a Roma.',['abiti','abita','abitano'],0,'С tu у глагола abitare форма abiti.','Use abiti with tu.'),
      q('grammar','Questa è ___ casa.',['una','un','uno'],0,'Casa — существительное женского рода.','Casa is feminine.'),
      q('grammar','Noi ___ studenti.',['siamo','sono','siete'],0,'С noi используется siamo.','Use siamo with noi.'),
      q('vocabulary','Qual è il contrario di «caldo»?',['freddo','alto','nuovo'],0,'Freddo — противоположность caldo.','Freddo is the opposite of caldo.'),
      q('grammar','Vado ___ scuola.',['a','da','di'],0,'С scuola используется предлог a: andare a scuola.','The expression is andare a scuola.'),
      q('grammar','Lei ___ una sorella.',['ha','hai','hanno'],0,'С lei у avere форма ha.','Use ha with lei.'),
      q('reading','Leggi: «Paolo vive a Torino e studia italiano». Dove vive Paolo?',['A Torino','A Firenze','A Napoli'],0,'В тексте указано, что Паоло живёт в Турине.','The text says Paolo lives in Turin.')
    ],
    A2: [
      q('grammar','Ieri ___ un museo con gli amici.',['ho visitato','visito','visiterò'],0,'Завершённое действие в прошлом выражается passato prossimo.','A completed past action uses the passato prossimo.'),
      q('grammar','Maria è ___ alle otto.',['partita','partito','partire'],0,'С essere причастие согласуется с женским подлежащим.','With essere, the participle agrees with the feminine subject.'),
      q('grammar','Non ho ___ fame.',['molta','molti','molto'],0,'Fame — существительное женского рода.','Fame is feminine.'),
      q('grammar','Questo esercizio è ___ facile di quello.',['più','molto','il più'],0,'Сравнительная степень строится с più ... di.','Use più ... di for a comparative.'),
      q('grammar','Quando ___ a casa, ti telefono.',['arrivi','arriverai','arrivare'],0,'В придаточном времени для будущего события используется presente.','The present tense is used in a future time clause.'),
      q('grammar','Vorrei ___ acqua, per favore.',['dell’','del','della'],0,'Acqua — существительное женского рода, начинающееся с гласной.','Acqua is feminine and begins with a vowel.'),
      q('vocabulary','Per prendere il treno vado alla ___.',['stazione','spiaggia','farmacia'],0,'Stazione — железнодорожная станция.','Stazione means station.'),
      q('reading','Leggi: «Sabato Luca ha cucinato e poi ha invitato gli amici». Che cosa ha fatto dopo?',['Ha invitato gli amici','È andato al lavoro','Ha comprato una bici'],0,'После готовки Лука пригласил друзей.','After cooking, Luca invited his friends.')
    ],
    B1: [
      q('grammar','Spero che tu ___ presto.',['venga','vieni','verrai'],0,'После spero che используется congiuntivo.','Spero che is followed by the subjunctive.'),
      q('grammar','Se avessi più tempo, ___ un corso.',['seguirei','seguirò','seguivo'],0,'Нереальное условие: congiuntivo imperfetto + condizionale.','An unreal condition uses the imperfect subjunctive and conditional.'),
      q('grammar','La lettera è stata ___ ieri.',['spedita','spedito','spedire'],0,'Причастие согласуется с lettera, женский род.','The participle agrees with lettera, a feminine noun.'),
      q('grammar','Non penso che loro ___ la risposta.',['sappiano','sanno','sapranno'],0,'Отрицание мнения требует congiuntivo.','A negative opinion takes the subjunctive.'),
      q('grammar','Studio italiano da due anni e continuo a ___.',['migliorare','migliorato','miglioro'],0,'Продолжение действия выражается a + infinito.','Continuare takes a plus the infinitive.'),
      q('vocabulary','Dobbiamo ___ una soluzione condivisa.',['trovare','perdere','rompere'],0,'Trovare una soluzione — найти решение.','Trovare una soluzione means to find a solution.'),
      q('reading','Leggi: «Il comune ha creato nuovi percorsi ciclabili per ridurre il traffico». Qual è lo scopo?',['Ridurre il traffico','Aumentare i parcheggi','Chiudere le scuole'],0,'Цель — уменьшить дорожное движение.','The purpose is to reduce traffic.'),
      q('grammar','Ti scrivo appena ___ i risultati.',['ricevo','riceverò','ricevessi'],0,'После appena для реального будущего события часто используется presente.','Appena commonly takes the present for a real future event.')
    ],
    B2: [
      q('grammar','Benché la proposta ___ costosa, merita attenzione.',['sia','è','sarà'],0,'Benché требует congiuntivo.','Benché is followed by the subjunctive.'),
      q('grammar','Se lo avessi saputo, ti ___ prima.',['avrei avvisato','avviserò','avvisavo'],0,'Нереальное прошлое: congiuntivo trapassato + condizionale passato.','An unreal past condition takes the past conditional.'),
      q('grammar','È una questione ___ conseguenze sono ancora incerte.',['le cui','che','dove'],0,'Le cui выражает принадлежность и согласуется с conseguenze.','Le cui expresses possession and agrees with conseguenze.'),
      q('grammar','Non solo ha partecipato, ___ ha coordinato il gruppo.',['ma anche','però','altrimenti'],0,'Конструкция non solo ... ma anche добавляет второй элемент.','Non solo ... ma anche adds a second element.'),
      q('vocabulary','Il rapporto cerca di ___ i possibili effetti della riforma.',['valutare','nascondere','dimenticare'],0,'Valutare означает оценивать на основании данных.','Valutare means to assess.'),
      q('grammar','Per quanto ___, non riesce a convincerli.',['insista','insiste','insisterà'],0,'Per quanto с уступительным значением требует congiuntivo.','Per quanto in a concessive sense takes the subjunctive.'),
      q('reading','Leggi: «La decisione è stata rinviata per consentire un esame più approfondito». Perché?',['Per approfondire l’esame','Per cancellare il progetto','Per ridurre il personale'],0,'Решение отложили ради более подробного рассмотрения.','The decision was delayed for a more thorough review.'),
      q('grammar','Dopo che i dati ___ verificati, il rapporto sarà pubblicato.',['saranno','siano','sono stati'],0,'После dopo che для завершённого будущего уместен futuro anteriore.','Dopo che can take the future perfect for a completed future action.')
    ],
    C1: [
      q('grammar','È improbabile che la misura ___ gli effetti previsti.',['produca','produce','produrrà'],0,'Оценка маловероятности требует congiuntivo.','An expression of improbability takes the subjunctive.'),
      q('vocabulary','L’analisi è particolarmente ___ e considera anche le eccezioni.',['sfumata','sbrigativa','casuale'],0,'Sfumata означает учитывающая тонкости и оттенки.','Sfumata means nuanced.'),
      q('grammar','A condizione che i dati ___ corretti, il calcolo è valido.',['siano','sono','saranno'],0,'A condizione che требует congiuntivo.','A condizione che takes the subjunctive.'),
      q('grammar','La questione merita di ___ esaminata con attenzione.',['essere','avere','stare'],0,'После merita di используется infinito; пассив — essere esaminata.','Merita di takes the infinitive; the passive is essere esaminata.'),
      q('vocabulary','L’obiezione non è affatto ___.',['trascurabile','trascurata','trascurante'],0,'Trascurabile означает несущественная; здесь говорится об обратном.','Trascurabile means negligible; the sentence denies that.'),
      q('grammar','Non è tanto il risultato, ___ il metodo a destare dubbi.',['quanto','perché','mentre'],0,'Оборот non tanto ... quanto противопоставляет два аспекта.','Non tanto ... quanto contrasts two aspects.'),
      q('reading','Leggi: «Lo studio separa i dati osservati dalle ipotesi interpretative». Perché?',['Per distinguere fatti e interpretazioni','Per eliminare i dati','Per evitare ogni conclusione'],0,'Разделение позволяет отличать наблюдения от предположений.','The distinction separates observations from interpretations.'),
      q('grammar','È necessario che le conclusioni ___ verificabili.',['siano','sono','saranno'],0,'После è necessario che требуется congiuntivo.','È necessario che takes the subjunctive.')
    ],
    C2: [
      q('vocabulary','La sua argomentazione è di una ___ rara.',['limpidezza','confusione','superficialità'],0,'Limpidezza означает исключительную ясность изложения.','Limpidezza means exceptional clarity.'),
      q('grammar','Lungi dal ___ una risposta definitiva, il saggio apre nuove questioni.',['fornire','fornendo','fornito'],0,'Lungi dal употребляется с infinito.','Lungi dal is followed by the infinitive.'),
      q('vocabulary','La critica è sottile, ma tutt’altro che ___.',['innocua','inevitabile','inermi'],0,'Innocua означает безвредная; оборот tutt’altro che отрицает это.','Innocua means harmless; tutt’altro che negates it.'),
      q('grammar','Per quanto ___ le premesse, occorre valutarne gli effetti.',['discutibili siano','sono discutibili','saranno discutibili'],0,'Per quanto + aggettivo требует congiuntivo.','Per quanto followed by an adjective takes the subjunctive.'),
      q('vocabulary','L’autore evita una lettura ___ del fenomeno.',['riduttiva','ricorrente','retorica'],0,'Riduttiva означает сводящая сложное явление к упрощённой схеме.','Riduttiva means reductive.'),
      q('grammar','A meno che non ___ nuovi elementi, la valutazione resta invariata.',['emergano','emergono','emergeranno'],0,'A meno che non требует congiuntivo.','A meno che non takes the subjunctive.'),
      q('reading','Leggi: «La riserva non respinge il principio, ma ne circoscrive la portata». Che cosa fa?',['Ne definisce i limiti','Lo rifiuta del tutto','Ne conferma ogni effetto'],0,'Оговорка ограничивает сферу действия принципа, не отвергая его.','The qualification limits the principle’s scope without rejecting it.'),
      q('grammar','Comunque ___ la questione, i criteri devono essere espliciti.',['si interpreti','si interpreta','si interpreterà'],0,'Comunque с обобщительным уступительным значением требует congiuntivo.','Comunque in this concessive sense takes the subjunctive.')
    ]
  },
  pt: {
    A1: [
      q('grammar','Eu ___ estudante.',['sou','és','é'],0,'С eu используется форма sou.','Use sou with eu.'),
      q('grammar','Tu ___ em Lisboa.',['moras','mora','moram'],0,'С tu у глагола morar форма moras.','Use moras with tu.'),
      q('grammar','Esta é ___ casa.',['uma','um','uns'],0,'Casa — существительное женского рода.','Casa is feminine.'),
      q('grammar','Nós ___ portugueses.',['somos','são','sois'],0,'С nós используется somos.','Use somos with nós.'),
      q('vocabulary','Qual é o contrário de «grande»?',['pequeno','comprido','novo'],0,'Pequeno — противоположность grande.','Pequeno is the opposite of grande.'),
      q('grammar','Vou ___ escola.',['à','ao','de'],0,'Перед escola используется à (a + a).','Use à before escola.'),
      q('grammar','Ela ___ dois irmãos.',['tem','tens','têm'],0,'С ela используется форма tem.','Use tem with ela.'),
      q('reading','Lê: «A Rita vive no Porto e trabalha numa escola». Onde vive a Rita?',['No Porto','Em Faro','Em Coimbra'],0,'В тексте сказано, что Рита живёт в Порту.','The text says Rita lives in Porto.')
    ],
    A2: [
      q('grammar','Ontem ___ um filme com os amigos.',['vi','vejo','verei'],0,'Завершённое действие в прошлом: pretérito perfeito — vi.','A completed past action uses the pretérito perfeito: vi.'),
      q('grammar','A Maria chegou ___ oito horas.',['às','aos','em'],0,'Для времени суток используется às oito horas.','Use às oito horas to tell the time.'),
      q('grammar','Não tenho ___ dinheiro hoje.',['muito','muitos','muita'],0,'Dinheiro — существительное мужского рода в единственном числе.','Dinheiro is masculine singular.'),
      q('grammar','Este exercício é ___ fácil do que o outro.',['mais','muito','o mais'],0,'Сравнение строится с mais ... do que.','Use mais ... do que for a comparison.'),
      q('grammar','Quando ___ a casa, telefono-te.',['chegares','chegas','chegarás'],0,'После quando в будущем придаточном времени используется futuro do conjuntivo.','A future time clause commonly uses the future subjunctive.'),
      q('grammar','Queria ___ água, por favor.',['uma','um','uns'],0,'Água — существительное женского рода.','Água is feminine.'),
      q('vocabulary','Para apanhar o comboio, vou à ___.',['estação','praia','cozinha'],0,'Estação — железнодорожная станция.','Estação means station.'),
      q('reading','Lê: «No sábado, o Miguel cozinhou e depois convidou os amigos». O que fez depois?',['Convidou os amigos','Foi trabalhar','Comprou um carro'],0,'После готовки Мигел пригласил друзей.','After cooking, Miguel invited his friends.')
    ],
    B1: [
      q('grammar','Espero que tu ___ em breve.',['venhas','vens','virás'],0,'После espero que используется conjuntivo.','Espero que is followed by the subjunctive.'),
      q('grammar','Se tivesse mais tempo, ___ outro curso.',['frequentaria','frequentarei','frequentava'],0,'Нереальное условие: imperfeito do conjuntivo + condicional.','An unreal condition uses the imperfect subjunctive and conditional.'),
      q('grammar','A carta foi ___ ontem.',['enviada','enviado','enviar'],0,'Причастие согласуется с carta, женский род.','The participle agrees with carta, a feminine noun.'),
      q('grammar','Não acredito que eles ___ a resposta.',['saibam','sabem','saberão'],0,'Отрицание мнения требует conjuntivo.','A negative belief takes the subjunctive.'),
      q('grammar','Estou a estudar português para ___ melhor.',['comunicar','comunico','comunicado'],0,'Para выражает цель и сопровождается infinitivo.','Para expresses purpose and is followed by the infinitive.'),
      q('vocabulary','Precisamos de ___ uma solução comum.',['encontrar','esconder','adiar'],0,'Encontrar uma solução означает найти решение.','Encontrar uma solução means to find a solution.'),
      q('reading','Lê: «A câmara criou ciclovias para reduzir o trânsito». Qual é o objetivo?',['Reduzir o trânsito','Aumentar o estacionamento','Fechar as lojas'],0,'Цель — сократить автомобильное движение.','The purpose is to reduce traffic.'),
      q('grammar','Escrevo-te assim que ___ os resultados.',['receber','recebo','receberei'],0,'После assim que в будущем временном значении используется futuro do conjuntivo.','Assim que takes the future subjunctive for a future event.')
    ],
    B2: [
      q('grammar','Embora a proposta ___ dispendiosa, merece atenção.',['seja','é','será'],0,'Embora требует conjuntivo.','Embora is followed by the subjunctive.'),
      q('grammar','Se o tivesse sabido, ter-te-ia ___ mais cedo.',['avisado','aviso','avisarei'],0,'Нереальное прошлое выражается конструкцией с condicional composto.','An unreal past condition uses the compound conditional.'),
      q('grammar','É uma decisão ___ consequências continuam incertas.',['cujas','que','onde'],0,'Cujas выражает принадлежность и согласуется с consequências.','Cujas expresses possession and agrees with consequências.'),
      q('grammar','Não só participou, ___ coordenou a equipa.',['como também','porém','senão'],0,'Конструкция não só ... como também добавляет второй элемент.','Não só ... como também adds a second element.'),
      q('vocabulary','O relatório procura ___ os efeitos da reforma.',['avaliar','ocultar','esquecer'],0,'Avaliar означает оценивать.','Avaliar means to assess.'),
      q('grammar','Por mais que ___, não consegue convencê-los.',['insista','insiste','insistirá'],0,'Por mais que с уступительным значением требует conjuntivo.','Por mais que in a concessive sense takes the subjunctive.'),
      q('reading','Lê: «A votação foi adiada para permitir uma análise mais aprofundada». Porquê?',['Para aprofundar a análise','Para cancelar o projeto','Para reduzir a equipa'],0,'Голосование перенесли ради более тщательного анализа.','The vote was delayed for a more thorough analysis.'),
      q('grammar','Depois de os peritos ___ o relatório, a decisão será anunciada.',['analisarem','analisam','analisariam'],0,'После depois de в придаточной конструкции с отдельным подлежащим используется infinitivo pessoal.','Depois de with an explicit subject takes the personal infinitive.')
    ],
    C1: [
      q('grammar','É pouco provável que a medida ___ os efeitos esperados.',['produza','produz','produzirá'],0,'Оценка маловероятности требует conjuntivo.','An expression of improbability takes the subjunctive.'),
      q('vocabulary','A análise é particularmente ___ e considera as exceções.',['matizada','superficial','aleatória'],0,'Matizada означает учитывающая оттенки и нюансы.','Matizada means nuanced.'),
      q('grammar','Desde que os dados ___ corretos, o cálculo é válido.',['sejam','são','serão'],0,'Desde que в значении условия требует conjuntivo.','Desde que meaning “provided that” takes the subjunctive.'),
      q('grammar','A questão merece ser ___ com cuidado.',['examinada','examinado','examinar'],0,'Причастие согласуется с questão, женский род.','The participle agrees with questão, a feminine noun.'),
      q('vocabulary','A objeção está longe de ser ___.',['irrelevante','irrelevada','irrelevanteza'],0,'Irrelevante означает несущественная; здесь говорится, что это не так.','Irrelevante means insignificant; the sentence denies that.'),
      q('grammar','Não é tanto o resultado, ___ o método que suscita dúvidas.',['mas','porque','enquanto'],0,'Конструкция não tanto ... mas противопоставляет результат и метод.','Não tanto ... mas contrasts the result with the method.'),
      q('reading','Lê: «O estudo distingue os dados observados das hipóteses interpretativas». Porquê?',['Para separar factos de interpretações','Para eliminar os dados','Para evitar conclusões'],0,'Различие предотвращает смешение наблюдений и гипотез.','The distinction separates observations from interpretations.'),
      q('grammar','É essencial que as conclusões ___ verificáveis.',['sejam','são','serão'],0,'После é essencial que используется conjuntivo.','É essencial que takes the subjunctive.')
    ],
    C2: [
      q('vocabulary','A exposição revela uma ___ invulgar.',['clareza','confusão','superficialidade'],0,'Clareza означает исключительную ясность изложения.','Clareza means clarity.'),
      q('grammar','Longe de ___ uma resposta definitiva, o ensaio abre novas questões.',['fornecer','fornecendo','fornecido'],0,'Longe de употребляется с infinitivo.','Longe de is followed by the infinitive.'),
      q('vocabulary','A crítica é subtil, mas nada ___.',['inócua','inevitável','recorrente'],0,'Inócua означает безвредная; в предложении это отрицается.','Inócua means harmless; the sentence denies that.'),
      q('grammar','Por mais ___ que sejam as premissas, importa avaliar os efeitos.',['discutíveis','discutíveis são','discutível'],0,'Por mais + adjectivo + que требует conjuntivo.','Por mais + adjective + que takes the subjunctive.'),
      q('vocabulary','O autor evita uma leitura ___ do fenómeno.',['redutora','recorrente','retórica'],0,'Redutora означает сводящая сложное явление к упрощённой схеме.','Redutora means reductive.'),
      q('grammar','A menos que ___ novos elementos, a avaliação mantém-se.',['surjam','surgem','surgirão'],0,'A menos que требует conjuntivo.','A menos que takes the subjunctive.'),
      q('reading','Lê: «A ressalva não rejeita o princípio; delimita apenas o seu alcance». O que faz?',['Define os seus limites','Rejeita-o por completo','Confirma todos os efeitos'],0,'Оговорка ограничивает область принципа, не отвергая его.','The qualification limits the principle’s scope without rejecting it.'),
      q('grammar','Seja qual ___ a interpretação, os critérios devem ser explícitos.',['for','é','será'],0,'Seja qual for — устойчивый оборот с conjuntivo.','Seja qual for is a fixed expression using the subjunctive.')
    ]
  },
  pl: {
    A1: [
      q('grammar','Ja ___ studentem.',['jestem','jesteś','jest'],0,'С ja используется форма jestem.','Use jestem with ja.'),
      q('grammar','Ty ___ w Warszawie.',['mieszkasz','mieszka','mieszkają'],0,'С ty у глагола mieszkać форма mieszkasz.','Use mieszkasz with ty.'),
      q('grammar','To jest ___ książka.',['nowa','nowy','nowe'],0,'Książka — существительное женского рода.','Książka is feminine.'),
      q('grammar','My ___ z Polski.',['jesteśmy','są','jesteście'],0,'С my используется jesteśmy.','Use jesteśmy with my.'),
      q('vocabulary','Co jest przeciwieństwem słowa „duży”?',['mały','długi','młody'],0,'Mały — противоположность duży.','Mały is the opposite of duży.'),
      q('grammar','Idę ___ szkoły.',['do','na','od'],0,'Для направления «в школу» используется do szkoły.','Use do szkoły to express going to school.'),
      q('grammar','Ona ___ brata.',['ma','mam','masz'],0,'С ona используется форма ma.','Use ma with ona.'),
      q('reading','Przeczytaj: „Anna mieszka w Krakowie i studiuje historię”. Gdzie mieszka Anna?',['W Krakowie','W Gdańsku','W Łodzi'],0,'В тексте сказано, что Анна живёт в Кракове.','The text says Anna lives in Kraków.')
    ],
    A2: [
      q('grammar','Wczoraj ___ do muzeum.',['poszliśmy','idziemy','pójdziemy'],0,'Wczoraj указывает на завершённое действие в прошлом.','Wczoraj signals a completed past action.'),
      q('grammar','Nie mam ___ czasu.',['dużo','duży','duża'],0,'После negacji mam используется форма dopełniacza: dużo czasu.','After negation, the genitive phrase dużo czasu is used.'),
      q('grammar','Ten pociąg jest ___ niż autobus.',['szybszy','najszybszy','szybko'],0,'Для сравнения используется szybszy niż.','Use szybszy niż for a comparative.'),
      q('grammar','Kiedy ___ do domu, zadzwoń do mnie.',['wrócisz','wracasz','wracałeś'],0,'В придаточном времени о будущем употребляется форма будущего/совершенного вида.','A future time clause uses the appropriate future perfective form.'),
      q('grammar','Szukam ___ kluczy.',['moich','moje','moimi'],0,'После szukać требуется dopełniacz: moich kluczy.','Szukac takes the genitive: moich kluczy.'),
      q('grammar','Czy możesz mi ___?',['pomóc','pomaga','pomógł'],0,'После modalного можешь используется infinitiv: pomóc.','After możesz, use the infinitive pomóc.'),
      q('vocabulary','Bilet na pociąg kupuję na ___.',['dworcu','basenie','lotnisku'],0,'Dworzec — железнодорожный вокзал.','Dworzec means railway station.'),
      q('reading','Przeczytaj: „W sobotę Marta ugotowała obiad, a potem zaprosiła znajomych”. Co zrobiła później?',['Zaprosiła znajomych','Poszła do pracy','Kupiła rower'],0,'После приготовления обеда Марта пригласила знакомых.','After cooking lunch, Marta invited friends.')
    ],
    B1: [
      q('grammar','Gdybym miał więcej czasu, ___ drugi język.',['uczyłbym się','uczę się','będę się uczył'],0,'Условное предложение нереального настоящего требует условной формы.','An unreal present condition uses the conditional.'),
      q('grammar','Nie sądzę, żeby on ___ rację.',['miał','ma','będzie miał'],0,'После nie sądzę, żeby используется сослагательная форма.','Nie sądzę, żeby takes the subjunctive-like conditional form.'),
      q('grammar','List został ___ wczoraj.',['wysłany','wysłana','wysłać'],0,'List — мужской род, поэтому wysłany.','List is masculine, so use wysłany.'),
      q('grammar','To jest osoba, z ___ pracuję.',['którą','która','której'],0,'После z при значении совместной работы требуется narzędnik: z którą.','The preposition z in this context takes the instrumental: z którą.'),
      q('grammar','Zanim ___ decyzję, sprawdź wszystkie dane.',['podejmiesz','podejmujesz','podjąłeś'],0,'В придаточном времени с будущим значением используется настоящее время совершенного вида.','A future time clause uses the present form of the perfective verb.'),
      q('vocabulary','Musimy ___ wspólne rozwiązanie.',['znaleźć','ukryć','opóźnić'],0,'Znaleźć rozwiązanie означает найти решение.','Znaleźć rozwiązanie means to find a solution.'),
      q('reading','Przeczytaj: „Miasto rozbudowało ścieżki rowerowe, aby ograniczyć ruch samochodowy”. Jaki był cel?',['Ograniczyć ruch samochodowy','Zwiększyć liczbę parkingów','Zamknąć szkoły'],0,'Цель — ограничить автомобильное движение.','The purpose was to reduce car traffic.'),
      q('grammar','Cieszę się, że ___ w tym projekcie.',['uczestniczysz','uczestniczyć','uczestniczyłeś jutro'],0,'После cieszę się, że в утвердительном контексте используется изъявительное наклонение.','An affirmative cieszę się, że takes the indicative.')
    ],
    B2: [
      q('grammar','Chociaż propozycja ___ kosztowna, warto ją rozważyć.',['jest','być','będzie'],0,'Chociaż вводит придаточное уступки; здесь утверждается факт, поэтому indicativ.','Chociaż introduces a concessive clause; the fact is stated, so use the indicative.'),
      q('grammar','Gdybym wcześniej o tym wiedział, ___ inaczej.',['postąpiłbym','postępuję','postąpię'],0,'Нереальное условие о прошлом требует условной формы совершенного вида.','An unreal past condition takes the conditional perfective form.'),
      q('grammar','To decyzja, ___ skutki są nadal niepewne.',['której','którą','która'],0,'Относительное местоимение в родительном падеже выражает принадлежность.','The genitive relative pronoun expresses possession.'),
      q('grammar','Nie tylko wziął udział, ___ także kierował zespołem.',['lecz','ponieważ','chociaż'],0,'Корреляция nie tylko ... lecz także добавляет второй элемент.','Nie tylko ... lecz także adds a second element.'),
      q('vocabulary','Raport próbuje ___ możliwe skutki reformy.',['ocenić','ukryć','zapomnieć'],0,'Ocenić означает оценить.','Ocenić means to assess.'),
      q('grammar','Jakkolwiek ___, trzeba uwzględnić konsekwencje.',['by było','jest','będzie'],0,'Jakkolwiek бы вводит уступительную конструкцию с условной формой.','Jakkolwiek can introduce a concessive clause with a conditional form.'),
      q('reading','Przeczytaj: „Głosowanie odroczono, aby umożliwić dokładniejszą analizę”. Dlaczego?',['Aby dokładniej przeanalizować sprawę','Aby anulować projekt','Aby zmniejszyć zespół'],0,'Голосование отложили ради более глубокого анализа.','The vote was delayed to allow a more thorough analysis.'),
      q('grammar','Po tym, jak eksperci ___ raport, ogłoszono decyzję.',['sprawdzili','sprawdzają','sprawdzaliby'],0,'Речь идёт о завершённом предшествующем действии в прошлом.','The sentence refers to a completed earlier action in the past.')
    ],
    C1: [
      q('grammar','Mało prawdopodobne, aby ta metoda ___ oczekiwane wyniki.',['przyniosła','przynosi','przyniesie'],0,'Mało prawdopodobne, aby вводит предположение, часто с условной/прошедшей формой.','Mało prawdopodobne, aby introduces an unlikely supposition.'),
      q('vocabulary','Analiza jest wyjątkowo ___ i uwzględnia wyjątki.',['wyważona','powierzchowna','przypadkowa'],0,'Wyważona означает взвешенная, сбалансированная.','Wyważona means balanced and considered.'),
      q('grammar','Pod warunkiem że dane ___ poprawne, obliczenie jest wiarygodne.',['są','byłyby','będą być'],0,'Pod warunkiem że выражает реальное условие; здесь используется indicativ.','Pod warunkiem że expresses a real condition and takes the indicative here.'),
      q('grammar','Kwestia zasługuje na to, by ją dokładnie ___.',['zbadać','bada','zbadana'],0,'После by в такой конструкции используется безличная форма инфинитива.','This by construction uses the infinitive.'),
      q('vocabulary','Ten argument nie jest bynajmniej ___.',['błahy','błaho','błahostka'],0,'Błahy означает незначительный; фраза отрицает такую оценку.','Błahy means trivial; the sentence rejects that description.'),
      q('grammar','Nie tyle wynik, ___ metoda budzi wątpliwości.',['ile','ponieważ','chociaż'],0,'Конструкция nie tyle ... ile противопоставляет два аспекта.','Nie tyle ... ile contrasts two aspects.'),
      q('reading','Przeczytaj: „Badanie oddziela dane empiryczne od hipotez interpretacyjnych”. Po co?',['Aby odróżnić obserwacje od interpretacji','Aby usunąć wszystkie dane','Aby uniknąć analizy'],0,'Разделение помогает отличать наблюдения от интерпретации.','The distinction separates observations from interpretation.'),
      q('grammar','Ważne jest, aby wnioski ___ możliwe do zweryfikowania.',['były','są','będą'],0,'После ważne jest, aby используется условная форма.','Ważne jest, aby takes a conditional-like form.')
    ],
    C2: [
      q('vocabulary','Wywód autora wyróżnia się niezwykłą ___.',['przejrzystością','chaotycznością','powierzchownością'],0,'Przejrzystość означает ясность и прозрачность аргументации.','Przejrzystość means clarity and transparency.'),
      q('grammar','Daleki od ___ jednoznacznej odpowiedzi, tekst otwiera dyskusję.',['udzielenia','udzielając','udzielony'],0,'Daleki od требует существительного или инфинитивной формы с отглагольным существительным.','Daleki od is followed by a genitive verbal noun in this construction.'),
      q('vocabulary','Ta pozornie drobna uwaga ma znaczenie ___.',['zasadnicze','przypadkowe','nieistotne'],0,'Zasadnicze означает принципиальное, ключевое.','Zasadnicze means fundamental.'),
      q('grammar','Jakkolwiek ___ przesłanki, należy rozważyć ich skutki.',['dyskusyjne byłyby','są dyskusyjne','będą dyskusyjne'],0,'Jakkolwiek с гипотетической уступкой допускает условную форму.','Jakkolwiek with a hypothetical concession can take the conditional.'),
      q('vocabulary','Autor unika ___ interpretacji zjawiska.',['jednostronnej','powtarzalnej','przejściowej'],0,'Jednostronnej означает односторонней.','Jednostronnej means one-sided.'),
      q('grammar','O ile nie ___ nowe dowody, ocena pozostanie bez zmian.',['pojawią się','pojawiają się','pojawiły się wczoraj'],0,'O ile nie вводит условие; для будущего используется настоящее совершенного вида.','O ile nie introduces a condition; the present perfective form refers to the future.'),
      q('reading','Przeczytaj: „Zastrzeżenie nie odrzuca zasady, lecz ogranicza zakres jej zastosowania”. Co robi autor?',['Określa granice zasady','Odrzuca ją całkowicie','Potwierdza wszystkie skutki'],0,'Оговорка ограничивает область применения принципа.','The qualification limits the principle’s scope.'),
      q('grammar','Niezależnie od tego, jak ___ sprawę, kryteria powinny być jawne.',['zinterpretujemy','interpretujemy wczoraj','interpretować'],0,'После niezależnie od tego, jak используется форма будущего/совершенного вида.','Niezależnie od tego, jak introduces a subordinate clause using a finite verb.')
    ]
  },
  ja: {
    A1: [
      q('grammar','わたしは学生___。',['です','ます','でした'],0,'です завершает вежливое именное предложение.','です completes a polite nominal sentence.'),
      q('grammar','これは___ですか。',['何','誰','どこ'],0,'何 спрашивает о предмете или значении «что».','何 asks “what”.'),
      q('grammar','毎朝七時___起きます。',['に','を','で'],0,'に указывает конкретное время.','に marks a specific time.'),
      q('grammar','学校___行きます。',['へ','を','が'],0,'へ обозначает направление движения.','へ marks direction of movement.'),
      q('grammar','猫が二匹___。',['います','あります','です'],0,'います используется для живых существ.','います is used for animate beings.'),
      q('grammar','これは私___本です。',['の','に','を'],0,'の соединяет владельца и предмет: 私の本.','の links the owner and the object.'),
      q('vocabulary','「ありがとう」はどんなときに使いますか。',['感謝するとき','謝るとき','別れるとき'],0,'ありがとう выражает благодарность.','ありがとう expresses gratitude.'),
      q('reading','読んでください。「田中さんは大阪に住んでいます。」田中さんはどこに住んでいますか。',['大阪','東京','京都'],0,'В предложении сказано, что Танака живёт в Осаке.','The sentence says Tanaka lives in Osaka.')
    ],
    A2: [
      q('grammar','昨日、友だちと映画を___。',['見ました','見ます','見るでしょう'],0,'昨日 указывает на прошедшее время.','昨日 indicates past time.'),
      q('grammar','ご飯を食べて___、勉強します。',['から','まで','しか'],0,'Vてから означает «после того как сделал».','Vてから means “after doing”.'),
      q('grammar','日本語を話すことが___。',['できます','します','あります'],0,'ことができます выражает умение или возможность.','ことができます expresses ability or possibility.'),
      q('grammar','この町は東京より___です。',['静か','静かな','静かに'],0,'な-прилагательное перед です используется без な.','A na-adjective before です does not take な.'),
      q('grammar','雨が降っている___、出かけません。',['ので','のに','まで'],0,'ので вводит причину.','ので introduces a reason.'),
      q('grammar','週末は家で本を___たいです。',['読み','読む','読んで'],0,'Желание выражается формой основы глагола + たい.','Desire is expressed with the verb stem plus たい.'),
      q('vocabulary','駅で切符を買います。「切符」は何ですか。',['電車などの乗車券','食べ物','地図'],0,'切符 означает билет.','切符 means a ticket.'),
      q('reading','読んでください。「日曜日に公園で友だちとサッカーをしました。」何をしましたか。',['サッカーをしました','買い物をしました','料理をしました'],0,'В тексте сказано, что они играли в футбол.','The text says they played football.')
    ],
    B1: [
      q('grammar','明日までにレポートを___ようにしてください。',['出す','出して','出した'],0,'ようにしてください выражает просьбу или рекомендацию добиться результата.','ようにしてください asks someone to make sure an action is done.'),
      q('grammar','雨が降れば、試合は中止に___。',['なる','なった','なって'],0,'Условная форма ば используется для результата условия.','The ば conditional introduces the result of a condition.'),
      q('grammar','彼は忙しい___、毎日勉強しています。',['のに','ので','ため'],0,'のに выражает контраст «несмотря на то что».','のに expresses contrast: “although”.'),
      q('grammar','この本は子どもにも___やすいです。',['読み','読む','読んで'],0,'После основы глагола + やすい выражается лёгкость действия.','Verb stem plus やすい means easy to do.'),
      q('grammar','電車に乗り遅れない___、早く家を出ました。',['ように','ためで','そうに'],0,'ように выражает цель — не допустить нежелательного результата.','ように expresses the aim of avoiding an unwanted outcome.'),
      q('vocabulary','「影響を与える」に近い意味はどれですか。',['作用する','忘れる','到着する'],0,'作用する близко по значению к «оказывать влияние».','作用する means to have an effect.'),
      q('reading','読んでください。「市はごみを減らすため、分別回収を始めました。」市の目的は何ですか。',['ごみを減らすこと','道路を広げること','店を増やすこと'],0,'Цель — сократить количество отходов.','The aim is to reduce waste.'),
      q('grammar','先生に作文を直して___。',['もらいました','あげました','くれました'],0,'てもらう выражает получение услуги от другого человека.','てもらう expresses receiving a favour or service.')
    ],
    B2: [
      q('grammar','この資料を読んだ___で、意見をまとめてください。',['うえ','まま','ほど'],0,'Vたうえで означает «после того как ознакомился».','Vたうえで means “after doing”.'),
      q('grammar','彼が必ずしも正しい___限りません。',['とは','ので','まで'],0,'とは限らない выражает, что нечто не обязательно так.','とは限らない means “not necessarily”.'),
      q('grammar','計画は成功した___、課題も残っています。',['ものの','ために','ところで'],0,'ものの выражает уступку: «хотя».','ものの expresses concession: “although”.'),
      q('grammar','事故が起こり___ので、十分注意してください。',['かねない','きれない','こない'],0,'かねない означает возможность нежелательного результата.','かねない indicates a risk of an undesirable outcome.'),
      q('vocabulary','「妥当な判断」に最も近いものはどれですか。',['適切な判断','急な判断','曖昧な判断'],0,'妥当な означает обоснованный или уместный.','妥当 means reasonable or appropriate.'),
      q('grammar','彼女は説明することなく、その場を___。',['立ち去った','立ち去る','立ち去っているだろう'],0,'ことなく означает «не делая чего-либо».','ことなく means “without doing”.'),
      q('reading','読んでください。「制度の変更は利用者の意見を踏まえて決定されました。」何を参考にしましたか。',['利用者の意見','広告の内容','過去の天気'],0,'Решение учитывало мнения пользователей.','The decision was based on users’ opinions.'),
      q('grammar','この条件を満たす___、応募することができます。',['限り','ばかり','ところ'],0,'限り означает «при условии, что» или «пока выполняется условие».','限り means “as long as” or “provided that”.')
    ],
    C1: [
      q('grammar','結果のいかんに___、手続きは変更されません。',['かかわらず','よって','つれて'],0,'いかんにかかわらず — формальный оборот «независимо от».','いかんにかかわらず means “regardless of”.'),
      q('grammar','この発言は誤解を招き___表現である。',['かねない','がたい','きれない'],0,'かねない обозначает риск нежелательного последствия.','かねない indicates a risk of an undesirable consequence.'),
      q('grammar','彼の成功は努力の結果に___ならない。',['ほか','しか','まで'],0,'にほかならない подчёркивает, что нечто является именно этим.','にほかならない means “nothing other than”.'),
      q('grammar','資料を確認した___で、最終判断を下すべきだ。',['うえ','まま','ほど'],0,'確認したうえで означает «после проверки».','確認したうえで means “after checking”.'),
      q('vocabulary','「懸念を払拭する」に近い意味はどれですか。',['不安を取り除く','問題を隠す','計画を延期する'],0,'払拭する означает устранить или рассеять сомнения.','払拭する means to dispel or remove concerns.'),
      q('grammar','いかに困難で___、検討する価値はある。',['あろうとも','あるから','あったので'],0,'であろうとも — книжный уступительный оборот.','であろうとも is a formal concessive expression.'),
      q('reading','読んでください。「報告書は数値だけでなく、その算出方法も明示している。」何を明らかにしていますか。',['数値と算出方法','予算と人員','予定と結果'],0,'Отчёт указывает и числа, и метод их расчёта.','The report gives both figures and the method used to calculate them.'),
      q('grammar','議論を進めるに___、前提を共有する必要がある。',['あたって','つれて','限って'],0,'にあたって означает «приступая к» или «в связи с».','にあたって means “when undertaking”.')
    ],
    C2: [
      q('vocabulary','「示唆に富む」に最も近い意味はどれですか。',['多くの気づきを与える','内容が不明瞭である','結論が欠けている'],0,'示唆に富む означает содержащий важные подсказки или идеи.','示唆に富む means thought-provoking or rich in implications.'),
      q('grammar','その評価は、事実関係を十分に踏まえた___でなければならない。',['もので','ことに','ためを'],0,'ものでなければならない выражает требование к характеру оценки.','ものでなければならない expresses a requirement about the nature of the assessment.'),
      q('vocabulary','「一概には言えない」とはどういう意味ですか。',['単純に断定できない','必ず正しい','すでに決定した'],0,'一概には言えない означает, что нельзя делать общее безусловное утверждение.','一概には言えない means it cannot be stated categorically.'),
      q('grammar','いかなる事情が___、説明責任は免れない。',['あろうとも','あるので','あったから'],0,'いかなる ... あろうとも — формальная уступительная конструкция.','いかなる ... あろうとも is a formal concessive construction.'),
      q('vocabulary','「論拠を明示する」の意味はどれですか。',['根拠をはっきり示す','意見を撤回する','話題を変える'],0,'論拠を明示する означает явно обозначить основания аргумента.','論拠を明示する means to state the grounds for an argument clearly.'),
      q('grammar','その見解は、妥当性を欠くとまでは___。',['言えない','言う','言った'],0,'とまでは言えない означает «нельзя утверждать до такой степени».','とまでは言えない means “one cannot go so far as to say”.'),
      q('reading','読んでください。「筆者は結論を断定せず、複数の解釈の余地を残している。」筆者の態度はどれですか。',['慎重である','断定的である','無関心である'],0,'Автор оставляет пространство для нескольких интерпретаций, значит занимает осторожную позицию.','The author leaves room for several interpretations, showing caution.'),
      q('grammar','議論の余地がない___、検証を省いてよいわけではない。',['からといって','ものの','にしては'],0,'からといって выражает «само по себе это не означает, что…».','からといって means “just because… does not mean”.')
    ]
  }
};

export const COURSE_MINI_PROMPTS = {
  es: ['Describe tu rutina con tres frases.','Explica qué hiciste ayer y qué harás mañana.','Da tu opinión y apóyala con dos razones.','Resume una idea compleja con tus propias palabras.'],
  fr: ['Décris ta journée en trois phrases.','Explique ce que tu as fait hier et ce que tu feras demain.','Donne ton avis et justifie-le par deux raisons.','Résume une idée complexe avec tes propres mots.'],
  it: ['Descrivi la tua giornata in tre frasi.','Spiega che cosa hai fatto ieri e che cosa farai domani.','Esprimi la tua opinione con due motivazioni.','Riassumi un’idea complessa con parole tue.'],
  pt: ['Descreve o teu dia em três frases.','Explica o que fizeste ontem e o que farás amanhã.','Dá a tua opinião e apresenta duas razões.','Resume uma ideia complexa pelas tuas próprias palavras.'],
  pl: ['Opisz swój dzień w trzech zdaniach.','Powiedz, co robiłeś wczoraj i co zrobisz jutro.','Wyraź opinię i uzasadnij ją dwoma argumentami.','Podsumuj złożoną myśl własnymi słowami.'],
  ja: ['今日の予定を三つの文で説明してください。','昨日したことと明日することを説明してください。','自分の意見を述べ、理由を二つ挙げてください。','複雑な考えを自分の言葉で要約してください。']
};

export const COURSE_OBJECTIVES = {
  A1: { ru: 'Закрепить базовые слова и простые конструкции для повседневного общения.', en: 'Build essential vocabulary and simple patterns for everyday communication.' },
  A2: { ru: 'Говорить о прошлом, планах и знакомых ситуациях более связно.', en: 'Talk more confidently about past events, plans and familiar situations.' },
  B1: { ru: 'Объяснять причины, выражать мнение и связывать идеи в самостоятельной речи.', en: 'Explain reasons, express opinions and connect ideas independently.' },
  B2: { ru: 'Точно аргументировать, понимать нюансы и выбирать подходящий регистр.', en: 'Build precise arguments, understand nuance and choose an appropriate register.' },
  C1: { ru: 'Анализировать сложные тексты и выражать тонкие смысловые различия.', en: 'Analyse complex texts and express subtle distinctions in meaning.' },
  C2: { ru: 'Точно использовать лексику, стиль и сложные конструкции в разных контекстах.', en: 'Use vocabulary, register and complex structures precisely across contexts.' }
};

export const COURSE_THEMES = {
  es: {
    A1:['Saludos y presentaciones','La vida cotidiana','Personas y lugares','Situaciones prácticas'],
    A2:['Experiencias y pasado','Planes y comparaciones','La ciudad y los viajes','Conversaciones cotidianas'],
    B1:['Opiniones y argumentos','Trabajo y colaboración','Sociedad y medios','Comunicación autónoma'],
    B2:['Argumentación matizada','Comunicación formal','Problemas complejos','Precisión y estilo'],
    C1:['Análisis y pensamiento crítico','Debate público','Estilo y registro','Comunicación compleja'],
    C2:['Matices del significado','Retórica y precisión','Discursos complejos','Dominio del registro']
  },
  fr: {
    A1:['Saluer et se présenter','La vie quotidienne','Les personnes et les lieux','Les situations pratiques'],
    A2:['Expériences et passé','Projets et comparaisons','La ville et les voyages','Conversations courantes'],
    B1:['Opinions et arguments','Travail et coopération','Société et médias','Communication autonome'],
    B2:['Argumentation nuancée','Communication formelle','Questions complexes','Précision et style'],
    C1:['Analyse et esprit critique','Débat public','Style et registre','Communication complexe'],
    C2:['Nuances du sens','Rhétorique et précision','Discours complexes','Maîtrise du registre']
  },
  it: {
    A1:['Saluti e presentazioni','La vita quotidiana','Persone e luoghi','Situazioni pratiche'],
    A2:['Esperienze e passato','Progetti e confronti','La città e i viaggi','Conversazioni quotidiane'],
    B1:['Opinioni e argomentazioni','Lavoro e collaborazione','Società e media','Comunicazione autonoma'],
    B2:['Argomentazione sfumata','Comunicazione formale','Questioni complesse','Precisione e stile'],
    C1:['Analisi e pensiero critico','Dibattito pubblico','Stile e registro','Comunicazione complessa'],
    C2:['Sfumature di significato','Retorica e precisione','Discorsi complessi','Padronanza del registro']
  },
  pt: {
    A1:['Cumprimentos e apresentações','A vida quotidiana','Pessoas e lugares','Situações práticas'],
    A2:['Experiências e passado','Planos e comparações','A cidade e as viagens','Conversas do dia a dia'],
    B1:['Opiniões e argumentos','Trabalho e colaboração','Sociedade e meios de comunicação','Comunicação autónoma'],
    B2:['Argumentação matizada','Comunicação formal','Questões complexas','Precisão e estilo'],
    C1:['Análise e pensamento crítico','Debate público','Estilo e registo','Comunicação complexa'],
    C2:['Nuances de significado','Retórica e precisão','Discursos complexos','Domínio do registo']
  },
  pl: {
    A1:['Powitania i przedstawianie się','Życie codzienne','Ludzie i miejsca','Sytuacje praktyczne'],
    A2:['Doświadczenia i przeszłość','Plany i porównania','Miasto i podróże','Codzienne rozmowy'],
    B1:['Opinie i argumenty','Praca i współpraca','Społeczeństwo i media','Samodzielna komunikacja'],
    B2:['Precyzyjna argumentacja','Komunikacja formalna','Złożone zagadnienia','Precyzja i styl'],
    C1:['Analiza i krytyczne myślenie','Debata publiczna','Styl i rejestr','Komunikacja złożona'],
    C2:['Odcienie znaczeń','Retoryka i precyzja','Złożone dyskursy','Pełna swoboda stylistyczna']
  },
  ja: {
    A1:['あいさつと自己紹介','毎日の生活','人と場所','身近な場面'],
    A2:['経験と過去','予定と比較','町と旅行','日常会話'],
    B1:['意見と理由','仕事と協力','社会とメディア','自立したコミュニケーション'],
    B2:['細かな議論','フォーマルな表現','複雑な問題','正確さと文体'],
    C1:['分析と思考','公共の議論','文体と語調','複雑なコミュニケーション'],
    C2:['意味の微妙な違い','修辞と正確さ','複雑な論述','高度な表現力']
  }
};

export function getCoursePlacementQuestions(languageCode) {
  const levels = COURSE_QUESTION_BANKS[languageCode];
  if (!levels) return null;
  const questions = [];
  for (const level of ['A1','A2','B1','B2','C1','C2']) {
    levels[level].slice(0,5).forEach((item,index) => {
      questions.push({
        id: languageCode.toUpperCase() + '-P-' + level + '-' + String(index+1).padStart(2,'0'),
        level,
        prompt: item.prompt,
        options: item.options.map((text,optionIndex) => ({ id: ['a','b','c'][optionIndex], text })),
        answer: ['a','b','c'][item.answer]
      });
    });
  }
  return questions;
}

export function getPublicCoursePlacementQuestions(languageCode) {
  const questions = getCoursePlacementQuestions(languageCode);
  return questions ? questions.map(({id,level,prompt,options}) => ({id,level,prompt,options})) : null;
}

export function estimateCourseLevel(languageCode, answers = []) {
  const questions = getCoursePlacementQuestions(languageCode);
  if (!questions || !Array.isArray(answers)) return 'A1';
  const answerMap = new Map(answers.map(item => [item?.id,item?.option_id]));
  let estimated = 'A1';
  for (const level of ['A1','A2','B1','B2','C1','C2']) {
    const band = questions.filter(question => question.level === level);
    const correct = band.filter(question => answerMap.get(question.id) === question.answer).length;
    if (correct < 3) break;
    estimated = level;
  }
  return estimated;
}
