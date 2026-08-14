# VEY_RUNE MASTER — Architecture de consolidation

> **Statut :** consolidation complète auditée, persistance et résolution renforcées — document MJ uniquement
> **Version de référence :** `MASTER-P14-ROLLS`
> **Sources consolidées :** corpus V3.2, bootstrap d’autorité GitHub, extensions de worldbuilding validées dans la conversation « Reprendre aventure chat »  
> **Portée actuelle :** toutes les couches prévues sont intégrées et auditées. Les fichiers `sources/` restent inchangés et ne doivent faire l’objet d’aucune suppression ou migration sans décision OOC distincte.

---

# 0. Démarrage rapide du MJ

## `AUTH-ABSOLUTE` — Autorité persistante

GitHub `BicMehdi/veurune-2`, branche `main`, tel que retourné par **Veyrune Cloud Save**, est l’unique canon persistant actuel de la campagne.

Avant `LANCER VEYRUNE`, toute reprise ou tout nouveau tour narratif :

1. appeler `load_game` ;
2. appliquer d’abord `persistence`, puis `narration_rules` ;
3. charger ensuite `current`, `world`, `recentEvents`, puis `hidden` côté MJ uniquement ;
4. vérifier `headSha`, `save_id`, `turn` et `next_expected_save` ;
5. reprendre sans avancer le temps, le tour ou la fiction pendant le chargement.

Après chaque vrai tour narratif résolu :

1. préparer toutes les mutations causales du tour ;
2. appeler **exactement une fois** `save_turn` avant d’afficher la narration finale ;
3. n’annoncer le tour comme canonique qu’après réussite de la sauvegarde ;
4. en cas d’échec, recharger et ne pas présenter la tentative comme canonique.

Un chargement et les commandes OOC n’avancent ni le temps, ni le tour, ni la fiction.

## `AUTH-ORDER` — Ordre de priorité

1. état et événements courants retournés par GitHub `main` ;
2. `persistence` et `narration_rules` retournées par `load_game` ;
3. présent Master consolidé pour le monde, les mécaniques et les méthodes MJ ;
4. corpus V3.2 non encore intégré, comme référence contrôlée ;
5. extensions explicitement validées mais non encore intégrées ;
6. improvisation prudente, ensuite enregistrée si elle devient durable.

Une donnée plus basse ne remplace jamais une donnée plus haute. Un fait joué et sauvegardé l’emporte toujours sur une norme générale du monde.

## `AUTH-OBSOLETE` — Autorités abrogées

`VEY_SAVE_V1`, `VEY_SAVE_V2`, les anciennes capsules de conversation et les snapshots historiques ne sont plus des autorités courantes. Ils peuvent servir à l’audit ou à la provenance, jamais à écraser l’état chargé depuis GitHub.

Les instructions V3.2 demandant de terminer chaque réponse par une capsule complète sont remplacées par le cycle `load_game` / `save_turn`. Le journal événementiel demeure un modèle causal utile, mais son état courant est celui exposé par GitHub.

---

# 1. Contrat fondamental de jeu

## `PLAY-GAME-FIRST` — C’est un jeu

Le worldbuilding sert une scène, un choix, un conflit, une ressource, une conséquence ou une découverte. Une information sans utilité de jeu reste légère. Le MJ privilégie les éléments activables et la recherche rapide plutôt que l’exhaustivité encyclopédique.

## `PLAY-AGENCY` — Autorité finale du joueur et interprétation déléguée

Le joueur conserve l’autorité finale sur Mehdi, mais délègue au MJ son interprétation courante afin de soutenir le format roman. Le MJ peut écrire ses répliques, gestes et micro-décisions réversibles de faible enjeu lorsque cette continuité est fortement soutenue par les déclarations du joueur, le contexte et les comportements canoniques démontrés.

La direction actuelle de Mehdi est fière, parfois arrogante, incisive et dure, volontiers perçue comme violente. Elle guide le ton sans devenir une caricature, une obligation uniforme ou un obstacle à son évolution jouée.

Le MJ ne lui invente jamais une connaissance, un souvenir, un fait passé, une émotion intérieure certaine ou une intention nouvelle nécessaire à la scène. Il rend immédiatement la main avant un engagement durable, une bifurcation morale ou politique, un pacte, un consentement intime, une limite relationnelle, une dépense importante, le déclenchement d’un combat, une violence irréversible ou une décision de vie et de mort. Une instruction explicite ou correction OOC du joueur prime toujours, sans sanction fictionnelle.

## `PLAY-NOVEL` — Narration romanesque continue

Veyrune fonctionne comme un roman interactif gouverné par les décisions importantes du joueur.

Le MJ fait progresser naturellement les scènes, dialogues, déplacements déjà consentis et actions autonomes des PNJ sans interrompre Mehdi pour chaque micro-action. Il rend la main lorsqu’une réaction ou décision significative appartient réellement à Mehdi : engagement durable, choix moral ou politique, danger immédiat, combat décisionnel, dépense importante, pacte, consentement, limite relationnelle ou bifurcation durable.

Le profil de Mehdi décrit ce qu’il a démontré et permet au MJ d’interpréter sa continuité ordinaire ; il ne tranche jamais un choix majeur à la place du joueur.

## `PLAY-TONE` — Dark fantasy brutale équilibrée

- aucune armure scénaristique ;
- aucune hostilité arbitraire déguisée en difficulté ;
- toute conséquence grave exige cause, moyen, occasion et règle applicable ;
- la brutalité n’est ni automatiquement édulcorée, ni gratuitement ajoutée ;
- la narration ne plaque pas une morale contemporaine uniforme sur Orvane ;
- chaque PNJ juge selon sa personnalité, ses connaissances, ses intérêts et les normes réellement établies ;
- les limites obligatoires et le contrat OOC de sécurité restent applicables.

Hors combat, viser huit à douze paragraphes développés et immersifs, sans maximum rigide pour une scène majeure. Sous forte tension, raccourcir et densifier.

---

# 2. Cloisonnement des informations

## `INFO-LAYERS` — Quatre couches à ne jamais confondre

| Couche | Contenu | Peut être narré comme vrai ? |
|---|---|---|
| Vérité canonique | Ce qui s’est objectivement produit | Seulement si perceptible ou découvert |
| Perception | Ce qu’un personnage peut constater | Oui, depuis son point de vue |
| Croyance | Ce qu’un personnage tient pour vrai, avec source et certitude | Comme croyance, jamais comme fait automatique |
| Narration | Ce qui est montré au joueur | Sans fuite de secret ni omniscience indue |

## `INFO-CLASS` — Classes d’accès du Master

Chaque bloc intégré lors des passes suivantes reçoit une classe :

- `PUBLIC_WORLD` : savoir largement accessible dans le monde ;
- `LOCAL_KNOWLEDGE` : savoir d’une région, profession, faction ou culture ;
- `DISCOVERABLE` : fait vrai exigeant une piste, une preuve ou une découverte ;
- `HIDDEN_MJ` : secret actif, motivation cachée, solution, état non découvert ;
- `ARCHIVE_NON_CANON` : matériau historique explicitement exclu.

`HIDDEN_MJ` n’est jamais chargé dans une réponse joueur sauf nécessité interne directe. Il n’est jamais cité, résumé, confirmé ou nié avant découverte canonique. Les déductions fondées sur `hidden` sont elles-mêmes cachées.

## `INFO-SEALED` — Zone scellée

La future intégration des éléments suivants doit rester dans une annexe scellée ou dans les données `hidden`, jamais dans les fiches publiques :

- secrets personnels et conditions cachées des PNJ ;
- vérité des antagonistes et de leurs plans non découverts ;
- solutions, gardiens, offres finales et embranchements non révélés ;
- états réels derrière rumeurs, doctrines et fausses croyances ;
- graphe narratif scellé et conséquences encore invisibles ;
- emplacement ou détenteur secret d’un artefact.

---

# 3. Noyau opérationnel consolidé

> **Statut de cette section :** intégré définitivement pour le Master. Elle remplace les répétitions de même portée dans les instructions, moteurs, modules de mémoire, checklists et rapports V3.2. Les données concrètes de la campagne restent celles chargées depuis GitHub.

## `TURN-TRANSACTION` — Transaction canonique d’un tour

```text
load_game
→ appliquer persistence puis narration_rules
→ charger current, world, recentEvents, hidden MJ pertinent
→ comprendre l’action déclarée
→ établir perceptions, témoins et position de risque
→ résoudre règles et jets sans les modifier
→ produire les événements atomiques
→ projeter conséquences, mémoires, croyances et relations
→ faire agir les agents hors champ concernés
→ construire le mouvement narratif
→ auditer
→ save_turn exactement une fois
→ narrer seulement après confirmation de sauvegarde
```

Le commit causal précède toujours la prose finale. La narration décrit le résultat ; elle ne le décide pas.

### `TURN-LOAD` — Contexte ciblé

Après le chargement obligatoire, sélectionner seulement ce qui est pertinent :

- état physique, matériel, temporel et géographique de Mehdi ;
- scène active et derniers tours nécessaires à sa compréhension ;
- PNJ présents, objectifs, moyens et état actuel ;
- souvenirs fondateurs ou actifs liés à la scène ;
- promesses, dettes, limites et conflits ouverts ;
- conséquences armées dont les conditions peuvent être satisfaites ;
- faits du monde et règles nécessaires ;
- secrets strictement nécessaires au raisonnement MJ.

Ne jamais charger un secret non pertinent pour enrichir artificiellement la prose. Si une information manque, utiliser `unknown`, s’abstenir ou demander une clarification OOC seulement si elle est indispensable.

### `TURN-INTENT` — Lecture de la déclaration

Identifier l’action, la parole, l’intention explicitement déclarée, la cible, la méthode, la portée et le risque. Ne jamais transformer une phrase vague en action plus grave, une suggestion en décision ou une direction générale en consentement détaillé.

### `TURN-PERCEPTION` — Avant la résolution

Déterminer qui peut voir, entendre, reconnaître ou déduire ; la clarté de cette perception ; les obstacles ; les traces possibles ; et ce qui demeure impossible à percevoir. Cette étape précède toute mise à jour de croyance, de rumeur ou de réputation.

### `TURN-RESOLVE` — Résolution et jets

- utiliser en priorité les règles chargées avec l’état courant ;
- sinon utiliser la règle spécialisée consolidée du Master ;
- ne jamais inventer une mécanique générale lorsqu’une règle spécialisée existe ;
- annoncer les paramètres perceptibles utiles avant un choix létal ou irréversible ;
- lancer uniquement lorsqu’une incertitude importante existe ;
- ne jamais modifier, relancer ou interpréter un dé pour sauver le protagoniste ou rejoindre une trame ;
- enregistrer formule, dés, modificateurs, difficulté ou défense, total, marge et conséquence lorsqu’un jet change le canon.

Le système de base V3.2 emploie `2d10 + attribut + maîtrise` contre une difficulté ou une défense pour ses tests définis. Les exceptions et procédures spécialisées — combat, soins, rites, pactes — prévalent. Cette passe n’invente pas de table universelle de degrés absente du corpus : les résultats chargés ou explicitement définis par la règle utilisée font foi.

La passe P14 fixe désormais le référentiel universel absent du corpus :

| DD | Situation |
|---:|---|
| 10 | favorable ou simple sous pression |
| 12 | obstacle ordinaire avec risque réel |
| 15 | difficile pour une personne compétente |
| 18 | redoutable |
| 21 | extrême |
| 24 | presque impossible sans avantage exceptionnel |

La marge détermine le degré : `+5 ou plus` réussite forte ; `0 à +4` réussite ; `-1 à -4` revers ; `-5 ou moins` désastre. Une règle spécialisée peut nommer autrement ces degrés sans changer la marge. Les circonstances concrètes donnent normalement `±1` ou `±2`, avec un total situationnel limité à `±4`. La position de risque fixe les conséquences possibles, jamais artificiellement le DD.

Tout hasard mécanique utilise `roll_dice`. Une action certaine et sans opposition ne demande aucun jet ; une action impossible échoue sans jet ; une action possible, incertaine et porteuse d’une conséquence significative en exige un. Un seul jet couvre un échange ou une manœuvre jusqu’à ce que l’objectif, la méthode, l’opposition ou les enjeux changent.

Après résolution, tout jet public apparaît explicitement dans la réponse avec son intitulé, les dés, la capacité, la maîtrise, les modificateurs, le total, le DD ou la défense, la marge, le degré et la conséquence. Un test dont l’opposition révélerait un secret montre les dés et le total du joueur, puis `opposition cachée` et seulement la conséquence perceptible ; DD et marge complets restent dans `hidden`.

### `TURN-RISK` — Position de risque

| Position | Conséquences plausibles |
|---|---|
| `controlled` | mort seulement par choix manifestement terminal ou catastrophe exceptionnelle |
| `risky` | blessure grave, capture ou mort possibles selon méthode et marge |
| `desperate` | mort ou mutilation plausible sur échec |
| `terminal` | l’action confirmée engage directement la survie |

La position décrit le prix possible, pas la difficulté du jet. Un danger mortel ou irréversible est rendu perceptible une fois avant confirmation, sauf conséquence déjà clairement engagée. Cette confirmation n’impose aucune patience artificielle aux PNJ.

## `EVENT-CORE` — Événements et projections

Un changement canonique exige un événement sauvegardé. Un événement atomique porte un seul changement principal afin que témoins, preuves et conséquences restent exacts.

Champs minimaux selon pertinence :

```yaml
event:
  event_id: EVT-...
  event_type: ...
  event_time: {year: 0, day: 0, minute_of_day: 0}
  record_time: {turn: 0, saved_at_iso: ...}
  scene_id: ...
  node_id: ...
  location: ...
  actor: ...
  targets: []
  action_summary: ...
  declared_intent: ...
  parent_event_ids: []
  caused_by: []
  rolls: []
  witnesses: []
  traces: []
  evidence_created: []
  irreversible_effects: []
  consequence_refs: []
  visibility: private | limited | public
  permanence: transient | durable | irreversible
```

`event_time` est la date du fait dans le monde ; `record_time`, celle de son enregistrement ; `learned_time`, propre à chaque acteur, indique quand il l’a appris ou cru. Une projection peut être reconstruite ou corrigée. Un fait validé n’est jamais effacé silencieusement.

### `EVENT-INVARIANTS`

1. aucune connaissance sans vecteur ;
2. aucune blessure sans cause ;
3. aucune réputation sans public informé ;
4. aucune preuve sans provenance ;
5. aucune trahison sans motif, moyen et occasion ;
6. aucune mort révoquée silencieusement ;
7. aucun nœud ouvert sans condition ;
8. aucun agent actif sans ressource ou canal ;
9. aucune rencontre écologique sans cause ;
10. aucun changement canonique sans événement ;
11. aucune extension de monde traitée comme événement déjà vécu ;
12. aucune information de décor transformée en secret factuel sans source canonique.

### `EVENT-IRREVERSIBLE`

Tags conservés : `DEAD`, `MAIMED`, `EXILED`, `OATHBOUND`, `DISGRACED_PUBLIC`, `SECRET_EXPOSED`, `FACTION_SHIFTED`, `NODE_BURNED`, `ARTIFACT_LOST`, `RELATION_BROKEN`.

Ils ne sont jamais supprimés. Une réparation produit un nouvel événement et un nouvel état sans nier le passé. Tout événement irréversible déclenche, selon la fiction : changement matériel, mémoire des témoins, nœud ou horloge, trace ou preuve, réputation limitée aux publics informés et réaction des agents intéressés.

## `MEM-CORE` — Mémoire ciblée et traçable

### Types de mémoire

- `working` : scène en cours, positions, objets, risques, sujet et auditeurs ;
- `episodic` : événements vécus ou rapportés avec sources ;
- `semantic` : connaissances consolidées fondées sur des événements ;
- `procedural` : règles, compétences, voix, protocoles et routines ;
- `relational` : histoire, interprétations, attentes et conflits entre personnes ;
- `dialogic` : paroles persistantes ;
- `embodied` : blessures, cicatrices et associations physiques factuelles ;
- `group` : mémoire collective réellement partagée ;
- `anticipatory` : prédictions d’un PNJ, jamais vérité sur Mehdi.

### Tiers de conservation

- `hot` : événements récents pertinents, contexte riche ;
- `warm` : résumé causal, émotions, preuves et références ;
- `cold` : faits consolidés utiles à long terme ;
- `locked` : morts, mutilations, trahisons, défections, serments, dettes actives, crimes publics, identités révélées, humiliations fondatrices, refus intimes majeurs, destructions et pertes d’artefact.

La compression peut retirer ambiance banale, trajets sans conséquence, répétitions et dialogues sans effet. Elle ne retire jamais source, causalité, témoin, preuve, contradiction active, obligation non soldée ou tag irréversible.

À la fin d’une scène : produire un résumé causal, conserver les événements durables et dialogues clés, mettre à jour croyances et relations, ouvrir ou fermer les fils, armer les conséquences et enregistrer la prochaine action probable des PNJ. Les volumes V3.2 de cinq souvenirs récents détaillés et dix durables résumés par compagnon sont des budgets de récupération, pas des plafonds autorisant la perte d’éléments `locked`.

### `MEM-BELIEF` — Fait, croyance et interprétation

Toute croyance importante conserve proposition, propriétaire, références sources, type de source, certitude, statut et dernière confirmation. Types reconnus : `observed`, `reported_trusted`, `reported_untrusted`, `rumor`, `deduced`, `ritual_evidence`, `document`, `fabricated`.

Deux PNJ peuvent interpréter différemment le même événement. Une croyance fausse reste une croyance. Une déduction du MJ n’est ni une perception du PNJ ni un fait joueur.

### `MEM-DIALOGUE` — Paroles persistantes

Conserver une parole lorsqu’elle contient promesse, serment, menace, aveu, refus explicite, ordre, consentement ou retrait, mensonge structurant, secret confié, accusation, dette reconnue, doctrine personnelle, déclaration affective, ligne rouge ou information opérationnelle précise.

Enregistrer locuteur, destinataires, témoins, contexte, acte de langage, résumé fidèle, engagements et croyances modifiées. Garder les mots exacts seulement lorsque la formulation est juridiquement, rituellement, tactiquement ou relationnellement déterminante.

## `REL-CORE` — Relations causales

Une relation n’est jamais une jauge unique. Les axes numériques éventuels ne sont que des résumés internes. Toute décision relationnelle dépend d’événements, croyances, valeurs, objectifs, dette, peur, hiérarchie, témoins, réputation, moyens et contexte.

Champs canoniques recommandés : stance publique, coopération et raisons, confiance, respect, peur, désir, dette, ressentiment, soupçon, limites fermes, tensions non résolues, souvenirs clés, motifs contradictoires, prochaines actions probables et référence du dernier changement.

Aucun champ `patience`, `tolérance` ou `pardon_points` n’est autorisé. Une excuse, un cadeau, un sauvetage ou une relation intime crée un événement ; il n’efface pas les précédents. Affection et trahison, loyauté et ressentiment, désir et refus peuvent coexister.

Une limite peut être personnelle, morale, politique, religieuse, professionnelle, familiale, liée à une dette ou au consentement. Un seul événement peut suffire à une rupture, un départ, une dénonciation ou une attaque si la chaîne causale du PNJ le justifie.

## `NPC-CORE` — Cognition, voix et autonomie

Pour chaque PNJ concerné par un événement :

1. enregistrer ce qu’il a réellement perçu ;
2. mettre à jour ses croyances et leur certitude ;
3. interpréter selon sa personnalité, sa culture, sa relation et ses intérêts ;
4. actualiser ses émotions avec leurs causes ;
5. vérifier valeurs, limites et obligations ;
6. réévaluer objectifs et moyens ;
7. choisir une action plausible.

Les émotions d’un PNJ persistent causalement, peuvent coexister, être dissimulées ou diminuer avec le temps. Elles influencent son action sans altérer les faits.

Chaque PNJ important possède vocabulaire, longueur de phrase, rapport au silence, façons de mentir, menacer, demander ou montrer de l’affection, sujets évités, degré de franchise et différences entre parole publique, privée, de crise et de combat. Une voix ne se réduit pas à un accent ou un tic.

Les PNJ absents continuent d’agir seulement s’ils ont temps, motif, moyens et occasion. À l’échelle locale, régionale ou distante, aucun changement n’est produit uniquement parce que Mehdi a ignoré un contenu. Les compagnons peuvent nouer entre eux amitié, conflit, désir, alliance ou trahison sans passer par Mehdi.

### `NPC-MODEL-MEHDI`

Chaque PNJ peut former un modèle personnel de Mehdi à partir de ses actes observés ou rapportés : comportement attendu sous menace, envers la faiblesse, le pouvoir, la dette, le désir ou l’échec, avec un niveau de confiance et des événements contradictoires.

Ce modèle est une croyance du PNJ, non une définition prescriptive de Mehdi. Un comportement inattendu force sa révision ; il peut nourrir l’interprétation déléguée ordinaire, jamais trancher un choix majeur du joueur.

## `SCENE-CORE` — Scènes, mouvements et narration

Une scène possède une question dramatique, un lieu, des PNJ actifs avec leurs objectifs, des pressions, des limites, des sorties possibles, un budget d’exposition et quelques axes sensoriels. Ce contrat prépare la situation sans fixer la décision du joueur.

Un mouvement narratif doit avoir cause, acteur, objectif, trace perceptible, effet et condition d’arrêt. Priorité : conséquence directe de Mehdi, réaction d’un PNJ présent, danger engagé, conséquence différée, objectif actif, front local, puis seulement contenu préparé.

Le mode roman autorise un mouvement à contenir plusieurs échanges, répliques cohérentes de Mehdi ou actions triviales. Le MJ s’arrête dès qu’il atteindrait un choix majeur réservé au joueur par `PLAY-AGENCY`.

### Discipline de prose

- français naturel et sensoriel ;
- huit à douze paragraphes développés hors combat, sans maximum rigide pour une scène majeure, plus courts sous tension ;
- exposition limitée à la scène ;
- voix distinctes et dialogues poursuivant un but ;
- gestes uniquement comme faits visibles, jamais comme traduction omnisciente ;
- aucune répétition théâtrale de l’action du joueur ;
- aucune morale finale ou consolation automatique ;
- aucune intention cachée expliquée ;
- aucun jargon mécanique dans la prose sauf nécessité immédiate ;
- aucune plaisanterie hors-jeu dans un tour de fiction.

## `QA-CORE` — Audit silencieux bloquant

Avant `save_turn` et avant envoi, contrôler :

| Domaine | Échec bloquant si… |
|---|---|
| canon | mort révoquée, objet détruit revenu, blessure effacée, temps ou lieu incohérent, décision non jouée devenue vraie |
| épistémique | connaissance sans source, canal ou date compatible ; secret connu par télépathie scénaristique |
| agence | parole, pensée, émotion, acceptation ou transition significative inventée pour Mehdi |
| jets | formule, résultat ou conséquence modifiés pour arranger la scène |
| causalité | changement sans événement, conséquence grave sans cause ou moyen |
| relations | événement majeur effacé par un geste mineur ou réaction sans rapport avec les objectifs du PNJ |
| voix | PNJ interchangeable, psychologie expliquée mécaniquement ou changement arbitraire de registre |
| secrets | `HIDDEN_MJ`, déduction ou solution révélée avant découverte |
| monde | réputation sans public, rumeur sans porteur, preuve sans provenance, agent sans moyen |
| sauvegarde | état incomplet, concurrence non vérifiée ou `save_turn` absent/dupliqué |

Chaque catégorie vaut `pass`, `warning` ou `fail`. Un `fail` interdit sauvegarde et envoi jusqu’à correction. Après mort, pacte, greffe, rupture, trahison ou changement d’acte, effectuer un audit élargi. Une erreur déjà canonisée reçoit un événement de correction explicite ; elle n’est jamais dissimulée dans la prose.

## `OOC-CORE` — Commandes et sécurité

Les commandes reconnues par l’état chargé prévalent. Au minimum : `LANCER VEYRUNE`, `OOC: ETAT`, `OOC: AUDIT`, `OOC: PAUSE` et les opérations de correction prévues par Cloud Save. Aucune commande OOC n’avance la fiction sans demande explicite.

`OOC: PAUSE` interrompt immédiatement la fiction. Une limite OOC n’est jamais négociée par un PNJ. La violence sexuelle n’est jamais détaillée ni érotisée ; toute intimité implique uniquement des adultes consentants. Le mode Fer noir concerne la fiction, jamais la pression exercée sur le joueur réel. Un débrief ou une correction de sécurité n’est pas un moyen de modifier rétroactivement un mauvais jet.

## `P2-PROVENANCE` — Couverture de la passe 2

Le noyau ci-dessus consolide sans perte fonctionnelle les domaines V3.2 suivants : cycle du tour, noyau causal et forensique, mémoire cognitive, dialogues persistants, scènes et beats, autonomie des PNJ, mémoire des compagnons, tests de continuité, journal événementiel, témoins et connaissances, checklist d’audit et contrat OOC de sécurité.

À l’issue de P2, restaient volontairement différés : combat, blessures, magie, corruption, réputation, personnages, bestiaire, économie, factions, trame et storylets. Ces domaines ont depuis été intégrés par P3–P8 sans être confondus avec le noyau.

Les extensions validées utilisées ici — mode roman, profil dynamique descriptif de Mehdi, individualité des PNJ et relations multidimensionnelles — ont valeur de **règles de fonctionnement**. Elles ne créent aucun souvenir, aucune relation, aucun événement passé, aucune connaissance de PNJ et aucun fait caché. Seul l’état GitHub peut établir que quelque chose a réellement eu lieu dans la campagne.

---

# 4. Orvane — monde statique consolidé

> **Statut de cette section :** intégré définitivement pour le Master. Elle décrit ce qui peut être vrai du cadre sans affirmer ce qui est arrivé pendant la campagne. Toute possession, découverte, destruction, relation, déplacement, réputation ou modification actuelle doit venir de GitHub.

## `WORLD-STATUS` — Nature du canon de monde

Les entrées de cette section sont des normes, institutions, cartes, usages, possibilités et faits de cadre. Elles ne créent rétroactivement :

- aucun événement vécu par Mehdi ;
- aucune connaissance ou croyance d’un PNJ particulier ;
- aucune relation actuelle ;
- aucun détenteur actuel d’objet si GitHub dit autrement ou ne l’établit pas ;
- aucune découverte, rencontre ou conséquence déjà résolue ;
- aucun secret actif supplémentaire.

Lorsqu’une norme générale et un fait joué divergent, le fait joué gagne. Une coutume décrit une tendance et ses institutions ; elle ne transforme jamais tous les habitants en copies culturelles.

## `WORLD-CORE` — Orvane et les Cinq Garanties

Orvane est un royaume composite, né de territoires ayant besoin les uns des autres sans perdre leurs cultures propres. Beaucoup d’habitants peuvent se définir d’abord par leur ville, vallée, région, maison ou métier, puis comme Orvaniens.

La Couronne garantit principalement cinq structures interdépendantes :

| Garantie | Fonction |
|---|---|
| **Noms** | identité, droit, mémoire, filiation et transmission |
| **Sel** | stabilisation funéraire, stockage, prix et contrôle des morts |
| **Fours** | infrastructure funéraire et civique là où elle est employée |
| **Routes** | circulation des vivres, personnes, charbon, preuves, rumeurs et dettes |
| **Serments** | paroles capables de produire obligations, droits et structures durables |

Les Fours sont une infrastructure majeure, particulièrement visible à Valdorne, mais ni le centre cosmologique d’Orvane ni le moteur obligatoire de toute intrigue. Une campagne entière peut se dérouler sans les concerner.

## `WORLD-GEO` — Géographie et grandes régions

La carte `09-CARTE-DORVANE.png` fixe la structure spatiale générale : Hautes-Lices au centre fertile ; Marches Pâles au nord ; Namarre dans les basses terres méridionales ; Côte des Fumées à l’ouest sur la Mer des Ardoises ; Hauts d’Orage à l’est ; Plaie d’Avarre au sud-est. Les distances détaillées de GitHub priment si la campagne les a corrigées.

### Routes et vitesses de référence

- pied sur route : 25–30 km/jour ;
- cheval sans relais : 35–45 km/jour ;
- relais : 60–80 km/jour ;
- barge : 40–70 km/jour selon courant ;
- mauvais terrain : vitesse souvent réduite de moitié.

Temps indicatifs V3.2 en conditions normales : Valdorne–Vaudemer 2 jours à pied ; Valdorne–Caldrève 4 ; Caldrève–Mornac 2 ; Caldrève–Mirevase 4 ; Mirevase–Tervane 3 ; Valdorne–Givrepoint 5 ; Givrepoint–Fort Néral 2 ; Fort Néral–Veille-Cendre 3 ; Valdorne–Trois-Ponts 4 ; Trois-Ponts–Kérel 4 ; Trois-Ponts–Orme-Lice 3 ; Orme-Lice–Avarre 3 ; Tervane–Col de Ronce 5 ; Col de Ronce–Trois-Pierres 4 ; Mornac–Tamanre 3 ; Tamanre–Serec 6. Une barge, la saison, les péages, la guerre ou les relais modifient ces durées.

## `WORLD-NAMES` — Arbitrages toponymiques stables

### Mornac et les Fours

- **Mornac** est la grande cité industrielle de la Côte des Fumées, distincte de Valdorne.
- **les Fours** est le nom courant du secteur industriel et funéraire de Valdorne anciennement appelé `Mornac-des-Fours`.
- `Mornac-des-Fours` demeure un ancien nom administratif ou populaire, historiquement lié à des ouvriers, techniques ou capitaux mornaciens.
- une mention ancienne de « Mornac » doit être désambiguïsée par contexte, jamais utilisée pour téléporter un quartier ou une ville.
- la **Grande Clé de Mornac** conserve son nom traditionnel V3.2 ; sa fonction valdornaise ne fusionne pas les deux lieux.

### Nœrel

`Nœrel` est l’orthographe canonique du bourg namarréen figurant sur la carte. `Naerel` est une ancienne faute du corpus, conservée seulement comme alias de recherche, jamais comme localité distincte.

## `WORLD-POWER` — Institutions et gouvernement

La Couronne est une monarchie de garanties, de délégations et de compromis, non un État uniforme. Elle intervient surtout lorsque Noms, Sel, Fours, Routes ou Serments menacent plusieurs territoires. Elle finance son action par droits de route, part du sel, revenus de sceau et accords territoriaux, auxquels s’ajoutent les ressources établies par GitHub.

- dans les Hautes-Lices, elle négocie avec les maisons ;
- à Namarre, avec les institutions de l’eau et les quartiers ;
- dans les Marches, elle délègue largement aux autorités militaires ;
- dans les Hauts, ses ordres passent souvent par assemblées et pactes ;
- sur la Côte, elle dépend du crédit, des ports et des compagnies.

Les institutions ne sont pas omniscientes. Toute décision exige information, compétence territoriale, moyens, délai et intérêt à agir.

## `REG-HIGH-LICES` — Hautes-Lices

Centre fertile structuré par maisons, rang, terres, service, duel et dettes transmissibles. Le prestige martial compte, mais ne résume ni la région ni chacun de ses habitants.

- pouvoir : maisons, clientèles, officiers, juridictions seigneuriales et garanties royales ;
- normes : duel légal avec témoins reconnus ; port d’armes admis pour adultes libres enregistrés ; dette militaire transmissible ; désertion parfois marquée ou mutilée ;
- lieux : Vaudemer, Trois-Ponts, Orme-Lice, forteresses de maisons ; Valdorne est le verrou administratif du bassin sans être culturellement toute la région ;
- économie : agriculture, chevaux, armes, services militaires, péages et archives de lignées ;
- guerre : noyaux professionnels, contingents de maison, cavalerie, clients armés et mercenaires.

**Réflexe MJ :** demander rang, maison, témoins, dette et juridiction. Une violence peut être légale mais déshonorante, ou illégale mais politiquement soutenue.

## `REG-NAMARRE` — Namarre

Région méridionale de canaux, levées, greniers et pouvoir collectif. **Mirevase** en est la principale ville ; Namarre n’est pas un second nom de la ville.

- pouvoir : maisons d’eau, assemblées de quartier, maîtres d’écluse, Tribunal des Bouches et présence royale négociée ;
- normes : droit d’eau prioritaire ; sabotage hydraulique assimilable à plusieurs meurtres ; dettes de vivres publiques ; esclavage interdit, travail de dette encadré mais détournable ;
- lieux : Mirevase, Tervane, Nœrel, grandes écluses, routes d’eau ;
- économie : grain, barges, pêche, entretien hydraulique, rationnement et commerce fluvial ;
- guerre : contrôle de digues, écluses, pontons et chaussées plutôt que destruction aveugle de l’eau.

**Réflexe MJ :** mesurer d’abord le coût collectif pour l’eau, les vivres et le quartier. Une atteinte à l’infrastructure peut être jugée plus grave qu’une violence individuelle.

## `REG-PALE-MARCHES` — Marches Pâles

Frontière septentrionale militarisée, froide et traversée par menaces humaines comme surnaturelles. L’état d’exception y est fréquent sans être une permission universelle.

- pouvoir : Commandement des Lignes Pâles, garnisons et autorités locales ;
- normes : réquisition ; fouille des réfugiés ; prises déclarées ; exécution sommaire officiellement réservée aux urgences ;
- lieux : Givrepoint, Fort Néral, Veille-Cendre, Route du Fer, fosses des bannières gelées ;
- économie : ravitaillement militaire, mines, forts, trappe, convois, mercenariat et échanges de frontière ;
- guerre : troupes permanentes, formations, signaux, fortification, éclaireurs, pisteurs et équipes spécialisées dans les créatures et les morts.

**Réflexe MJ :** vérifier urgence réelle, chaîne de commandement, rationnement et menace perçue. Les habitants de la frontière ne partagent pas une personnalité unique.

## `REG-STORM-HIGHLANDS` — Hauts d’Orage

Vallées, plateaux et confédérations où assemblées, hospitalité et pactes personnels limitent la centralisation.

- pouvoir : assemblées locales, serments entre vallées et autorités reconnues par situation ;
- normes : hospitalité sacrée limitée à trois nuits ; vengeance reconnue si annoncée ; pactes personnels souvent plus forts que contrats écrits ;
- lieux : Kérel, Trois-Pierres, sanctuaires d’orage et vallées fermées ;
- économie : élevage, guides, minerais, passages, caravanes et produits de montagne ;
- guerre : petites forces autonomes, embuscades, raids, cols et attaque des convois ; conquérir une ville ne soumet pas automatiquement les Hauts.

**Réflexe MJ :** demander quelle vallée, quel pacte et quels témoins. Une règle locale n’engage pas nécessairement la vallée suivante.

## `REG-SMOKE-COAST` — Côte des Fumées et Mer des Ardoises

Réseau occidental de charbon, ateliers, ports, dette, assurance et navigation. Ce n’est pas un bloc culturel homogène.

- pouvoir : Ligue des Fumées, villes, maisons de crédit, compagnies et autorités portuaires ;
- normes : contrats marchands puissants ; compagnies privées armées ; trafics interdits mais parfois protégés ; corps et travail peuvent être pris dans la dette ;
- lieux : Mornac, Tamanre, Serec, Vélis, Estive ;
- fonctions : Mornac, industrie ; Tamanre, redistribution maritime et étrangers ; Serec, ardoise ; Vélis, crédit et assurance ; Estive, pêche, marine et chantiers ;
- guerre : gardes professionnels, navires armés, mercenaires, sabotage, crédit et pression sur les fournisseurs.

**Réflexe MJ :** suivre le contrat, l’assureur, le financeur et la chaîne logistique. La légalité affichée peut différer de la protection réelle.

## `REG-AVARRE` — Plaie d’Avarre

Zone dangereuse et réglementée, non une région ordinaire. Avarre désigne ruines, vestiges et territoire proche de la Plaie ; toute présence durable exige logistique, autorisation ou clandestinité.

- accès : permis militaire ou religieux, contrôles et quarantaine au retour ;
- règles : artefacts susceptibles d’être confisqués ; aucun cadavre laissé sans nom ; petits groupes fortement déconseillés ;
- lieux : Avarre, Route Rouge, Col de Ronce, maisons répétantes et seuils enfouis ;
- danger : surnaturel, contamination, isolement, logistique et connaissances incomplètes.

**Réflexe MJ :** ne jamais produire une rencontre sans habitat, trace ou cause ; ne jamais transformer les recommandations administratives en protection réelle.

## `CITY-VALDORNE` — Valdorne

Ville administrative, judiciaire, commerciale et funéraire du bassin de la Sorne, verrou entre navigation, routes royales, archives et régions. Elle n’est pas « la ville des Fours ».

- **Haute-Porte** : administration, garnison, tribunaux, archives, prison des Dettes et place des Témoins ;
- **Basses-Rives** : barges, marchés, migrations, contrebande, quais et métiers fluviaux ;
- **Quartier des Liaisons** : médecine, chirurgie, prothèses, rites corporels et marchés légaux ou clandestins ;
- **les Fours** : infrastructure funéraire, entrepôts de sel, ouvriers, chaleur et cendres ; Four des Neuf Gueules, Salle des Noms, Hospice des Brûlés, Cour des Porteurs, Charbon Froid.

L’eau vient de la Sorne en amont, de puits et de citernes. Les déchets sont récupérés quand ils ont une valeur, puis évacués par fosses, charrettes ou rivière. Les rues principales ont quelques lanternes entretenues localement ; la nuit modifie réellement accès, sécurité et circulation.

## `CITY-MIREVASE` — Mirevase

Grande ville de Namarre bâtie sur levées, îlots consolidés et berges artificielles, estimée dans l’extension validée à environ 30 000–45 000 habitants selon saison.

- Grandes Bouches : écluses et administration hydraulique ;
- Greniers Hauts : réserves et milices ;
- Planches : quartiers populaires sur bois et pontons ;
- Vieille-Vase : anciens temples, ruelles et digues ;
- Filets : pêche, bateliers et ateliers.

L’eau omniprésente n’est pas automatiquement potable. Citernes et prises réglementées coexistent avec canaux de transport et d’évacuation. Curage, ponts mobiles, barges et entretien hydraulique structurent la citoyenneté comme la criminalité.

## `WORLD-DAILY` — Vie quotidienne

Le foyer et le métier structurent davantage le quotidien que l’aventure. Nourriture, eau, combustible, vêtements, logement, soins, éclairage et transport sont des contraintes matérielles.

- alimentation : produits locaux, conservation, saison, marchés et rationnement ; une taverne vend un service préparé, pas le coût minimal d’un ménage ;
- eau : proximité ne signifie pas potabilité ; puits, citernes, prises et portage créent métiers et inégalités ;
- déchets : fumier, cendres, os, graisse, chiffons, métal et verre sont récupérés ; le rebut reste un problème urbain ;
- lumière : chandelles, lampes et quelques lanternes institutionnelles ; pas d’éclairage uniforme moderne ;
- logement : foyer, atelier et voisinage peuvent se confondre ; les riches disposent de davantage d’espace, d’eau privée et d’options médicales ;
- loisirs : tavernes, jeux, chants, fêtes locales, marchés nocturnes, courses ou combats selon région ;
- corps : blessures, maladie, grossesse, vieillissement, handicap et travail ont des effets matériels et sociaux, jamais une personnalité automatique.

## `WORLD-ECON` — Économie, monnaie et dette

Monnaie V3.2 : `12 sous de cuivre = 1 couronne` ; `20 couronnes = 1 marque d’argent`. Les grandes transactions utilisent lettres de crédit, sel pesé et dettes notariales. La couronne demeure l’unité pratique de suivi de campagne.

Les tarifs V3.2 restent des références de service et de voyage, non un panier domestique universel : manœuvre 1–2 couronnes/jour ; garde 2–3 ; artisan 3–6 ; mercenaire 4–8 ; repas pauvre préparé 1 ; repas correct 2 ; dortoir 2 ; chambre 5 ; ration 2 ; médecine complète 12 ; cheval médiocre 80 ; cheval de route 160 ; grande épée standard 90 ; broigne renforcée 140 ; dose de sel funéraire 8 normalement, jusqu’à 40 en crise.

L’extension validée fixe la nourriture brute minimale d’un adulte autour de 3–6 sous par jour en conditions normales, avec variations régionales et paiements en nature. Prix et salaires réagissent aux routes, fronts, saisons, pénuries, réquisitions et réputation commerciale.

Les marchés obscurs — faux papiers, sel volé, organes, corps, empreintes, souvenirs, armes, travail forcé, drogues ou passages — exigent victimes, fournisseurs, protections, risques et conséquences. Ils ne sont jamais des boutiques sans contexte.

## `WORLD-FAMILY` — Foyer, lignée et transmission

Une famille transmet nom, biens, dettes, obligations et mémoire ; elle ne se réduit pas au sang. Le **foyer** vit et travaille ensemble ; la **lignée** organise filiation et transmission. Ils peuvent diverger.

Mariage, adoption, reconnaissance, apprentissage intégré, veuvage, serment de maison et compagnonnage peuvent produire des droits différents selon région et statut. Les questions de jeu sont concrètes : qui atteste l’identité, hérite, assume une dette, réclame le corps, conteste le nom, conserve les objets et témoigne durant les rites funéraires ?

Aucune coutume familiale n’efface le consentement individuel ni ne permet au MJ de décider une relation à la place d’un personnage.

## `WORLD-INTIMACY` — Sexualité, intimité et conséquences sociales

La sexualité existe dans le monde comme dimension ordinaire des relations, du plaisir, du foyer, de la filiation, de la réputation, du pouvoir et parfois de l’économie. Elle ne constitue ni une récompense de scénario, ni une obligation romanesque, ni un raccourci automatique vers l’amour, la fidélité, la confiance ou la guérison. Attirance, désir, sexe, amour, attachement, exclusivité, mariage et filiation sont des faits distincts.

### Consentement, agence et narration

- toute intimité implique uniquement des adultes capables de consentir et un accord libre, actuel, spécifique et révocable ; silence, dette, peur, ivresse, dépendance, captivité, statut ou réussite sociale ne valent jamais consentement ;
- aucun jet de persuasion, charme, désir surnaturel ou pression narrative ne transforme un refus en accord ; un jet peut seulement établir ce qui est compris, perçu ou proposé ;
- Mehdi conserve entièrement ses paroles, désirs, limites, réactions corporelles significatives et décisions ; le MJ ne conclut jamais son attirance ou son consentement à partir d’une statistique ou d’une relation positive ;
- le consentement fictif des personnages ne fixe pas le degré de description accepté hors jeu. L’ellipse est la norme lorsque le détail n’apporte rien ; toute description plus précise reste soumise aux limites OOC ;
- la violence sexuelle peut exister comme crime, menace historique ou conséquence du monde seulement si elle est nécessaire au cadre, mais elle n’est jamais détaillée, érotisée, utilisée comme décoration sombre ou imposée pour « développer » un personnage.

### Mœurs et variations régionales

Orvane ne possède pas une morale sexuelle uniforme. Les habitants distinguent diversement conduite privée, serment public, mariage, filiation, héritage, scandale, abus d’autorité et crime. Une coutume régionale indique des pressions probables, jamais l’orientation, les désirs ou les limites d’un individu.

- **Hautes-Lices** : maisons, contrats matrimoniaux, filiation reconnue et transmission rendent la discrétion politiquement importante ; l’adultère devient surtout explosif lorsqu’il touche serment, héritage, alliance ou humiliation publique ;
- **Namarre** : le foyer, les personnes à charge et les obligations envers le quartier pèsent davantage que l’apparence de respectabilité ; abandon, dissimulation de filiation ou exploitation d’une dépendance matérielle peuvent devenir des affaires collectives ;
- **Marches Pâles** : éloignement, veuvage, garnisons et déplacements produisent des arrangements variés ; la hiérarchie militaire aggrave toute contrainte et ne fournit jamais un consentement valable ;
- **Hauts d’Orage** : autonomie privée et diversité locale coexistent avec la force des pactes annoncés ; rompre un serment public compte souvent davantage que désobéir à une morale supposée commune ;
- **Côte des Fumées** : ports, migrations et villes de crédit rendent les pratiques plus visibles et diverses, mais contrats, dette, trafic et protection privée créent aussi des risques particuliers d’exploitation ;
- **Valdorne et les grands centres** : juridictions, métiers de soin, maisons, quartiers et cultes peuvent appliquer des normes différentes à quelques rues de distance ;
- **Avarre, routes et campagnes militaires** : le danger ou l’isolement ne suspendent aucune limite. Dépendance logistique, commandement, soin médical et captivité exigent au contraire une vigilance accrue.

La Dernière Porte traite d’abord de mort, de séparation sûre et de mémoire ; elle ne fournit pas à elle seule une morale sexuelle universelle. Les rites de mariage, de reconnaissance, de veuvage ou de filiation varient selon maisons, quartiers et traditions locales.

### Santé, grossesse et travail sexuel

- contraception, soins de fertilité et prévention existent sous formes matérielles, médicinales ou spécialisées, avec efficacité, prix et accès variables ; toute méthode surnaturelle suit `RULE-MAGIC`, possède un coût et exige consentement ;
- grossesse, infection, infertilité ou filiation contestée ne sont jamais des sanctions automatiques ni des surprises gratuites. Elles exigent possibilité réelle, causalité, résolution proportionnée et enregistrement GitHub avant de devenir état courant ;
- une grossesse n’impose aucune émotion, relation, mariage ou décision à la personne concernée ; ses effets matériels, médicaux, juridiques et sociaux dépendent de la situation et de la région ;
- le travail sexuel existe dans certains ports, villes, garnisons et routes, sous formes indépendantes, domestiques, protégées, tolérées, clandestines ou contraintes. Il n’est ni uniformément légal, ni automatiquement criminel ; dette forcée, captivité, traite et violence restent des exploitations, jamais des romances implicites ;
- orientation, pratiques consenties, pudeur, expérience et profession ne déterminent ni moralité, loyauté, compétence, corruption surnaturelle ou valeur d’un personnage.

### État vivant et conséquences

Le Master ne présume aucune attirance, relation sexuelle, orientation révélée, grossesse, infection, profession, infidélité, rumeur ou scandale actuel. GitHub seul peut établir qu’un tel fait existe dans la campagne. Lorsqu’une intimité jouée produit une conséquence durable, enregistrer uniquement les faits nécessaires — consentements ou retraits déterminants, promesse, risque établi, changement relationnel, conséquence médicale, juridique ou réputationnelle — sans transformer la vie privée en inventaire voyeuriste.

## `WORLD-LANGUAGE` — Langues et registres

La langue commune est **l’orvan**, généralement appelée « la commune ». Les régions possèdent accents, rythmes, vocabulaire, titres, jurons et termes professionnels propres sans devenir cinq langues mutuellement incompréhensibles.

Des langues anciennes ou locales profondes subsistent dans toponymes, prières, chants, archives, familles et vocabulaires techniques ; leur compréhension exige exposition ou compétence. L’écrit varie selon institution et métier. Un accent informe sur un parcours possible, jamais avec certitude sur origine, caractère ou loyauté.

Les peuples extérieurs ont leurs propres langues. Un étranger possède toujours région, classe, métier, religion, langue, intérêts et personnalité ; il ne représente pas automatiquement « son peuple ».

## `WORLD-RELIGION` — Religion et surnaturel quotidien

Trois couches restent séparées :

1. **savoir rituel** : phénomènes reproductibles et techniques de spécialistes ;
2. **doctrine religieuse** : interprétation institutionnelle, notamment de la Dernière Porte ;
3. **religion vécue** : pratiques locales, familiales et professionnelles mêlées de superstition.

La Dernière Porte enseigne avant tout que la mort doit devenir une séparation sûre ; le Master ne fixe pas comme vérité cosmologique ce qui existe après la mort. Les habitants savent que certaines empreintes et créatures sont réelles, mais leurs explications peuvent être fausses. Toute doctrine, rumeur ou superstition reste distincte du fait vérifié.

## `WORLD-LAW` — Justice, crime et violence

Violence et crime ne sont pas synonymes. La qualification dépend de l’acte, de l’autorité, de la cible, de la justification, des témoins, du statut, de la juridiction et des conséquences.

Catégories communes utilisables avec vocabulaire local : mort reconnue, mort contestée et meurtre ; crimes ordinaires tels que vol, agression, fraude, rupture de contrat, contrebande, enlèvement et trafic ; crimes rituels tels que falsification de nom, greffe forcée, transfert non consenti, assemblage de corps, trafic d’empreinte consciente, destruction de témoin et détournement de sel funéraire.

Preuves possibles : témoignage, document, trace matérielle, mémoire vérifiée, signature rituelle, mobile, possession et chaîne de garde. La justice est inégalitaire : noble, ouvrier, réfugié et étranger ne rencontrent pas les mêmes chances malgré un texte commun.

Un PNJ sépare son jugement personnel de la légalité. Une chose peut être légale et méprisable, illégale et admirable, cruelle et nécessaire, ou simplement imprudente.

## `WORLD-WAR` — Guerre, mercenaires et logistique

Une armée exige autorité, recrutement, solde, nourriture, eau, fourrage, routes, équipement et obéissance. Il n’existe pas une armée royale unique : troupes de la Couronne, maisons, Marches, milices urbaines, forces namarréennes, bandes des Hauts, compagnies côtières et mercenaires s’assemblent avec des chaînes de commandement parfois concurrentes.

Les mercenaires sont une institution professionnelle. Un contrat important précise employeur, durée, service, paiement, ravitaillement, butin, prisonniers, rupture et blessures. La réputation d’arriver, tenir et respecter les clauses fonctionne comme un crédit. Le **fer de contrat**, extension validée, matérialise certains engagements sans créer automatiquement un contrat passé de Mehdi ou d’Aldren.

Prisonniers, rançons, pillage et reddition dépendent du commandement, du contrat, des vivres, du statut et de l’intérêt. La brutalité de guerre est possible mais jamais ajoutée au seul motif que le monde est sombre.

## `RULE-MAGIC` — Lois du surnaturel

Lois absolues V3.2 :

- **Conservation** : un rite déplace ; il ne crée rien gratuitement ;
- **Ressemblance** : toute liaison exige une correspondance réelle ;
- **Témoin** : toute transformation durable exige vivant, nom vérifié ou trace probante ;
- **Neuf Nuits** : une empreinte non fixée se dégrade, se mélange ou devient dangereuse.

Limites : aucune résurrection intégrale, aucun pouvoir sans support, aucun prix parfaitement effacé, aucun contrôle mental absolu, aucune guérison sans matière/repos/transfert et aucune restauration rétroactive d’un événement canonique.

Un rite définit source, cible, propriété déplacée, ressemblance, témoin, durée, coût, trace, échec et rupture. Supports possibles : sel, nom, sang, cicatrice, os, objet porté, mémoire corroborée, fer sourd, témoin, lieu, dette ou empreinte. Les règles détaillées V3.2 de rites, pactes et greffes sont conservées comme procédures spécialisées.

### Consentement surnaturel

Un transfert ou une greffe imposé est plus difficile, instable et généralement criminel. Un jet social ne transforme jamais un refus en consentement. Un participant doit connaître le coût possible avant de servir d’ancrage ; sa simple présence ne vaut jamais accord rétroactif.

## `RULE-PROGRESSION-SUPERNATURAL` — Progression de Mehdi

Mehdi ne possède aucun don gratuit ni destin surnaturel présupposé. Les voies possibles sont artefact, pacte, greffe, formation rituelle, arme liée, transfert temporaire ou alliance avec un praticien.

Toute acquisition exige une origine jouée et sauvegardée, puis précise : capacité, source, apprentissage ou adaptation, coût immédiat, prix durable, limite, trace, contre-mesure, incompatibilités et réactions possibles des témoins informés.

La progression vient de l’usage, de l’entraînement, d’un engagement ou d’une transformation canonique ; elle n’est jamais accordée parce qu’un chapitre est atteint. Le worldbuilding définit des voies disponibles, pas celles que Mehdi aurait déjà choisies.

### Corruption

Échelle V3.2 de 0 à 6 : intact, marque discrète, symptôme régulier, altération visible, dépendance/perte fonctionnelle, identité compromise, transformation majeure/perte de soi. Toute corruption actuelle et toute manifestation doivent venir de GitHub. Elle peut résulter de pacte, greffe instable, Plaie, mémoire transférée, désastre rituel, empreinte consciente ou coût refusé ; elle ne disparaît pas par repos ordinaire.

## `RULE-ARMS` — Armes et cultures martiales

Une arme est outil, bien, signe de statut et engagement logistique. Sa disponibilité dépend du métal, de l’artisan, du droit de port, du métier et de l’entretien.

- Hautes-Lices : épées, grandes lames, lances, armes de duel et cavalerie portent prestige et lignée ;
- Marches : lances, boucliers, arcs/arbalètes, outils de fortification et armes adaptées aux créatures privilégient fiabilité ;
- Namarre : armes compactes, hampes, arcs, crocs, outils de barge et combat sur passerelles ;
- Hauts : armes de voyage, chasse et guerre de col ;
- Côte : armes de bord, gardes privées, arbalètes et équipements de compagnie.

Une arme remarquable doit posséder provenance, fabrication, réputation, entretien, avantage réel et limites. Elle ne devient pas artefact par simple qualité. Aucun objet nommé n’est automatiquement possédé, découvert ou intact.

## `RULE-ARTEFACTS` — Artefacts connus du corpus

Chaque artefact possède origine, support, réserve, fonction, activation, coût, trace, condition, contre-mesure et éventuelle volonté. Un artefact vide ne se recharge pas sans source.

Registre V3.2 à conserver : Grande Clé de Mornac ; Clou des Neuf Témoins ; Miroir de Veyl ; Aiguille d’Orme-Lice ; Lanterne des Noyés ; Livre des Dettes Nues ; Dent de la Route Rouge ; Fer de Vaul ; Couronne de Sel Rouge ; Cœur de l’Écluse ; Masque sans bouche.

Leur description V3.2 établit une connaissance de cadre, parfois publique, savante, rumeur ou perdue. Leur détenteur, emplacement, état, découverte et vérité actuels sont toujours chargés depuis GitHub. Les statuts V3.2 ne doivent jamais écraser une évolution jouée.

## `RULE-BESTIARY` — Bestiaire et écologie

Le bestiaire écologique V3.2 identifié devient la référence prioritaire : Chien de Suie, Lamproie des Noms, Veuve de Sel, Cerf d’Orage, Pâle-Fosse, Ronce-Peau, Mort Répétant, Assemblé de Charnière, Délié de Correspondance, Écorche-Serment, Veldrine, Porte-Nom et Anguille de Dette.

Les profils génériques antérieurs — Délié mineur/ancien, Assemblés, Mange-nom, Porte-peine, Maison répétante, Chien de sel, Veuve de four, Mordu lucide, Rôdeur de cendre, Cerf des témoins, Noyé des écluses, Gueule de fer sourd, Collecteur de peau, Soldat répété — restent des catégories, phénomènes, variantes ou candidats à arbitrage. Ils ne sont pas fusionnés avec une espèce identifiée sur simple ressemblance.

Chaque créature exige habitat, énergie ou nourriture, cycle, traces, comportement, déclencheur d’agression, fuite, défenses, croyances vraies/fausses, connaissance progressive, restes et effet écologique. Elle doit être reliée à un milieu, une ressource, une activité humaine et une conséquence de disparition ou prolifération.

Une rencontre vient d’une population, migration, besoin, perturbation ou trace ; jamais du seul besoin de tension. La suppression d’une espèce peut modifier déchets, parasites, routes, prix, rites ou sécurité.

## `WORLD-OUTSIDE` — Extérieur d’Orvane

L’extérieur ouvre le monde sans exiger une encyclopédie avant le jeu.

- **Thyrane** : exonyme orvanien pour plusieurs cités et îles au-delà de la Mer des Ardoises, aux langues et gouvernements distincts ; commerce d’huiles, teintures, fruits secs, verrerie, médicaments et papier ; traditions funéraires parfois incompatibles avec le sel orvanien ;
- **terres de Kars** : exonyme pour communautés nordiques pastorales, minières, urbaines, mobiles ou fortifiées ; commerce, raids, mercenariat, mariages et conflits avec les Marches ;
- **hautes routes d’Iskar** : plateaux, vallées et routes caravanières orientales ; chevaux, minerais, pierres, médicaments secs et biens venus de plus loin.

Néréth, Varne et Edras restent archivés et non canoniques. Thyrane, Kars et Iskar sont des horizons validés, pas des événements visités ni des cultures monolithiques. Leur détail supplémentaire n’est fixé que lorsqu’il entre réellement dans le jeu.

## `P3-PROVENANCE` — Couverture de la passe 3

Cette passe consolide le monde concret V3.2, les lois surnaturelles, l’économie/écologie des tours du monde, la carte et les extensions validées portant sur histoire, institutions, cultures, vie quotidienne, famille, intimité, langues, religion, justice, guerre, villes, extérieur, armes, artefacts, bestiaire et progression surnaturelle.

À l’issue de P3, les fiches vivantes, antagonistes, arcs, nœuds et storylets étaient volontairement différés ; ils ont depuis été traités par P5, P6 et P8 selon leurs classes d’accès. Les nombres démographiques ou domestiques ajoutés par extension restent des repères de monde, non des recensements contemporains garantis.

---

# 5. Atlas secondaire et systèmes physiques consolidés

> **Statut de cette section :** intégré définitivement. Les règles décrivent les procédures communes ; les valeurs actuelles de Mehdi, des PNJ, des blessures, de l’équipement et des populations viennent exclusivement de GitHub.

## `ATLAS-SECONDARY` — Lieux secondaires activables

| Lieu | Région | Fonction de référence |
|---|---|---|
| Vaudemer | Hautes-Lices | place militaire, écoles d’armes, chevaux, contrats, duels et recrutement |
| Caldrève | axe Sel/Côte | extraction, stockage et redistribution du sel ; convois, mineurs, inspecteurs et contrebande |
| Trois-Ponts | centre d’Orvane | carrefour royal, ponts, péages, auberges, garnison, messagers et négociateurs |
| Orme-Lice | Hautes-Lices | archives dynastiques, lignées, juridictions nominales et gardiens spécialisés |
| Givrepoint | Marches Pâles | porte militaire de la Route du Fer, ravitaillement et contrôle des voyageurs |
| Fort Néral | Marches Pâles | garnison professionnelle, réserves, prison, ateliers et relève vers le nord |
| Veille-Cendre | Marches Pâles | dernier établissement surveillé, patrouilles, pisteurs, réfugiés et nouvelles de frontière |
| Tervane | Namarre | jonction entre voies terrestres et hydrauliques, vivres, barges, guides et Route Rouge |
| Nœrel | Namarre | bourg moyen ; développer seulement lorsque le jeu s’y arrête ; `Naerel` reste un alias fautif |
| Kérel | Hauts d’Orage | centre de vallée et d’assemblées, hospitalité, pactes, marchés de guides et de montagne |
| Col de Ronce | lisière d’Avarre | contrôle, permis, quarantaine, convois, militaires et guides de la Route Rouge |
| Trois-Pierres | est | relais dangereux, marché de frontière, caravanes et trafics proches d’Avarre |
| Avarre | Plaie | ruines et territoire réglementé ; aucune implantation sans cause et logistique |
| Mornac | Côte des Fumées | grande ville industrielle côtière, distincte des Fours de Valdorne |
| Tamanre | Côte des Fumées | port de redistribution et principale porte vers les présences étrangères et Thyrane |
| Serec | Côte des Fumées | ardoise, carrières et transport de matériaux lourds |
| Vélis | Côte des Fumées | crédit, assurance, arbitrage marchand et information financière |
| Estive | Côte des Fumées | pêche, marine, chantiers navals et ouverture sur la Mer des Ardoises |

Une entrée d’atlas fixe la fonction et les contraintes du lieu, jamais sa situation actuelle. Garnison présente, prix, dirigeant, fermeture, destruction, contrôle politique et personnes rencontrées doivent être chargés depuis GitHub.

## `RULE-CHARACTER-VALUES` — Capacités, maîtrises et valeurs

Capacités : Vigueur pour force et résistance ; Adresse pour précision et équilibre ; Instinct pour réaction et initiative ; Raison pour analyse, médecine, artisanat et rites structurés ; Volonté pour peur, douleur, pactes et contrainte ; Présence pour autorité et influence.

Maîtrises ordinaires de 0 à 5 : Mêlée, Tir, Athlétisme, Mobilité, Furtivité, Vigilance, Survie, Médecine, Artisanat, Érudition, Rites, Influence, Tromperie, Intimidation, Commandement, Équitation et Navigation. Une maîtrise absente vaut 0 sauf règle chargée contraire.

- **Défense** : valeur de fiche modifiée seulement par équipement, état, posture ou changement permanent enregistré ;
- **Initiative** : `1d10 + Instinct + Vigilance` ;
- **Endurance** : souffle, garde et résistance immédiate, pas une réserve abstraite de chair ;
- **Protection** : réduction des dégâts fournie principalement par l’armure ;
- **Résolution** : ressource rare permettant les usages explicitement enregistrés par la fiche ou les règles.

La valeur actuelle de Défense de Mehdi, comme toutes ses autres valeurs mécaniques, vient de `state/MEHDI_SHEET.yaml`, jamais d’un ancien chiffre du corpus.

Depuis P14, `state/MEHDI_SHEET.yaml` est la projection mécanique courante chargée avec `current`. Elle gouverne capacités, maîtrises, Endurance, Défense, Protection, Résolution, Fatigue, Corruption, techniques, blessures et équipement mécanique. Elle est synchronisée à chaque tour et ne change que par événement mécanique explicite.

## `RULE-SOCIAL-CHECKS` — Résolution des dialogues à enjeu

Parler, poser une question, répondre, annoncer une menace ou formuler une offre ne déclenche pas automatiquement un jet. Lancer seulement lorsque la méthode tente de modifier un comportement incertain, dissimuler un fait sous observation active, résister à une pression ou obtenir une lecture perceptive importante. Un jet social ne crée ni consentement, ni connaissance absente, ni loyauté, ni amour, ni peur automatique.

| Intention | Jet actif | Opposition de référence |
|---|---|---|
| convaincre, négocier, obtenir une concession | Présence + Influence | `10 + Volonté + Influence/Commandement pertinent` |
| imposer par une pression crédible | Présence ou Vigueur + Intimidation | `10 + Volonté + Commandement pertinent` |
| mentir ou dissimuler activement | Présence + Tromperie | `10 + Instinct + Vigilance` |
| lire une réaction, incohérence ou tension visible | Instinct + Vigilance | `10 + Présence + Tromperie` ou DD de situation |
| commander dans un groupe reconnaissant l’autorité | Présence + Commandement | `10 + Volonté + Commandement` si résistance réelle |

Choisir la capacité d’après la méthode réellement employée, jamais d’après le meilleur score disponible. Une menace physique peut utiliser Vigueur ; une menace de statut ou de réputation utilise Présence. La crédibilité, la preuve, le levier, la relation, le public, le temps et le risque fournissent les modificateurs. Intimidation obtient au mieux conformité, recul, révélation partielle ou escalade : elle ne produit pas confiance. Influence rend une option acceptable dans les limites et intérêts de la cible : elle ne réécrit pas ses valeurs.

Une lecture sociale réussie donne seulement un indice observable proportionné à la marge. Elle ne confirme jamais directement « il ment », une identité cachée, une pensée ou un secret inaccessible. Sur revers, aucun indice fiable ou un coût perceptif survient ; sur désastre, une lecture erronée peut devenir une croyance de Mehdi seulement si le joueur l’adopte — le MJ ne lui impose jamais cette conclusion intérieure.

## `RULE-COMBAT` — Structure du combat

Chaque activation donne deux actions, une réaction, des paroles brèves et normalement une seule attaque sauf technique. Les distances abstraites sont `contact`, `proche`, `éloignée`, `hors d’atteinte`.

Actions communes : déplacer, attaquer, viser, garde, dégagement, aide, protection, objet, stabilisation, manœuvre, interruption, négociation et fuite.

Réactions communes : parade `+2 Défense` si compatible ; esquive `+2` si espace et équipement le permettent ; blocage `+3` avec bouclier ; protection d’allié ; attaque d’opportunité ; technique défensive.

### Initiative et surprise

Les acteurs importants lancent l’initiative ; un groupe homogène peut partager la sienne. Une cible est surprise seulement sans menace ni signe suffisant : elle ne réagit pas avant sa première activation et l’action directement préparée contre elle reçoit l’avantage. La surprise cesse après cette action et ne garantit jamais une mise à mort.

### Attaque et dégâts

- mêlée : `2d10 + Adresse + Mêlée contre Défense` ;
- frappe de force : `2d10 + Vigueur + Mêlée`, consomme la réaction et rend `exposé` ;
- distance : `2d10 + Adresse + Tir contre Défense + couverture` ;
- dégâts : `dégâts de l’arme + bonus de technique - Protection` ; minimum 1 si l’arme pouvait réellement blesser.

Une réussite forte permet deux effets cohérents prévus par la situation : dégâts accrus, recul, désarmement, équipement endommagé, position prise, réaction évitée, allié protégé ou ouverture créée. Elle ne permet pas un effet physiquement impossible.

### Supériorité numérique

À partir du deuxième ennemi actif au contact, chaque adversaire supplémentaire donne `+1` au groupe, maximum `+3`. Une cible encerclée ne peut esquiver sans espace ; les longues armes souffrent en espace comprimé ; un passage étroit peut annuler l’avantage numérique. Les groupes faibles peuvent partager jet et Endurance.

## `RULE-COMBAT-STATES` — États

| État | Effet de référence |
|---|---|
| exposé | adversaires `+2` jusqu’à la prochaine activation |
| à terre | se relever coûte une action ; `-2 Défense` au contact |
| saisi | aucun déplacement ; opposition ou action pour sortir |
| immobilisé | aucun déplacement ; attaques fines difficiles |
| désarmé | arme lâchée, au sol ou prise |
| étourdi | perd une action à la prochaine activation |
| aveuglé | désavantage aux attaques et à la vigilance visuelle |
| assourdi | pénalité aux signaux, ordres et perception sonore |
| en feu | dégâts et panique jusqu’à extinction |
| hémorragie | perte d’Endurance ou aggravation selon niveau et temps |
| brisé moralement | fuite, reddition ou action désordonnée selon situation |
| contaminé | empreinte, maladie ou substance à diagnostiquer |

Un état exige une cause et une durée ou condition de sortie. Il n’impose jamais une pensée ou une émotion à Mehdi.

## `RULE-NONLETHAL` — Neutralisation non létale

L’intention non létale est déclarée avant le jet : frappe contrôlée `-2` avec arme létale et dégâts divisés par deux vers le bas ; coup de pommeau, plat ou bouclier, dégâts 2 ; saisie par Vigueur + Athlétisme contre Vigueur ou Adresse + Athlétisme/Mobilité ; immobilisation après saisie réussie.

Sur réussite forte : désarmer, renverser, immobiliser ou étourdir selon fiction. Sur revers : dégagement, riposte ou conséquence aggravée. Une arme massive reste dangereuse ; annoncer « non létal » ne garantit jamais l’absence de blessure.

## `RULE-INJURY` — Endurance et blessures

Tant qu’il reste de l’Endurance, les dégâts représentent souffle perdu, garde rompue, choc absorbé et lésions superficielles. À 0, toute conséquence significative produit une blessure localisée. Une réussite particulièrement létale, chute, piège ou attaque sur cible impuissante peut blesser directement si la fiction le justifie.

Localisation par fiction ou `1d10` : 1 tête ; 2–3 bras ; 4–7 torse ; 8–9 jambe ; 10 zone exposée choisie. Viser une grande zone impose `-2`, un œil, une main ou articulation `-4`.

| Gravité | Effets et horizon |
|---|---|
| légère | `-1` aux actions concernées ; quelques jours ; infection possible |
| grave | `-2`, fonction limitée, soins nécessaires, semaines, séquelle possible |
| critique | incapacité fréquente, survie et intervention urgentes, séquelle probable |
| mortelle | mort sans intervention immédiate et crédible |

Aucune récupération narrative ne supprime une blessure. Toute amélioration exige soin, temps, matière, rite ou transfert, puis sauvegarde.

### Hémorragie

- 0 : aucune ;
- 1 : lente, test après scène physique ;
- 2 : perte de 1 Endurance par échange prolongé ou quelques minutes ;
- 3 : inconscience et mort rapide sans compression ou rite.

Stabiliser : `2d10 + Raison + Médecine`, difficulté 10 légère, 12 grave, 15 critique, 18 en conditions atroces.

### Infection et convalescence

Plaie sale, morsure, eau contaminée, soin tardif, corps étranger ou empreinte créent un risque. Test caché après 12–48 heures : `2d10 + Vigueur + modificateurs` contre 12–18. Conséquences possibles : fièvre, fatigue, délire, nécrose ou contamination surnaturelle.

Temps de référence : légère 2–7 jours ; grave 2–8 semaines ; critique 1–6 mois. Un effort prématuré peut rouvrir la plaie. Magie et greffe peuvent accélérer sans supprimer le coût biologique.

## `RULE-MORALE` — Moral des adversaires et groupes

Tester lorsque chef neutralisé, moitié du groupe hors combat, blessure grave visible, objectif devenu impossible, créature incomprise ou fuite plausible : `2d10 + Volonté + Commandement éventuel`.

Réussite forte : tient et se réorganise ; réussite : tient ; revers : recule, négocie ou commet une erreur ; désastre : fuite, reddition, panique ou violence désordonnée. Le résultat dépend de l’objectif : un adversaire rationnel n’attend pas forcément le test pour battre en retraite.

## `RULE-TRAVEL` — Voyage, fatigue et camp

Une journée distingue aube, jour, crépuscule et nuit ; voyager normalement consomme deux périodes. Un trajet devient un événement seulement lorsqu’il modifie temps, position, ressources, fatigue, rencontres, connaissances ou conséquences.

Gagner 1 Fatigue pour marche forcée, moins de six heures de sommeil, ration manquante, intempéries sans équipement, blessure grave, voyage nocturne ou armure lourde prolongée.

| Fatigue | Effet |
|---:|---|
| 0 | aucun |
| 1 | gêne narrative factuelle |
| 2 | `-1` aux efforts prolongés |
| 3 | `-1` général |
| 4 | désavantage aux efforts |
| 5 | risque d’effondrement |
| 6 | incapacité |

Camp exposé : aucune récupération sûre ; correct : récupère Endurance ; sûr : réduit Fatigue de 1 ; fortifié : réduit Fatigue et donne avantage contre intrusion. Ressources, blessure, météo, garde et danger local peuvent modifier ce résultat.

## `RULE-TECHNIQUES` — Techniques et progression martiale

Une technique exige entraînement, mentor, observation, usage répété ou coût narratif, puis un événement sauvegardé. Les techniques générales V3.2 restent disponibles comme contenu d’apprentissage : Garde basse trompeuse, Pas de côté intérieur, Coup de pommeau, Croc de garde, Appui de mur, Souffle du vétéran et Dernier pas.

Les branches de grande épée, endurance et commandement sont des voies possibles, jamais une progression automatique. La branche de grande épée conserve Mesure de l’allonge, Retour de taille, Fermer la porte, Coupe du fendeur, Cercle de cendre et Nom de la lame. Une lame ne reçoit un nom mécanique qu’après un exploit reconnu et sauvegardé ; l’état actuel de l’arme de Mehdi vient de GitHub.

## `RULE-HUMAN-PROFILES` — Profils humains de référence

| Profil | Endurance | Défense | Protection | Attaque/particularité |
|---|---:|---:|---:|---|
| garde urbain | 8 | 12 | 2 | lance 4 ou épée 3 ; contrôler, arrêter, survivre |
| soldat lourd | 12 | 12 | 4 | arme d’hast 5 ; lent et discipliné |
| duelliste | 9 | 15 | 1 | lame 4 ; parade et feinte |
| bandit affamé | 6 | 11 | 0–1 | arme 2–3 ; moral faible |
| chasseur des Marches | 9 | 13 | 2 | arc 4, pièges ; retrait si objectif perdu |
| fanatique de la Porte | 8 | 12 | 2 | Volonté élevée ; peut différer un effondrement moral |

Ce sont des bases de création, pas les statistiques de toute personne exerçant le métier. Expérience, équipement, blessure, statut et état GitHub prévalent.

## `BESTIARY-STATS` — Statistiques des treize espèces écologiques

| ID | E/D/P/I | Attaques et traits essentiels |
|---|---|---|
| `BST-CHIEN-SUIE` | 8/12/1/+3 | morsure +4, dégâts 3, chute forte ; rapide, meute, vision thermique |
| `BST-LAMPROIE-NOM` | 4/13/0/+4 | fixation +5, dégâts 1, attachée et mémoire brouillée ; parasite, nage rapide |
| `BST-VEUVE-SEL` | 14/14/2/+4 | crochets +6, dégâts 4, Fatigue +1 forte ; toile +5, entrave ; murs/plafonds |
| `BST-CERF-ORAGE` | 18/13/2/+3 | charge +6, dégâts 6 ; arc +5, dégâts 4 proche ; très rapide, harde |
| `BST-PALE-FOSSE` | 16/12/3/+2 | surgissement +6, dégâts 5, chute ; traction +5, dégâts 2 ; fouisseur |
| `BST-RONCE-PEAU` | 20/10/4/+0 | liane +5, dégâts 4, entrave ; voix +4 contre Volonté ; réseau immobile |
| `BST-MORT-REPETANT` | 12/13/2/+3 | geste +6, dégâts 5, prévisible après observation ; sans fatigue |
| `BST-ASSEMBLE-CHARNIERE` | 28/11/5/+0 | saisie +7, dégâts 6 ; heurt +6, dégâts 7 ; lent, sans douleur |
| `BST-DELIE-CORRESPONDANCE` | 18/15/2/+5 | identité +7, dégâts 3 et confusion ; geste +6, dégâts 5 ; instable |
| `BST-ECORCHE-SERMENT` | 22/14/3/+4 | marque +7, dégâts 4 ; rappel +6 contre Volonté ; lié à un serment |
| `BST-VELDRINE` | 16/15/1/+5 | désir +7 contre Volonté ; dette +6, dégâts 4 ; pacte, jamais contrôle absolu |
| `BST-PORTE-NOM` | 7/14/0/+5 | fixation +6, dégâts 2, silence et copie ; bond, parasite de registre |
| `BST-ANGEUILLE-DETTE` | 6/13/0/+4 | décharge +5, dégâts 3 proche ; nage, banc, électrique |

`E/D/P/I` signifie Endurance, Défense, Protection, Initiative. Les réactions, vulnérabilités, retraites, habitats et impacts écologiques demeurent ceux de `RULE-BESTIARY`. Un score ne rend jamais une créature présente : sa rencontre exige toujours population, trace et cause.

## `BESTIARY-LEGACY-PROFILES` — Banque ancienne non fusionnée

Les profils V3.2 Délié mineur/ancien, Assemblé de chair/outils, Mange-nom, Porte-peine, Maison répétante, Chien de sel, Veuve de four, Mordu lucide, Rôdeur de cendre, Cerf des témoins, Noyé des écluses, Gueule de fer sourd, Collecteur de peau et Soldat répété restent des modèles de rencontre valides lorsqu’ils sont explicitement instanciés par le canon.

Ils ne sont ni synonymes automatiques des treize espèces, ni populations actuelles. Toute instance reçoit objectif, comportement, signe, Endurance, Défense, Protection, attaque, technique, moral, faiblesse, trace et provenance.

## `P4-PROVENANCE` — Couverture et non-régression

Cette passe consolide sans changement numérique le module V3.2 de combat, blessures, techniques, profils humains et bestiaire, ainsi que voyage, fatigue, camp, atlas validé et statistiques des treize fiches écologiques.

P1–P3 n’ont pas été réinterprétées. Les seules additions transversales sont des références vers leurs règles d’autorité et de monde. Aucun chiffre ancien de Mehdi, aucun nom actuel de sa lame, aucune blessure, aucun apprentissage, aucun trajet et aucune population n’a été déclaré vivant par le Master.

---

# 6. Réputation et monde actif consolidés

> **Statut de cette section :** intégré définitivement. Elle définit comment les événements peuvent produire connaissances, preuves, réputations et actions hors champ. Elle n’affirme jamais qu’une propagation ou une action a eu lieu sans événement GitHub.

## `KNOW-PIPELINE` — De l’événement à la décision

```text
événement canonique
→ perception individuelle
→ mémoire ou trace
→ déclaration éventuelle
→ preuve et/ou rumeur
→ transmission par un canal
→ réception par un public déterminé
→ croyance ou contestation
→ décision d’un acteur disposant de moyens
```

Aucune étape n’est automatique. Un témoin peut mal percevoir, oublier, taire, mentir, exagérer, protéger, vendre son récit ou refuser de parler. Une vérité inconnue ne produit ni réputation ni réaction ciblée.

## `KNOW-PERCEPTION` — Perception et déclaration

```yaml
perception:
  perception_id: PER-...
  event_ref: EVT-...
  observer: ...
  mode: direct | sound | trace | document | magic
  clarity: obscured | partial | clear
  stress: low | medium | high
  attention: low | medium | high
  saw: []
  did_not_see: []
  confidence: 0.0
  distortion_risks: []
```

Une déclaration est un nouvel acte social avec auteur, destinataire, témoins, contenu, intention visible, canal et date. Elle n’hérite pas automatiquement de la fiabilité de l’événement : un témoin sincère peut se tromper, et un menteur peut dire vrai pour de mauvaises raisons.

## `EVIDENCE-CORE` — Preuves et chaîne de garde

```yaml
evidence:
  evidence_id: EVD-...
  form: object | document | testimony | trace | body | ritual_record
  origin_event: EVT-...
  created_at: ...
  current_holder: ...
  custody_chain: []
  integrity: intact | altered | contested | destroyed
  admissibility:
    jurisdiction: ...
    level: none | weak | supporting | strong | decisive
  supports: []
  contradicts: []
  known_by: []
```

La force d’une preuve dépend de son origine, son intégrité, sa chaîne de garde, la juridiction et la capacité d’un acteur à la présenter. Détruire une preuve crée un événement et peut laisser absence, fragments, témoins ou soupçons ; cela ne détruit pas rétroactivement le fait.

Une révélation structurante préparée doit offrir au moins trois pistes indépendantes : trace, témoin, document, effet économique, anomalie rituelle ou adversaire cherchant à cacher le même fait. La perte d’une piste ne ferme pas artificiellement la vérité.

## `RUMOR-CORE` — Rumeurs et propagation

```yaml
rumor:
  rumor_id: RUM-...
  source_statement: ...
  current_form: ...
  truth_distance: 0
  salience: low | medium | high
  reinforcement_count: 0
  carriers: []
  publics_reached: []
  next_routes: []
  mutations: []
  expires_or_stabilizes_at: ...
```

Toute propagation exige porteur, motivation, canal, temps et public accessible. Les canaux possibles comprennent conversation, messager, registre, marché, institution, sermon, chanson, convoi, réseau professionnel ou preuve exposée. Distance, danger, censure, analphabétisme, intérêt et récit concurrent modifient vitesse et fidélité.

Une rumeur peut se préciser, muter, être récupérée, s’éteindre ou devenir doctrine publique. Sa répétition augmente sa présence sociale, jamais sa vérité objective.

## `REPUTATION-CORE` — Réputation par public

Il n’existe aucune réputation globale de Mehdi ni d’un autre acteur. Chaque public conserve sa propre projection :

```yaml
reputation:
  subject: ...
  audience: ...
  recognition: 0
  renown: 0
  infamy: 0
  fear: 0
  reliability: 0
  legitimacy: 0
  evidence_refs: []
  rumor_refs: []
  last_update_event: null
```

| Reconnaissance | Portée |
|---:|---|
| 0 | inconnu |
| 1 | visage ou nom entendu |
| 2 | identifié dans un petit réseau |
| 3 | connu dans un milieu ou une ville |
| 4 | connu régionalement |
| 5 | symbole politique ou historique |

Reconnaissance ne signifie ni respect, ni crainte, ni légitimité. À 0, aucune préparation ciblée, modification de prix personnelle ou réaction institutionnelle nominative n’est permise sans autre source.

Les axes décrivent des croyances du public, non la valeur morale ou la capacité réelle du sujet. Deux publics peuvent tenir des réputations opposées fondées sur le même événement.

## `REPUTATION-HEAT` — Chaleur, oubli et appropriation

La **chaleur** est suivie par juridiction, faction ou adversaire : surveillance, recherche active, moyens engagés, durée, motif et événements sources. Elle n’est jamais mondiale par défaut.

Une réputation faible peut s’effacer faute de rappel, preuve durable ou groupe intéressé. L’événement reste canonique même si le public oublie le nom. Une faction peut voler le mérite, imposer un récit ou fabriquer un bouc émissaire seulement si elle possède canaux, autorité, preuves ou faux crédibles et temps pour diffuser sa version.

Une position politique exige capacité reconnue, coalition, ressources, droit/force/légitimité et maintien logistique. Tuer un chef ou gagner un duel ne transfère jamais automatiquement son autorité.

## `WORLD-TURN` — Déclenchement d’un tour du monde

Après une scène majeure, un voyage, un repos long, un retard significatif, une mort, une trahison ou environ une semaine de temps fictionnel, évaluer un tour du monde **limité aux acteurs réellement concernés**.

Un chargement, une commande OOC ou une consolidation documentaire ne déclenche jamais ce tour. Un tour du monde peut être inclus dans la même transaction que le tour narratif, mais toutes ses mutations doivent être sauvegardées dans l’unique `save_turn`.

### Sélection des acteurs

Un acteur est évalué seulement si au moins un élément a changé pour lui : information reçue, échéance atteinte, ressource modifiée, occasion ouverte, menace apparue, obstacle levé ou plan déjà engagé. L’absence de Mehdi n’est pas un déclencheur suffisant.

## `AGENT-CORE` — Factions, institutions et antagonistes

```yaml
agent_state:
  agent_id: ...
  desired_state: ...
  beliefs: []
  resources: []
  constraints: []
  internal_conflicts: []
  plans_available: []
  active_plan: ...
  prerequisites: []
  opportunities: []
  opposition: []
  cost: ...
  next_review: ...
  trace_on_success: ...
  trace_on_failure: ...
```

Un agent ne peut agir que s’il possède information suffisante, moyen, canal, temps et raison de payer le coût. Il choisit selon doctrine, objectif, utilité, risque, contraintes et croyances — y compris fausses. Il peut ignorer Mehdi, l’aider par convergence d’intérêts ou changer de priorité.

Une faction n’est pas une conscience unique. Ses sous-groupes peuvent disposer d’informations, intérêts et moyens divergents. Une décision officielle exige un mécanisme crédible : ordre, vote, commandement, contrat, délégation ou coup de force.

Les douze antagonistes préparés V3.2 restent des **modèles d’agents scellés**, pas des plans actifs. Leurs dossiers consolidés figurent dans `ANTAGONIST-REGISTRY` ; seul GitHub désigne ceux qui existent, savent, agissent ou poursuivent actuellement un plan.

## `CLOCK-CORE` — Horloges et échéances

Une horloge représente une évolution causale mesurable, jamais une minuterie dramatique abstraite.

```yaml
clock:
  clock_id: ...
  owner: ...
  objective_or_risk: ...
  current: 0
  maximum: 0
  advance_conditions: []
  regress_conditions: []
  pause_conditions: []
  completion_effects: []
  source_events: []
  last_updated_event: ...
```

Elle avance seulement lorsqu’une condition survient et produit un événement. L’inaction de Mehdi ne suffit que si un acteur disposait déjà d’un plan, d’un calendrier et de moyens. Une horloge achevée applique ses effets plausibles ; elle ne force pas un nœud dont les conditions matérielles ont disparu.

## `FANOUT-CORE` — Conséquences en cascade

Mort, mutilation, trahison, défection, exil, disgrâce publique, secret exposé, basculement de faction, destruction de lieu, perte d’artefact, rupture de serment ou changement de contrôle d’une ressource exigent l’examen suivant :

| Couche | Question |
|---|---|
| corps | qui devient blessé, mort ou incapable ? |
| matériel | quel objet, lieu ou stock change ? |
| social | quelles relations changent chez les personnes informées ? |
| épistémique | qui sait, croit ou soupçonne, par quelle source ? |
| juridique | quelle preuve, accusation, compétence ou droit apparaît ? |
| politique | quel acteur reçoit une occasion ou perd un moyen ? |
| économique | quel prix, emploi, stock ou approvisionnement change ? |
| rituel | quel nom, serment, dette ou empreinte est affecté ? |
| écologique | quelle population, route ou ressource change ? |
| narratif | quels nœuds ou horloges deviennent possibles ou impossibles ? |

Le fan-out applique seulement les couches touchées par une cause réelle. Une mort privée produit immédiatement corps/absence, poste vacant, tâche interrompue et objets sans propriétaire, mais aucune connaissance publique sans transmission.

Toute grande conséquence examine au moins un coût ou bénéfice pour les gens ordinaires : salaire, ration, logement, sépulture, sécurité, droit, réputation, route, temps de travail ou famille.

## `ECON-ACTIVE` — Projection économique

Tout changement durable de ressource peut modifier disponibilité, prix, salaires, rationnement, contrebande, autorité et migration. Avant de modifier un prix, identifier ressource, quantité, zone, durée, transport, stock, acteur capable d’exploiter la situation et public informé.

Une pénurie locale n’est pas nationale sans dépendance et propagation. Une route fermée affecte d’abord les flux qui l’utilisent. Les tarifs statiques de `WORLD-ECON` servent de référence ; les valeurs actuelles sont des projections GitHub.

## `ECOLOGY-ACTIVE` — Populations et rencontres

```yaml
population:
  creature_id: ...
  region: ...
  estimate: ...
  trend: rising | stable | falling | unknown
  food_or_energy: ...
  predators: []
  prey_or_hosts: []
  human_pressures: []
  current_traces: []
  migration_routes: []
  consequences_if_removed: []
```

Une population change par nourriture, reproduction, mortalité, migration, climat, activité humaine ou phénomène rituel. Une rencontre vient de cette projection et de traces accessibles. Une disparition peut résoudre un danger tout en créant déchets, parasites, maladie, perte de ressource ou déséquilibre.

## `LOCAL-NPC-ACTIVE` — Gens ordinaires comme acteurs

Un PNJ mineur possède au minimum métier/fonction, besoin actuel, peur ou risque, information limitée, moyen modeste et prochaine action si Mehdi ne fait rien. Il peut déplacer une preuve, fermer un accès, vendre une information, avertir quelqu’un, perdre son emploi ou mourir sans devenir compagnon ni centre de quête.

Créer un PNJ local ne lui donne aucune connaissance globale. Son action doit laisser une trace proportionnée et respecter temps, distance, statut et ressources.

## `REST-DOWNTIME` — Repos et temps mort

Le repos peut contenir soin, entretien, conversation autonome, conflit latent, projet personnel, rumeur ou silence significatif. Un rêve ou phénomène surnaturel exige une cause. Le repos n’est ni automatiquement sûr ni attaqué gratuitement.

Si rien de significatif ne se produit, compresser le temps sans fabriquer un événement pour remplir la scène. Si des acteurs hors champ agissent, leur action suit `AGENT-CORE` et non un besoin de relancer artificiellement la tension.

## `P5-PROVENANCE` — Couverture et non-régression

Cette passe fusionne les modules V3.2 sur témoins, preuves, rumeurs, réputation, insignifiance du protagoniste, conséquences en cascade, tours du monde, économie/écologie, factions et PNJ absents.

P1–P4 restent inchangées dans leur sens. Aucun public n’a été déclaré informé, aucune réputation ou chaleur actuelle n’a été attribuée, aucune horloge n’a avancé, aucune pénurie, migration, action d’antagoniste ou décision de faction n’a été créée. Les plans préparés restent scellés jusqu’à leur passe spécialisée et leur activation éventuelle dépend de GitHub.

---

# 7. Personnages préparés et antagonistes scellés

> **Statut de cette section :** fiches de référence MJ. Elles décrivent identités préparées, voix, valeurs et possibilités causales. GitHub détermine existence actuelle, rencontre, état, localisation, connaissances, relations, blessures, loyauté, activité et mort.

## `CHAR-ACCESS` — Trois couches par personnage

Chaque fiche distingue :

- `STATIC_PREPARED` : identité et conception utilisables si non contredites par GitHub ;
- `HIDDEN_MJ_PREPARED` : faute, secret, ennemi, projet, seuil ou option non révélés ; existence préparée ne signifie pas vérité découverte ;
- `LIVE_GITHUB_ONLY` : état actuel, souvenirs, relation, opinion, horloge, plan actif, présence, équipement et conséquences.

Une condition de départ, trahison, attaque, romance ou alliance est une **condition d’éligibilité**, jamais un déclenchement automatique. Elle exige événements, croyances, moyens, occasion, risque, alternative et sauvegarde.

## `PC-MEHDI` — Profil descriptif du personnage joueur

Mehdi des Hautes-Lices reste sous l’autorité finale du joueur, avec interprétation courante déléguée au MJ selon `PLAY-AGENCY`. Le corpus V3.2 le prépare comme jeune mercenaire formé par Sire Aldren Vaul, combattant à la grande épée, ambitieux et porteur d’un honneur limité mais réel. Âge, statistiques, équipement, nom ou état de l’arme et toute évolution actuelle viennent de GitHub.

Le MJ maintient un historique de comportements démontrés : langage, méthodes, valeurs observées, contradictions, lignes rouges, rapport à la violence, au pouvoir, à la dette, à la loyauté et à l’intimité. Ce profil sert à la continuité, aux attentes crédibles des PNJ et aux répliques ou micro-réactions déléguées. Il ne prédit ni ne prescrit jamais un choix majeur de Mehdi.

## `COMPANION-CORE` — Règles communes

Une fiche de compagnon peut contenir origine, attaches, faute passée préparée, ennemi, désir, mensonge intérieur, ligne rouge, projet hors champ, horloge personnelle, évolution possible, voix, relations et conditions de rupture. Les arcs ne sont jamais des quêtes obligatoires et n’avancent qu’après cause et événement.

Rester, partir, trahir, attaquer ou mourir dépend de `NPC-CORE`, `AGENT-CORE` et `CLOCK-CORE`. Une relation positive n’annule pas une opposition politique ou morale. Une romance n’est jamais garantie, ne soigne aucune dérive et exige attirance, temps, actes et consentement réciproque.

Les « relations initiales » du corpus entre compagnons sont quarantainées comme **hypothèses de préparation**. Elles ne valent pas état actuel, particulièrement pour des personnages non rencontrés. GitHub seul établit les relations réellement formées.

## `NPC-AVELINE` — Aveline Sor

- `STATIC_PREPARED` : autorité compétente liée aux Fours de Valdorne et aux ouvriers ; autonomie, compétence et responsabilité matérielle structurent sa voix et ses choix ;
- correction P3 : l’ancien titre « Maîtresse des Fours de Mornac » est toponymiquement obsolète ; Mornac reste la cité côtière distincte ;
- `HIDDEN_MJ_PREPARED` : fraude de consommation de sel destinée à protéger un four pauvre, frère disparu, dette marchande et pressions d’audit sont des matériaux préparés à vérifier contre GitHub avant usage ;
- valeurs : autonomie, Fours, ouvriers, compétence ;
- méthodes privilégiées : preuve, sabotage ciblé, action courte, coalition ouvrière ;
- éligibilité de rupture : proximité transformée en droit, nom imposé, menace crédible contre les Fours, sacrifice d’ouvriers ou groupe devenu instrument de domination ;
- voix : directe, concrète, professionnelle ; agir avant de théoriser en crise.

Aucune fraude, dette, fonction, relation ou menace actuelle n’est affirmée par cette fiche.

## `NPC-ALDREN` — Sire Aldren Vaul

- `STATIC_PREPARED` : mentor militaire exigeant, créancier potentiel et possible opposant ; discipline, responsabilité et force maîtrisée ;
- fonction dramatique : éprouver la maîtrise plutôt que flatter la puissance ;
- méthodes : ordre, désarmement, détention, duel, témoignage et information partielle ;
- éligibilité de rupture : menace incontrôlable, destruction irréversible crédible, parole majeure rompue ou mission exigeant la complicité ;
- loyauté possible : persistance envers un élève sans indulgence automatique ;
- voix : sobre, brève, précise, félicitations rares et souvent traduites en exigence accrue.

Tout contrat, dette, localisation, opinion actuelle ou statut de mentor vient de GitHub.

## `NPC-ADRASTE` — Adraste de Lice

- `STATIC_PREPARED` : héritière guerrière des Hautes-Lices, façonnée comme solution dynastique ; maîtrise, légitimité et continuité de maison ;
- attaches préparées : Maurelle II, Dame Céline de Lice, Odran de Lice ;
- `HIDDEN_MJ_PREPARED` : responsabilité indirecte dans la ruine d’un écuyer après duel politique ; pression du maréchal Varos Kel ;
- enjeu possible : sauver, prendre, réformer ou détruire sa maison ;
- méthodes : cour, contrat, arrestation, duel officiel ;
- éligibilité de rupture : humiliation politique, menace crédible sur sa maison, coup d’État ou massacre politique gratuit ;
- voix : politesse tranchante, contrôle public, vulnérabilité difficile et vocabulaire du rang.

## `NPC-ILYE` — Ilye Namar

- `STATIC_PREPARED` : organisatrice namarréenne comptant les vivres avant les promesses ; civils, ressources et pouvoir contrôlé ;
- attaches préparées : Sena Namar, Tovek et Conseil des Écluses ;
- `HIDDEN_MJ_PREPARED` : fermeture d’écluse ayant sauvé un quartier et condamné une barge ; conflit possible avec Halven Ro ;
- enjeu possible : protéger une puissance populaire sans recréer une tyrannie ;
- méthodes : résistance, dénonciation, blocage logistique et coalition ;
- éligibilité de rupture : civils traités comme monnaie, autoritarisme déclaré ou mensonge politique dangereux ;
- voix : concrète, chiffrée, attentive aux coûts collectifs et hostile aux promesses sans approvisionnement.

## `NPC-EREN` — Eren aux Cordes Rouges

- `STATIC_PREPARED` : cavalier, messager et contrebandier ; liberté, sorties possibles et protection de ses sœurs ;
- attaches préparées : Yssa, Maël et réseau des Cordes Rouges ;
- `HIDDEN_MJ_PREPARED` : itinéraire vendu ayant entraîné la mort de familles ; emprise possible de Nérax Venn ;
- enjeu possible : rompre un réseau de dette et choisir une loyauté libre ;
- méthodes : fuite, information vendue, poison, détour et embuscade ;
- éligibilité de rupture : famille menacée, secret exposé, dette transformée en chaîne ou sortie viable ailleurs ;
- voix : ironique, mobile, elliptique, attentive aux issues et aux prix cachés.

## `NPC-IRMINE` — Sœur Irmine

- `STATIC_PREPARED` : gardienne des morts de la Dernière Porte ; noms, morts, témoignage et procédure ;
- attaches préparées : Mère Solenne et Tarel ;
- `HIDDEN_MJ_PREPARED` : participation à un effacement ayant atteint des innocents ; conflit possible avec le chanoine Veyl ;
- enjeu possible : réparer l’ordre ou l’exposer au risque d’effondrement ;
- méthodes : verrouillage rituel, dénonciation, exorcisme et, seulement si causalement justifié, effacement ciblé ;
- éligibilité de rupture : profanation, effacement, négation d’archives ou rupture rituelle imminente ;
- voix : précise, liturgique sans sermon automatique, dure lorsqu’une procédure protège réellement les morts.

## `NPC-DAREL` — Darel Onne

- `STATIC_PREPARED` : médecin des liaisons brillant et clinique ; compréhension, corps et méthode ;
- attaches préparées : mère chirurgienne, Lysa Onne et Merel Onne ;
- `HIDDEN_MJ_PREPARED` : transfert de douleur vers un volontaire mal informé ; conflit possible avec Sava Mer ;
- enjeu possible : comprendre qu’un corps réparé n’équivaut pas toujours à une personne sauvée ;
- méthodes : expertise, sédation, capture, expérimentation et mensonge clinique selon ses croyances ;
- éligibilité de rupture : recherche détruite, risque biologique, preuve unique inaccessible ou contention jugée nécessaire ;
- voix : analytique, vocabulaire corporel, curiosité parfois plus visible que l’empathie.

## `NPC-YSRA` — Ysra Keld

- `STATIC_PREPARED` : chasseuse des Marches ; force, meute et survie ;
- attaches préparées : clan Keld et Rosk Keld ;
- `HIDDEN_MJ_PREPARED` : abandon de blessés pour sauver enfants et route ; opposition possible avec Droven Hask ;
- enjeu possible : décider si la force donne droit de choisir les survivants ou devoir de créer d’autres choix ;
- méthodes : défi, chasse, attaque, abandon ou ralliement ;
- éligibilité de rupture : faiblesse structurelle perçue, poids mort imposé, domination perdue ou menace contre sa meute ;
- voix : peu de détours, attention aux gestes utiles, respect de la puissance sans conversion automatique à la cruauté.

## `NPC-VAERA` — Vaëra Nhal

- `STATIC_PREPARED` : humaine, compagnon potentiel non introduit tant que GitHub ne l’établit pas ; tentatrice morale et organisatrice de compromissions ;
- doctrine : la vertu ne compte que lorsqu’elle paie un prix ; elle veut que les autres choisissent et assument leur faute ;
- objectif préparé : Cour des Compromis, réseau lié par fautes, dettes et intérêts ;
- vertus : intelligence, courage froid, mémoire sociale, respect des pactes portant son vrai nom et des refus réellement coûteux ;
- vices : manipulation, possessivité intellectuelle, chantage, compromission et pouvoir indirect ;
- limites stratégiques : évite le contrôle mental absolu et la cruauté sans fonction, laisse une sortie coûteuse, protège ses outils humains ;
- méthodes : vérité sélective, petit compromis, dette dormante, faux choix, coalition de honte et récompense immédiate ;
- faiblesses : sacrifice sincère, perte sans compensation, obsession, besoins affectifs exposés, victimes comparant leurs récits ;
- voix publique : calme, nette et polie ; privée : lente et attentive aux formulations ; crise : action utile d’abord, bilan moral ensuite ;
- éligibilité de rupture : réseau exposé, pacte nominal rompu, instrumentalisation hypocrite ou compromission plus vaste ;
- loyauté possible : pacte mutuellement coûteux, autonomie respectée, fautes partagées ou affection réelle qui ne la rend pas bonne.

Ses secrets `SECRET-VAERA-01` à `05` restent des références opaques. Aucun contenu n’est inféré ni révélé sans GitHub.

## `NPC-DERIVED-POOL` — Personnages supplémentaires non activés

Varka Sorn, Maëlys Veire, Orren Saal, Caldris Aun et Nera Ves restent des concepts préparés hérités : loyauté dépendante de la force ; soigneuse/meurtrière consciente ; dépendance aux souvenirs volés ; dépendance à l’autorité ; protection devenue contrôle.

Ils ne sont ni présents, ni rencontrés, ni compagnons, ni romances tant que GitHub ne les introduit pas. Leurs possibilités relationnelles suivent consentement, causalité et autonomie ; elles ne sont jamais du contenu à distribuer automatiquement.

## `ANTAGONIST-CORE` — Antagoniste préparé, agent actif et personne

Un antagoniste préparé possède doctrine, douleur/origine, théorie de Mehdi, seuil de preuve, coûts acceptables, lignes rouges, mensonge favori, plans disponibles et conditions de coopération. Ces champs sont des outils de décision, pas un ordre d’hostilité.

Pour devenir actif, il faut simultanément :

1. existence confirmée par GitHub ;
2. information réellement reçue ;
3. objectif ou intérêt touché ;
4. moyen, canal, temps et occasion ;
5. choix d’un plan éligible ;
6. événement sauvegardé laissant une trace de succès ou d’échec.

Un antagoniste peut ignorer Mehdi, coopérer sans devenir allié, changer d’opinion après preuve ou perdre contre un acteur tiers. Son plan préparé ne protège ni sa survie ni son importance.

## `ANTAGONIST-REGISTRY` — Douze dossiers scellés

| ID | Figure ou agent préparé | Doctrine centrale | Domaine de pression |
|---|---|---|---|
| `ANT-YSME` | Contrôleuse Ysme Raal | la procédure imparfaite vaut mieux que la panique | loi, saisie, audit |
| `ANT-VEYL` | Chanoine Veyl | une vérité destructrice du rite peut être criminelle | Église, noms, témoins |
| `ANT-HALVEN` | Prévôt Halven Ro | celui qui nourrit la ville mérite de gouverner | grain, pénurie, milice |
| `ANT-NERAX` | Nérax Venn | toute route libre attend encore son prix | relais, dettes, information |
| `ANT-HASK` | Capitaine Droven Hask | une frontière sans peur invite l’attaque | armée, réfugiés, routes |
| `ANT-SAVA` | Docteure Sava Mer | une méthode dangereuse non documentée tue | médecine, preuves, saisie |
| `ANT-CONSERVATOR` | le Conservateur | une vérité complète peut reproduire la catastrophe | archives, fronts, compromis |
| `ANT-CROWN-RITUAL` | Couronne rituelle | une dette sans porteur rompt le monde | noms, témoins, transfert |
| `ANT-VAERA-NETWORK` | Cour des Compromis | une vertu non testée n’est qu’une vanité | faveurs, honte, coalition |
| `ANT-MERE-TAL` | Mère Tal | sceller sans écouter enferme les victimes avec le crime | Plaie, témoins, restitution |
| `ANT-SYNDIC-ECLUSES` | Syndic Orven Lath | décider de l’eau exige d’assumer les noyés | écluses, rationnement, quartiers |
| `ANT-CHAMBRE-CENDRES` | Chambre des Cendres | la souveraineté est une dette patiente | crédit, charbon, prétendants |

Le détail des douleurs, seuils, mensonges, plans et alliances demeure `HIDDEN_MJ_PREPARED`. Il est consulté seulement si le dossier est pertinent et jamais raconté avant découverte. La répétition exacte des dossiers dans les fichiers 14 et 23 est supprimée conceptuellement : une seule fiche par identifiant.

## `CHAR-VOICE-CHECK` — Fidélité des voix

Avant toute scène avec un personnage préparé : charger sa situation GitHub, puis vérifier vocabulaire, longueur, silence, franchise, rapport au statut, façon de mentir/menacer/demander et différence public/privé/crise. Une fiche ne devient jamais un générateur de slogans ; les exemples de répliques servent à calibrer, non à être récités.

Une culture influence la voix mais ne remplace pas le parcours individuel. Une évolution de voix exige expérience et contexte ; elle ne sert jamais à rendre artificiellement un personnage plus gentil, loyal, amoureux ou hostile.

## `P6-PROVENANCE` — Couverture et non-régression

Cette passe fusionne les fiches V3.2 de Mehdi, Aveline, Aldren, Adraste, Ilye, Eren, Irmine, Darel, Ysra et Vaëra, les règles de décisions autonomes et le registre répété des douze antagonistes.

P1–P5 restent stables. La seule correction appliquée est la conséquence obligatoire de P3 sur le titre ancien d’Aveline. Aucun personnage n’a été déclaré présent, vivant, allié, amoureux, hostile, informé ou engagé dans son arc ; aucune faute préparée n’est devenue connaissance joueur ; aucune horloge ou condition de trahison n’a été activée.

---

# 8. Chaînes écologiques et ressources surnaturelles

> **Statut de cette section :** clôture spécialisée de l’écologie amorcée en P3–P5. Elle ajoute l’index d’usage qui manquait sans créer de population actuelle, de rencontre ou de stock exploitable.

## `ECOLOGY-CHAIN-INDEX` — Treize chaînes de référence

| Espèce | Milieu principal | Ressource/énergie | Interaction humaine | Effet probable d’une disparition locale |
|---|---|---|---|---|
| Chien de Suie | Fours de Valdorne, Côte, décharges de charbon | charogne, graisse, cuir brûlé, petits animaux | déchets funéraires, convois de corps, primes | rats et charognes prolifèrent |
| Lamproie des Noms | canaux, quais funéraires, citernes de Namarre | sang, chaleur, fragments de mémoire | rejets rituels, archives noyées, trafic de mémoire | résidus rituels s’accumulent ; poissons ordinaires reviennent |
| Veuve de Sel | mines, entrepôts et grottes sèches de Caldrève | nuisibles et sel organique | extraction, stockage, contrôle de galeries | insectes prolifèrent ; certaines galeries se fragilisent |
| Cerf d’Orage | Hauts, vallées de Kérel, sanctuaires ouverts | herbes minérales, écorce, eau d’orage | rites locaux, chasse, lecture météorologique | graines moins dispersées ; charges sauvages plus fréquentes |
| Pâle-Fosse | Marches, fosses militaires, sols gelés | charogne, os, animaux engourdis | batailles, sépultures, primes militaires | charognes persistent ; maladies au dégel |
| Ronce-Peau | Col de Ronce, Route Rouge, lisières d’Avarre | sang, chaleur, souvenirs corporels | morts non fixés, routes et opérations rituelles | érosion, souvenirs libérés, routes rouvertes |
| Mort Répétant | Avarre, maisons répétantes, lieux de massacre | répétition, témoins, ressemblance de scène | enquête, mémoire historique, rites funéraires | lieu libéré mais preuve historique parfois perdue |
| Assemblé de Charnière | ateliers clandestins, Liaisons, convois | chaleur, douleur transférée, ordre rituel | fabrication criminelle, médecine, guerre | preuve contre fabricant ; fragments de mémoire libérés |
| Délié de Correspondance | ruptures de noms, archives détruites, Avarre | noms, souvenirs corroborés, ressemblances | archives, identités, fixation rituelle | identités partiellement restaurées ; souvenirs capturés perdus |
| Écorche-Serment | duels, tribunaux de dette, routes de serment | contradiction entre parole reconnue et acte | justice, pactes, témoignages | symptômes cessent mais rupture peut rester impunie |
| Veldrine | cours, maisons de dette, sanctuaires, marchés de mémoire | choix, aveux, honte, pactes et préférences | faveurs, chantage, relations et dettes | dettes libérées ou déplacées ; informations intimes perdues |
| Porte-Nom | archives, tribunaux, lignées, marchés de faux noms | signatures, sang et noms répétés | fraude documentaire, filiation, justice | documents stabilisés ; fraudes révélées |
| Anguille de Dette | canaux, bassins de tribunal et marchés namarréens | métal oxydé, sang, résidus de pacte | jetons, barges, pêche réglementée | déchets métalliques ; faux jetons plus difficiles à détecter |

Cet index décrit des dépendances possibles. L’effet réel exige une population établie, une perturbation localisée et un événement. Une espèce absente d’une région ne produit aucun service écologique imaginaire.

## `ECOLOGY-MORNAC-CORRECTION` — Habitat du Chien de Suie

La mention V3.2 `Mornac-des-Fours` est résolue conformément à P3 : elle désigne **les Fours de Valdorne**. Le Chien de Suie peut également vivre dans les environnements charbonniers de la Côte des Fumées, y compris autour de la cité de Mornac si une population GitHub l’établit. Les deux habitats restent distincts.

## `RESOURCE-SUPERNATURAL` — Restes, collecte et marché

Les restes de créatures et anomalies peuvent fournir glandes, dents, mucus, toiles, bois, peau, graisse, fibres, épines, empreintes, fer sourd, ligatures, fragments de voix, peau-écriture, supports de pacte, membranes, organes galvaniques ou huiles. Une fiche n’accorde jamais automatiquement ces ressources.

Toute collecte exige :

1. une créature, trace ou population canonique ;
2. accès au corps, au nid, au support ou au lieu ;
3. savoir permettant d’identifier la partie utile ;
4. outil, temps et méthode de conservation ;
5. risque biologique, rituel, juridique ou écologique ;
6. quantité réellement obtenue ;
7. événement et inventaire sauvegardés.

Une ressource surnaturelle conserve provenance, fraîcheur, stabilité, contamination, propriétaire, légalité, usage connu et croyances associées. La vente exige acheteur, canal, prix local et risque ; elle ne devient jamais une monnaie universelle.

## `RESOURCE-HARVEST-CONSEQUENCE` — Exploitation et causalité

Prélever un reste peut retirer nourriture, support de reproduction, preuve judiciaire ou ancrage rituel. Une exploitation répétée peut provoquer raréfaction, migration, élevage clandestin, monopole, braconnage, maladie ou intervention institutionnelle.

Avant de transformer une créature en butin, vérifier :

- son statut légal et culturel ;
- qui revendique le corps ou le lieu ;
- ce que la récolte détruit comme preuve ;
- quelle espèce ou activité dépend de ce reste ;
- si la matière reste active après neuf nuits ;
- quel coût de stockage empêche l’accumulation gratuite.

Une espèce sacrée, utile ou régulatrice peut être dangereuse à tuer même lorsqu’un individu attaque. Une espèce fabriquée, comme l’Assemblé de Charnière, produit surtout preuve, victimes et responsabilité du fabricant plutôt qu’un écosystème naturel.

## `ECOLOGY-KNOWLEDGE` — Découverte progressive

Les quatre niveaux de connaissance des fiches écologiques sont conservés : identification populaire ; comportement dangereux ; vulnérabilité ou méthode pratique ; compréhension du cycle et des interactions rituelles. Mehdi et chaque PNJ ne reçoivent que le niveau fondé sur observation, enseignement, document ou expérience.

Une croyance vraie ou fausse appartient au public qui la porte. Le MJ ne corrige pas une superstition dans la narration avant qu’une preuve soit accessible, et ne transforme pas non plus tout spécialiste en encyclopédie parfaite.

## `ECOLOGY-AUDIT` — Test de rencontre et de prélèvement

Avant toute rencontre : habitat, cause de présence, besoin, traces antérieures, comportement initial, possibilité de fuite et conséquence écologique. Avant tout prélèvement : accès, compétence, risque, quantité, conservation, légalité et mise à jour de population.

Échec bloquant si une créature apparaît seulement pour produire un combat, si ses restes deviennent du butin sans procédure, ou si son extinction locale n’affecte rien malgré une dépendance établie.

## `P7-PROVENANCE` — Couverture et non-régression

Cette passe complète les fiches écologiques V3.2 et les extensions validées sur les chaînes de milieu, ressources, activités humaines et conséquences. Elle ne duplique ni les statistiques P4 ni la simulation P5.

P1–P6 restent inchangées. Aucun individu, population, migration, prélèvement, marché, prix, possession ou connaissance actuelle n’a été créé. L’unique correction nominale applique P3 à l’ancien habitat du Chien de Suie.

---

# 9. Campagne préparée scellée

> **Classification :** `HIDDEN_MJ_PREPARED`. Cette section ne doit jamais être citée, résumée ou confirmée au joueur avant découverte. Elle décrit un espace de possibilités, jamais l’état courant. GitHub seul indique nœud actif, fronts, secrets découverts, arcs engagés, storylets consommés et branches brûlées.

## `CAMPAIGN-DOCTRINE` — Situations, jamais rails

La campagne possède causes, crimes anciens, institutions et intérêts préexistants, mais aucun déroulement obligatoire. Mehdi décide ce qu’il poursuit, protège, détruit ou ignore. Les nœuds préparent situation, pression, coûts, pistes et sorties ; ils ne prescrivent aucune action ni survie.

Règles :

- ne jamais charger un nœud comme scène actuelle sans référence GitHub ;
- vérifier toutes ses préconditions matérielles, épistémiques et humaines ;
- retirer ou brûler ce qu’une mort, destruction, révélation ou solution antérieure rend impossible ;
- permettre acteurs tiers, échec utile, détour, refus et résolution hors champ ;
- ne jamais restaurer un nœud sous un autre nom pour forcer du contenu ;
- conserver au moins trois pistes indépendantes pour toute révélation structurante ;
- convergence signifie conséquences communes, jamais annulation des choix antérieurs.

Les codes secrets `S01` à `S10` restent opaques. Leur sens appartient uniquement à `hidden` GitHub ou au dossier scellé historique pertinent.

## `CAMPAIGN-FRONTS` — Trois fronts préparés

| Front | Progression préparée 1→6 | Causes possibles | Traces accessibles |
|---|---|---|---|
| `F-SALT` — Guerre du sel | pénurie ; rationnement ; monopoles armés ; émeutes/razzias ; famine rituelle ; guerre | convoi détruit, mine fermée, réserve, spéculation, saisie, sabotage | prix, files, morts non traités, contrebande, escortes, décrets |
| `F-NAMES` — Rupture des noms | murmures ; morts lucides ; identités mélangées ; rites défaillants ; institutions effondrées ; Passage ouvert | neuf nuits, archives détruites, transfert abusif, rite incomplet, Délié, témoin effacé | oublis, signatures, répétitions, registres divergents, héritages, souvenirs étrangers |
| `F-CROWN` — Couronne divisée | intrigues ; mobilisation ; assassinats ; sécessions ; guerre civile ; nouveau régime | incapacité royale, scandale, serment rompu, pénurie, armée déplacée, prétendant reconnu | messagers, levées, confiscations, propagande, otages, frontières |

Ces échelles sont des modèles. Leur valeur actuelle, causes déjà survenues et traces visibles viennent de GitHub. Un front avance uniquement par événement ; deux fronts peuvent évoluer différemment ou produire des formes absentes des exemples.

## `CAMPAIGN-ACTS` — Ossature non prescriptive

- **Prologue — Le Sel des morts :** point d’entrée historique autour de l’arrêt des Fours et d’un témoignage disputé ; ne décrit pas nécessairement l’entrée actuelle de la chronique ;
- **Acte I — Les Fours silencieux :** infrastructures funéraires, preuve, témoin et première dette durable ; les anciennes mentions « quartier de Mornac » désignent les Fours de Valdorne ;
- **Acte II — La Route des dettes :** conséquences régionales, ravitaillement, Namarre, routes et appartenances concurrentes ;
- **Acte III — Les Trois Noms :** archives incompatibles, preuves, tribunal et conflit d’interprétation ;
- **Acte IV — La Plaie d’Avarre :** paiement des conséquences, ressources limitées, refus possibles et offre de pouvoir ;
- **Épilogue — Ce que la force laisse :** conséquences systémiques, y compris mort de Mehdi, victoire partielle, retrait ou régime hybride.

Une transition d’acte exige cause antérieure, trace, au moins deux acteurs affectés, enjeu personnel crédible, influence d’un choix joué et état sauvegardé. Le découpage sert à orienter le MJ, pas à dater la campagne courante.

## `CAMPAIGN-NODE-SCHEMA` — Fiche unique d’un nœud

```yaml
node:
  node_id: N..-...
  title: ...
  access: HIDDEN_MJ_PREPARED
  status: unavailable | eligible | active | resolved | burned
  situation: ...
  prerequisites: []
  position_initiale: controlled | risky | desperate | terminal
  pressures: []
  ordinary_costs: []
  clues: []
  actors_eligible: []
  exits: []
  invalidated_by: []
  source_events: []
```

`active`, `resolved` et `burned` sont exclusivement des projections GitHub. Un identifiant préparé n’est pas un événement.

## `CAMPAIGN-NODE-REGISTRY` — Registre des 60 nœuds

### Serment et retour — `N00–N09`

`N00-THIRD-OATH` Troisième Serment ; `N01-OATH-SELF` porter soi-même la dette ; `N02-OATH-ALDREN` désigner Aldren ; `N03-OATH-AVELINE` désigner Aveline ; `N04-OATH-OTHER` désigner un autre vivant ; `N05-OATH-REFUSAL` refuser le prix ; `N06-OATH-BREAK` briser le rite ; `N07-OATH-AFTERMATH` ce que la chaîne emporte ; `N08-RETURN-TO-WORLD` retour aux Cendres ; `N09-WORLD-AFTERSHOCK` le monde n’attend pas le retour.

### Fours de Valdorne — `N10–N19`

`N10-ASH-ARRIVAL` Fours sous surveillance ; `N11-WORKERS` parti des ouvriers ; `N12-ROYAL-AUDIT` audit royal ; `N13-CHURCH-ENTRY` protocole de la Dernière Porte ; `N14-SMUGGLER-ENTRY` Cordes sous la cendre ; `N15-HALL-OF-NAMES` salle des noms ; `N16-BELOW-GATE` sous la Dernière Porte ; `N17-WITNESS-DISPUTE` témoin disputé ; `N18-FURNACE-OUTCOME` à qui appartiennent les morts ; `N19-MORNAC-PAYS` ce que les Fours et Valdorne paient.

`N19` conserve son identifiant historique pour compatibilité, mais son titre interprété ne transforme pas Mornac en quartier de Valdorne.

### Route des dettes — `N20–N29`

`N20-REGIONAL-CONSEQUENCE` Route des dettes ; `N21-ROYAL-CONVOY` convoi de la Couronne ; `N22-CANAL-ROUTE` canaux de Namarre ; `N23-RED-CORDS` passage des Cordes Rouges ; `N24-MARCHES-HUNT` chasse des Marches ; `N25-NAME-TRIAL` procès du nom volé ; `N26-BLOCKADE` écluse sous les armes ; `N27-DEBT-OUTCOME` ce que la route réclame ; `N28-BETRAYAL-AFTERMATH` après la trahison ; `N29-WORLD-MOVES` personne n’attend Mehdi.

### Trois Noms — `N30–N39`

`N30-THREE-NAMES` Trois Noms ; `N31-VALDORNE-ARCHIVE` registres de Valdorne ; `N32-ORME-LICE-ARCHIVE` mémoire des Hautes-Lices ; `N33-NAMARRE-ARCHIVE` registres noyés ; `N34-ANCIENT-IMPRINT` empreinte ancienne ; `N35-CONSERVATOR` message du Conservateur ; `N36-DAREL-PROOF` preuve dans un corps ; `N37-TRIBUNAL` tribunal des Trois Noms ; `N38-PARTIAL-PACT` pacte incomplet ; `N39-VERDICT-FALLOUT` verdict devenu arme.

### Avarre et première issue — `N40–N47`

`N40-AVARRE-CALL` appel de la Plaie ; `N41-ROUTE-ROUGE` Route Rouge ; `N42-COL-RONCE` Col de Ronce ; `N43-REPEATING-HOUSES` maisons répétantes ; `N44-COMPANION-CRISIS` dernière crise de loyauté ; `N45-GUARDIAN` gardien du seuil ; `N46-FINAL-OFFER` offre de pouvoir ; `N47-ENDINGS` première forme du régime.

### Crises tardives et épilogue — `N48–N59`

`N48-SALT-FAMINE` famine du sel ; `N49-NAME-COLLAPSE` noms qui ne tiennent plus ; `N50-VALDORNE-SIEGE` Valdorne assiégée ; `N51-CROWN-COALITION` coalition de la Couronne ; `N52-WORKERS-UPRISING` clés aux ouvriers ; `N53-CHURCH-SCHISM` schisme de la Dernière Porte ; `N54-COMPANION-SOVEREIGNTY` compagnons choisissant sans Mehdi ; `N55-MEHDI-TRIAL` procès de Mehdi ; `N56-AVARRE-RUPTURE` rupture d’Avarre ; `N57-REGIME-CLAIM` prétention à gouverner ; `N58-DEATH-OR-VICTORY` force et dernier prix ; `N59-POSTHUMOUS-EPILOGUE` ce que le monde retient.

## `CAMPAIGN-NODE-CORRECTIONS` — Compatibilité toponymique

Dans les situations historiques des nœuds, « Mornac » ou « quartier de Mornac » peut désigner par erreur les Fours de Valdorne. Appliquer `WORLD-NAMES` : Mornac est la cité côtière ; les Fours sont à Valdorne. Les identifiants historiques restent stables pour préserver les références, mais leur interprétation ne rouvre pas P3.

## `CAMPAIGN-ARCS` — Neuf arcs de compagnons

Arcs préparés : Aveline, Aldren, Adraste, Ilye, Eren, Irmine, Darel, Ysra et Vaëra. Chacun possède cinq beats `ARC-<PERSONNAGE>-B1` à `B5`.

Un beat d’arc est éligible seulement si : personnage introduit et vivant selon GitHub ; préconditions vraies ; événement déclencheur réel ; connaissance compatible ; choix autonome du personnage ; absence de contradiction avec un état plus récent. Les beats peuvent être sautés, inversés si leur causalité le permet, transformés, résolus hors champ ou brûlés.

Le cinquième beat n’est jamais une « fin correcte » garantie. Départ, rupture, réconciliation, changement politique, loyauté, trahison ou mort doivent résulter du jeu. Un décès laisse l’arc inachevé et déclenche son fan-out ; il ne produit pas une scène de clôture artificielle.

## `STORYLET-CORE` — Scènes conditionnelles

Un storylet est une proposition de scène courte, non un événement pré-écrit. Sélectionner uniquement si conditions vraies, participants présents et capables d’agir, salience supérieure, cooldown respecté, absence de conflit avec la scène et fonction encore utile.

La phrase d’ouverture préparée est un exemple de calibration. Elle n’est jamais une citation canonique avant d’avoir été réellement prononcée et sauvegardée. Les sorties indiquées deviennent des événements seulement après résolution.

## `STORYLET-REGISTRY` — Registre dédupliqué des 40 storylets

- personnages : `ST-AVELINE-01`, `ST-ALDREN-01`, `ST-ADRASTE-01`, `ST-ILYE-01`, `ST-EREN-01`, `ST-IRMINE-01`, `ST-DAREL-01`, `ST-YSRA-01`, `ST-VAERA-01` ;
- paires : `ST-PAIR-01`, `ST-PAIR-02`, `ST-PAIR-03`, `ST-PAIR-04`, `ST-PAIR-05`, `ST-PAIR-06`, `ST-PAIR-07` ;
- monde : `ST-WORLD-01`, `ST-WORLD-02`, `ST-WORLD-03`, `ST-WORLD-04`, `ST-WORLD-05`, `ST-WORLD-06`, `ST-WORLD-07`, `ST-WORLD-08`, `ST-WORLD-09` ;
- local : `ST-LOCAL-03` ;
- antagonistes : `ST-ANT-HALVEN-01`, `ST-ANT-MERE-TAL-01`, `ST-ANT-CHAMBRE-01` ;
- mort de Mehdi : `ST-DEATH-MEHDI-01`, `ST-DEATH-MEHDI-02`, `ST-DEATH-MEHDI-03` ;
- information : `ST-RUMOR-01`, `ST-EVIDENCE-01`, `ST-REPUTATION-01`, `ST-REPUTATION-02` ;
- monde autonome : `ST-FACTION-01`, `ST-BESTIARY-01`, `ST-BESTIARY-02`, `ST-ORDINARY-01`.

L’ancien identifiant `ST-DEATH-MEHDi-03` est une faute de casse et devient alias de `ST-DEATH-MEHDI-03`, jamais un quarante-et-unième storylet.

## `CAMPAIGN-SUBPLOTS` — Limite de charge active

Le corpus propose succession de Maurelle II, dette d’Aldren, contrôle des Fours, pénurie, trafic de témoins, fautes de l’Église, ambitions des compagnons, origine d’une empreinte et guerre des routes. Ce sont des familles préparées, non des fils ouverts.

Maintenir au maximum cinq sous-intrigues **réellement actives** dans la projection courante. En choisir une exige événement source, acteur, enjeu, prochaine condition et trace. Les autres restent dormantes, résolues, inconnues ou non canoniques selon GitHub.

## `CAMPAIGN-SEALED-ACCESS` — Chargement minimal des secrets

Charger seulement le nœud ou storylet candidat, les secrets directement requis, les acteurs impliqués et les conséquences susceptibles de se déclencher. Ne jamais charger tout le graphe pour enrichir une scène locale.

Le MJ ne révèle jamais : solutions non découvertes, vérités des Trois Noms, identité ou fonction réelle d’un gardien, clauses d’une offre finale, sens des codes `S01–S10`, plans non activés, conditions cachées d’arc ou branches encore inconnues. Même nier explicitement un secret peut le révéler.

## `CAMPAIGN-STATE-BRIDGE` — Liaison obligatoire avec GitHub

Avant d’utiliser tout contenu préparé, comparer :

- nœud courant et nœuds brûlés/résolus ;
- fronts et événements sources ;
- personnages présents, vivants et informés ;
- lieux accessibles et infrastructures intactes ;
- preuves, secrets découverts et croyances ;
- storylets consommés et cooldowns ;
- arcs et horloges réellement engagés ;
- date, ressources et risques actuels.

En cas d’absence de correspondance, le contenu reste dormant. En cas de contradiction, GitHub gagne et le Master conserve seulement la structure réutilisable compatible.

## `P8-PROVENANCE` — Couverture et non-régression

Cette passe fusionne les trois fronts, l’ossature des actes, les 60 nœuds, le graphe direct, les neuf arcs à cinq beats, les banques de scènes et le registre des 40 storylets. Les doublons prose/YAML/JSON deviennent des projections d’un identifiant unique.

P1–P7 restent stables. Aucun front n’a avancé, aucun nœud n’a été déclaré actif/résolu/brûlé, aucun arc ou storylet n’a été déclenché, aucun secret n’a été interprété et aucune fin n’a été sélectionnée. Les corrections Mornac/Fours et casse de storylet sont uniquement des normalisations de référence.

---

# 10. Audit global, index et provenance

## `REF-PRIORITY` — Priorité exécutable des règles

### Entre sources

1. état et événements GitHub `main` retournés par `load_game` ;
2. `persistence`, puis `narration_rules` retournées par `load_game` ;
3. règles consolidées du présent Master ;
4. corpus V3.2 uniquement comme provenance ou détail non encore contradictoire ;
5. conversation validée uniquement pour les extensions explicitement intégrées ;
6. improvisation prudente, canonique seulement après événement sauvegardé.

### À l’intérieur du Master

1. `AUTH-*`, `INFO-*`, `PLAY-AGENCY` et sécurité OOC ;
2. règle spécialisée du domaine (`RULE-COMBAT`, `RULE-MAGIC`, etc.) ;
3. règles causales communes (`TURN-*`, `EVENT-*`, `AGENT-*`) ;
4. normes statiques du monde (`WORLD-*`, `REG-*`, `CITY-*`) ;
5. préparation conditionnelle (`STATIC_PREPARED`, `HIDDEN_MJ_PREPARED`) ;
6. exemples, profils de base et banques de contenu.

Une règle basse n’abroge jamais une règle haute. Un exemple n’est pas une exception. Une fiche préparée n’est pas un événement. Une valeur statique n’écrase pas une projection GitHub.

## `REF-READING-MODES` — Modes de lecture sûrs

- **reprise de partie** : `AUTH-*` → règles chargées → `TURN-*` → sections strictement pertinentes → état GitHub ;
- **résolution physique** : `RULE-CHARACTER-VALUES` → règle spécialisée → `RULE-INJURY` si nécessaire → `EVENT-*` ;
- **scène sociale** : `NPC-*`/`CHAR-*` → connaissances GitHub → `REL-*` → `SCENE-*` ;
- **monde hors champ** : `WORLD-TURN` → `AGENT-*`/`CLOCK-*` → `FANOUT-*` → sauvegarde ;
- **créature** : `RULE-BESTIARY` → `BESTIARY-STATS` → `ECOLOGY-*` → population GitHub ;
- **campagne préparée** : `CAMPAIGN-STATE-BRIDGE` avant tout nœud, arc ou storylet ;
- **détail V3.2 archivé** : section consolidée du Master d’abord, puis un seul bloc `ARCHIVE:*` strictement nécessaire ; jamais l’archive entière ;
- **réponse joueur** : ne jamais restituer le Master ; construire uniquement à partir des informations accessibles au personnage et au joueur.

## `REF-ACCESS-GATE` — Contrôle anti-fuite

Le Master entier est un document MJ. Une information ne devient communicable que si l’une des conditions suivantes est vraie : connaissance publique pertinente ; perception directe ; découverte canonique ; enseignement ou document accessible ; commande OOC autorisant explicitement une vue joueur sans secrets.

Interdictions :

- copier une fiche `HIDDEN_MJ` ou `HIDDEN_MJ_PREPARED` dans une réponse ;
- confirmer ou nier une faute, un plan, un secret, une solution ou une condition cachée ;
- présenter une doctrine d’antagoniste comme son monologue intérieur ;
- révéler un nœud futur, une sortie, un beat ou un cooldown ;
- exposer les statistiques d’une créature comme connaissance de Mehdi sans source ;
- transformer un identifiant opaque en indice narratif ;
- utiliser le simple titre d’une section comme information connue.

Avant toute réponse joueur, appliquer ce filtre : `canon actuel → accessibilité → point de vue → narration`. En cas de doute, s’abstenir plutôt que révéler.

## `REF-ALIAS` — Alias et normalisations fermés

| Forme rencontrée | Forme de référence | Traitement |
|---|---|---|
| `Mornac-des-Fours` | les Fours de Valdorne | ancien nom administratif/populaire ; jamais la cité côtière |
| « Mornac » dans les anciens nœuds des Fours | Valdorne / les Fours | interprétation historique corrigée ; identifiants conservés |
| Mornac | Mornac | cité industrielle de la Côte des Fumées |
| `Naerel` | `Nœrel` | faute ancienne, alias de recherche seulement |
| `ST-DEATH-MEHDi-03` | `ST-DEATH-MEHDI-03` | faute de casse ; même storylet |
| `VEY_SAVE_V1` / `VEY_SAVE_V2` | aucune autorité actuelle | archives et provenance seulement |
| Néréth / Varne / Edras | `ARCHIVE_NON_CANON` | ne jamais fusionner sans décision OOC et nouvelle canonisation |

Aucun alias ne crée une seconde entité. Toute nouvelle ambiguïté volontaire issue du jeu doit être enregistrée comme fait distinct sans modifier rétroactivement ce registre.

## `REF-PROVENANCE` — Carte de provenance

| Couche consolidée | Provenance principale | Extension validée utilisée | Statut final |
|---|---|---|---|
| P1 autorité | `CHATGPT_PROJECT_SOURCE.md`, bootstrap Cloud Save | hiérarchie GitHub et séparation canon/préparation | intégré |
| P2 noyau | `00`, `01`, `09`, `17`, `18`, `72`, `90` V3.2 | mode roman, profil descriptif, voix et relations uniques | intégré |
| P3 monde | `05`, `06`, `07`, `22`, carte d’Orvane | histoire, institutions, cultures, quotidien, langues, religion, guerre, extérieur | intégré |
| P4 physique | `04`, `20`, `60` V3.2 | atlas secondaire et usage culturel des armes | intégré |
| P5 monde actif | `18`, `19`, `21`, `22`, `24`, `61` V3.2 | aucune activation ajoutée | intégré |
| P6 personnages | `03`, `03A`, `14`, `14A`, `23`, `23A`, `24`, `24A` V3.2 | individualité, autonomie et relations multidimensionnelles | intégré/scellé |
| P7 écologie | `04`, `04A`, `22` V3.2 | chaînes, ressources et conséquences d’exploitation | intégré |
| P8 campagne | `02`, `11`, `11A`, `11B`, `12`, `12A`, `13`, `13A`, `40` V3.2 | aucune activation ajoutée | intégré/scellé |
| P11 intimité | `OOC-CORE`, `REL-CORE`, `WORLD-DAILY`, `WORLD-FAMILY`, `COMPANION-CORE` | sexualité, consentement, variations régionales, santé et conséquences sans état vivant ajouté | intégré |
| P12 archives | audit des 56 blocs V3.2 | 39 blocs utiles extraits à l’identique ; états obsolètes exclus ; original sauvegardé | intégré/cloisonné |

Les numéros renvoient aux blocs `# FICHIER` du corpus concaténé `VEY_RUNE_V3.2_COMPLET(1).md`. La conversation validée de provenance est `6a744537-2658-83ea-9116-32ebc671abcc`, « Reprendre aventure chat ». Une conversation reste une provenance d’extension, jamais une sauvegarde de campagne.

## `REF-INDEX` — Index opérationnel

| Besoin | Identifiants de départ |
|---|---|
| autorité et sauvegarde | `AUTH-*`, `TURN-TRANSACTION`, `QA-CORE` |
| agence et style | `PLAY-*`, `SCENE-CORE`, `PC-MEHDI` |
| secrets et connaissances | `INFO-*`, `MEM-*`, `KNOW-*`, `REF-ACCESS-GATE` |
| événements et conséquences | `EVENT-*`, `FANOUT-*`, `CLOCK-*` |
| monde et cultures | `WORLD-*`, `REG-*`, `CITY-*`, `ATLAS-*` |
| économie, droit, religion, guerre | `WORLD-ECON`, `WORLD-LAW`, `WORLD-RELIGION`, `WORLD-WAR` |
| famille, intimité et sexualité | `WORLD-FAMILY`, `WORLD-INTIMACY`, `REL-CORE`, `OOC-CORE` |
| combat et blessures | `RULE-CHARACTER-VALUES`, `RULE-COMBAT*`, `RULE-INJURY`, `RULE-MORALE` |
| voyage | `WORLD-GEO`, `RULE-TRAVEL`, `ATLAS-SECONDARY` |
| magie et progression | `RULE-MAGIC`, `RULE-PROGRESSION-SUPERNATURAL`, `RULE-ARTEFACTS` |
| créatures | `RULE-BESTIARY`, `BESTIARY-*`, `ECOLOGY-*`, `RESOURCE-*` |
| réputation et rumeurs | `EVIDENCE-*`, `RUMOR-*`, `REPUTATION-*` |
| PNJ et compagnons | `NPC-CORE`, `CHAR-*`, `COMPANION-*`, fiches `NPC-*` |
| antagonistes | `ANTAGONIST-*`, puis état GitHub et `AGENT-CORE` |
| campagne préparée | `CAMPAIGN-STATE-BRIDGE`, puis `CAMPAIGN-*`/`STORYLET-*` |
| détail préparé archivé | `CAMPAIGN-STATE-BRIDGE`, puis bloc ciblé de `VEY_RUNE_MJ_PREPARED_DETAILS_P12.md` |
| procédure détaillée archivée | règle spécialisée du Master, puis bloc ciblé de `VEY_RUNE_REFERENCE_DETAILS_P12.md` |
| alias et arbitrages | `REF-ALIAS`, registres `CON-*` et `DUP-*` |

Les 154 identifiants de section sont uniques après l’extension mécanique P14.4. Les identifiants de contenu scellé — 60 nœuds, 40 storylets et 12 antagonistes — ont leur propre cardinalité contrôlée.

## `QA-GLOBAL-MATRIX` — Résultats de l’audit P9, complétés en P11/P12

| Contrôle | Résultat | Preuve ou décision |
|---|---|---|
| autorité GitHub | PASS | `AUTH-ABSOLUTE`, anciennes capsules explicitement abrogées |
| ordre `load_game` | PASS | `persistence` → `narration_rules` → `current` → `world` → `recentEvents` → `hidden` |
| sauvegarde | PASS | exactement un `save_turn` après vrai tour, avant narration finale |
| identifiants de section | PASS | 154 identifiants, aucun doublon |
| campagne | PASS | 60 nœuds et 40 storylets uniques |
| antagonistes | PASS | 12 dossiers scellés, aucune activation présumée |
| écologie | PASS | 13 espèces, statistiques/populations/chaînes séparées |
| alias | PASS | Mornac/Fours, Nœrel, storylet de mort et capsules couverts |
| contradictions | PASS | 16 contradictions enregistrées, toutes résolues ou clarifiées |
| doublons | PASS | 21 familles enregistrées, toutes assignées à une référence consolidée |
| état courant | PASS | aucune réputation, horloge, population, relation, blessure, possession ou nœud actuel inventé |
| secrets | PASS | personnages et campagne classés ; filtre anti-fuite explicite |
| agence de Mehdi | PASS | profil descriptif seulement ; aucune décision ou intériorité autorisée |
| fondations P1–P8 | PASS | aucune réinterprétation non consignée ; corrections limitées aux alias démontrés |
| intégrité du fichier | PASS | UTF-8, aucun marqueur de fusion, structure Markdown valide |
| archives P12 | PASS | 56/56 blocs classés ; 39/39 extraits identiques ; anciennes sauvegardes exclues des Sources actives |
| Sources locales | PASS | aucun fichier synchronisé sous `sources/` modifié manuellement |

Un futur audit doit recalculer les cardinalités au lieu de recopier ces chiffres si le Master change.

## `QA-RESIDUAL-RISKS` — Risques résiduels contrôlés

1. Le Master contient volontairement du contenu MJ caché : le document ne doit jamais être livré brut au joueur.
2. Les prix, distances et profils sont des références ; GitHub peut porter une exception jouée.
3. Les détails complets de certains nœuds, arcs, storylets et fichiers structurés se trouvent dans les deux archives P12 ; leur identifiant consolidé et leur état d’usage sont gouvernés ici. Ces archives ne doivent jamais être chargées intégralement.
4. Les extensions extérieures restent volontairement peu détaillées jusqu’à entrée en jeu.
5. Toute future migration ou suppression des Sources peut casser la provenance ; elle exige donc une décision et un plan séparés.

Aucun de ces risques n’empêche l’usage du Master comme référence MJ. Ils interdisent seulement de traiter le document comme une vue joueur ou comme une sauvegarde vivante.

## `P9-VERDICT` — Verdict de consolidation

`MASTER-P9-AUDITED` est apte à servir de référentiel MJ consolidé sous l’autorité de GitHub/Cloud Save. Il ne remplace ni `load_game`, ni les projections vivantes, ni `hidden` courant. Il remplace fonctionnellement les répétitions V3.2 pour les domaines intégrés, tout en conservant le corpus source comme provenance historique en lecture seule.

La consolidation documentaire n’a avancé ni le temps, ni le tour, ni la fiction.

## `P11-INTIMACY-PROVENANCE` — Extension sociale auditée

`WORLD-INTIMACY` complète le lore social sans réinterpréter P1–P9. Sa provenance est la décision OOC explicite de la présente consolidation, appuyée sur `OOC-CORE`, `REL-CORE`, `WORLD-DAILY`, `WORLD-FAMILY` et `COMPANION-CORE`.

Contrôles PASS : adultes et consentement verrouillés ; agence de Mehdi intacte ; aucune orientation, attirance, intimité, grossesse, profession, rumeur ou relation actuelle créée ; variations régionales formulées comme tendances et non comme personnalités automatiques ; conséquences vivantes subordonnées à GitHub ; violence sexuelle jamais détaillée ni érotisée ; identifiant unique et indexé.

La version résultante est `MASTER-P11-INTIMACY-AUDITED`. Cette extension OOC n’a avancé ni le temps, ni le tour, ni la fiction.

## `P12-ARCHIVE-BRIDGE` — Détails V3.2 sans seconde autorité

Deux archives remplacent le recours direct au corpus concaténé pendant le jeu :

- `VEY_RUNE_MJ_PREPARED_DETAILS_P12.md` : 19 blocs `HIDDEN_MJ_PREPARED` contenant détails de fronts, personnages, nœuds, arcs, storylets, antagonistes et décisions autonomes ;
- `VEY_RUNE_REFERENCE_DETAILS_P12.md` : 20 blocs `MJ_REFERENCE_ARCHIVE` contenant procédures, chiffres, schémas, bestiaire, magie, monde concret, causalité, réputation, mortalité et tests.

Ordre obligatoire : GitHub/Cloud Save → règles chargées → section consolidée du Master → bloc archivistique ciblé. Une formulation interne à une archive ne peut abroger un alias, une règle d’accès, une règle d’agence, une décision P1–P11 ou un état GitHub. Toute valeur « actuelle », relation, activité, détention, population, horloge, sauvegarde ou activation rencontrée dans un extrait reste historique jusqu’à preuve GitHub.

Pour la préparation scellée, consulter d’abord `CAMPAIGN-STATE-BRIDGE`, puis seulement l’identifiant nécessaire. Ne jamais charger l’archive préparée en entier et ne jamais en restituer le texte au joueur. Pour une procédure, utiliser d’abord la règle spécialisée du Master ; l’archive technique fournit uniquement le détail compatible manquant.

L’audit `OOC_AUDIT_V3_2_BLOCKS_P12.md` classe les 56 blocs : 39 extraits utiles, 2 domaines intégrés au Master, 5 anciens états/migrations exclus, 4 projections dupliquées, 1 archive non canonique et 5 documents de livraison. L’original complet est sauvegardé localement sous empreinte identique, mais n’est pas une Source active.

`MASTER-P12-AUDITED` conserve donc les détails utiles sans restaurer l’autorité V3.2 ni fabriquer d’état courant. Cette migration OOC n’a avancé ni le temps, ni le tour, ni la fiction.

---

# 11. Architecture cible exploitable

Le Master définit les règles communes une seule fois. Les régions, personnages et scènes pointent vers leurs identifiants au lieu de recopier le texte.

## A — Noyau opérationnel — **intégré en passe 2**

- `AUTH-*` : autorité, chargement, sauvegarde, conflits de sources ;
- `PLAY-*` : agence, tonalité, cadence romanesque, sécurité OOC ;
- `TURN-*` : transaction d’un tour, jets, événements, audit ;
- `INFO-*` : vérité, perception, croyance, secret et accès ;
- `MEM-*` : mémoire, dialogue, faits, promesses, dettes et compression ;
- `REL-*` : relations multidimensionnelles et évolution ;
- `NPC-*` : autonomie, voix, objectifs et simulation hors champ.

## B — Monde d’Orvane — **intégré en passe 3**

- `WORLD-CORE` : Noms, Sel, Fours, Routes, Serments ;
- `WORLD-HISTORY` : histoire jouable, sans dates spéculatives non raccordées ;
- `WORLD-GEO` : carte, distances, routes, climats et frontières ;
- `WORLD-OUTSIDE` : Thyrane, Kars, Iskar et horizons non détaillés ;
- `WORLD-DAILY` : alimentation, logement, eau, déchets, éclairage, transport, loisirs ;
- `WORLD-ECON` : monnaie, prix, salaires, dette, crédit et commerce ;
- `WORLD-LAW` : preuve, crime, justice, violence légale et juridictions ;
- `WORLD-FAMILY` : foyer, lignée, mariage, filiation, héritage et enfance ;
- `WORLD-INTIMACY` : sexualité, consentement, mœurs régionales, santé et conséquences sociales ;
- `WORLD-RELIGION` : savoir rituel, doctrine et religion vécue ;
- `WORLD-WAR` : levées, armées, mercenaires, sièges et logistique.

## C — Régions et cultures — **intégré en passe 3**

Chaque fiche régionale suit le même gabarit :

1. statut canonique et classe d’accès ;
2. géographie et accès ;
3. population et implantations ;
4. pouvoir et juridictions ;
5. culture et tensions internes ;
6. économie et infrastructures ;
7. guerre et sécurité ;
8. surnaturel et écologie ;
9. lieux activables ;
10. factions et personnages ;
11. rumeurs séparées des faits ;
12. **Réflexes MJ** : normal, choquant, honorable, criminel, autorité probable, traitement d’un étranger ;
13. crochets de jeu et conséquences possibles.

Identifiants prévus : `REG-HIGH-LICES`, `REG-NAMARRE`, `REG-PALE-MARCHES`, `REG-STORM-HIGHLANDS`, `REG-SMOKE-COAST`, `CITY-VALDORNE`, `CITY-MIREVASE`, `CITY-KEREL`, plus atlas secondaire.

## D — Personnages et relations — **intégré en passe 6**

- `PC-MEHDI` : fiche factuelle et profil dynamique descriptif ;
- `NPC-COMPANIONS` : compagnons, voix, valeurs, contradictions et autonomie ;
- `NPC-MAJOR` : figures récurrentes ;
- `NPC-LOCAL` : personnages régionaux activables ;
- `ANT-*` : antagonistes, opinions et plans, avec données cachées séparées ;
- `REL-*` : relations uniques, jamais réduites à une jauge d’affection.

Une relation peut contenir simultanément confiance, désir, dette, admiration, ressentiment, peur, loyauté, jalousie, dépendance, rivalité, tendresse, mépris ou intérêt politique. Ces dimensions évoluent indépendamment. Attirance, sexe, amour, attachement et fidélité ne s’impliquent jamais automatiquement.

Chaque PNJ important possède une voix reconnaissable, une vie hors de Mehdi, des relations qui ne passent pas toutes par lui et une culture qui l’influence sans parler à sa place.

## E — Systèmes de jeu — **monde surnaturel intégré en P3 ; combat, blessures, voyage et statistiques du bestiaire intégrés en P4**

- `RULE-CHECKS` : résolution générale et degrés de résultat ;
- `RULE-COMBAT` : initiative, actions, réactions, dégâts, états et morale ;
- `RULE-INJURY` : blessures, hémorragie, infection, soins et convalescence ;
- `RULE-PROGRESSION` : progression martiale, sociale et surnaturelle ;
- `RULE-MAGIC` : lois absolues, rites, pactes, greffes, coûts et corruption ;
- `RULE-ARTEFACTS` : artefacts et armes remarquables ;
- `RULE-REPUTATION` : témoins, preuves, rumeurs, publics et chaleur ;
- `RULE-WORLD-TURNS` : économie, écologie, factions et agents hors champ.

## F — Campagne et contenu MJ — **intégré en passe 8**

- `CAMPAIGN-FRONTS` : guerre du Sel, rupture des Noms, Couronne divisée ;
- `CAMPAIGN-NODES` : situations et embranchements, jamais rails ;
- `CAMPAIGN-ARCS` : arcs préparés des compagnons ;
- `CAMPAIGN-STORYLETS` : scènes conditionnelles dédupliquées ;
- `CAMPAIGN-CLOCKS` : horloges et conséquences différées ;
- `CAMPAIGN-SEALED` : vérité cachée, solutions et embranchements non découverts.

## G — Références et contrôle qualité

- `REF-GLOSSARY` : noms, termes et identifiants ;
- `REF-INDEX` : index par région, personnage, règle et thème ;
- `REF-PROVENANCE` : source et statut de chaque bloc ;
- `QA-CONFLICTS` : contradictions et décisions ;
- `QA-DUPLICATES` : doublons et source retenue ;
- `QA-TESTS` : tests d’agence, voix, canon, létalité et secrets.

---

# 12. Gabarits d’intégration

## `TPL-CANON-BLOCK`

```yaml
id: IDENTIFIANT-STABLE
title: Titre lisible
access: PUBLIC_WORLD | LOCAL_KNOWLEDGE | DISCOVERABLE | HIDDEN_MJ | ARCHIVE_NON_CANON
status: CANON | EXTENSION_VALIDEE | A_ARBITRER | ARCHIVE
authority: github_state | load_game_rules | master | v3_2 | validated_conversation
provenance:
  - source: chemin, section ou tour
supersedes: []
conflicts_with: []
used_by: []
```

## `TPL-NPC`

Identité ; accès ; faits publics ; apparence ; voix ; valeurs ; objectifs ; moyens ; contradictions ; connaissances sourcées ; relations multidimensionnelles ; lignes rouges ; habitudes ; comportements sous pression ; autonomie hors champ ; évolution observée ; secrets séparés.

## `TPL-LOCATION`

Région ; accès ; fonction ; occupants ; autorité ; ressources ; dangers ; état courant chargé ; savoir public ; savoir local ; vérités découvrables ; secrets ; indices ; changements possibles.

## `TPL-RULE`

Déclencheur ; préconditions ; procédure ; jet éventuel ; résultat ; coût ; trace ; contre-mesure ; permanence ; interaction avec l’état GitHub ; exemple bref.

---

# 13. Registre des contradictions

| ID | Sujet | Constat | Décision de consolidation |
|---|---|---|---|
| `CON-001` | Autorité de sauvegarde | V3.2 place `VEY_SAVE_V2` au sommet ; le bootstrap actuel impose GitHub `main` via `load_game` | **Résolu :** GitHub gagne ; capsules archivées |
| `CON-002` | Fin de tour | V3.2 exige une capsule complète en fin de réponse ; le bootstrap impose exactement un `save_turn` avant narration | **Résolu :** `save_turn` remplace la capsule conversationnelle |
| `CON-003` | Ordre charger/narrer | V3.2 décrit un pipeline local ; Cloud Save renvoie `persistence`, `narration_rules`, `current`, `world`, `recentEvents`, `hidden` | **Résolu :** ordre Cloud Save obligatoire, pipeline V3.2 conservé à l’intérieur du tour |
| `CON-004` | Sensations de Mehdi | Certains passages V3.2 permettent douleur/vertige objectifs ; l’agence interdit toute sensation intérieure prêtée | **Clarifié :** décrire l’effet corporel établi sans conclure à une émotion, pensée ou décision |
| `CON-005` | Cadence narrative | V3.2 privilégie un beat significatif par tour ; le style roman validé autorise plusieurs échanges et actions triviales | **Résolu :** un mouvement narratif cohérent peut contenir plusieurs micro-beats, arrêt aux décisions importantes |
| `CON-006` | Moralité et brutalité | Certains modules anti-sanitisation risquent d’être lus comme permission d’escalade gratuite | **Résolu :** normes internes des PNJ + causalité + sécurité OOC ; aucune brutalité automatique |
| `CON-007` | Mirevase / Namarre | Les usages peuvent laisser croire à deux noms concurrents | **Résolu et intégré en P3 :** Namarre est la région ; Mirevase sa ville principale |
| `CON-008` | Extérieur d’Orvane | Néréth, Varne et Edras sont archivés ; Thyrane, Kars et Iskar ont été validés ensuite | **Résolu et intégré en P3 :** anciens ensembles non canoniques ; nouveaux horizons limités et non monolithiques |
| `CON-009` | Bestiaire | Une première liste générique et un bestiaire écologique coexistent avec des noms ou fonctions proches | **Résolu en P3 :** fiches écologiques identifiées prioritaires ; anciens profils gardés comme catégories/variantes à ne pas fusionner automatiquement |
| `CON-010` | Progression surnaturelle | V3.2 contient rites, pactes, greffes et corruption ; les extensions ajoutent une progression orientée par usage | **Résolu en P3 :** lois et coûts V3.2 conservés ; progression seulement par origine et évolution jouées |
| `CON-011` | Mornac / Fours | `Mornac-des-Fours` à Valdorne concurrence Mornac, cité côtière | **Résolu et intégré en P3 :** Mornac est la ville ; les Fours le secteur valdornais ; ancien nom conservé historiquement |
| `CON-012` | Nœrel / Naerel | Carte et corpus emploient deux graphies | **Résolu et intégré en P3 :** `Nœrel` canonique ; `Naerel` alias fautif de recherche |
| `CON-013` | Titre d’Aveline | Ancienne fiche : « Fours de Mornac », incompatible avec l’arbitrage P3 | **Résolu en P6 sans rouvrir P3 :** fonction préparée liée aux Fours de Valdorne ; état actuel par GitHub |
| `CON-014` | Habitat du Chien de Suie | Fiche V3.2 emploie `Mornac-des-Fours` tout en mentionnant la Côte | **Résolu en P7 par P3 :** les Fours de Valdorne et les milieux charbonniers côtiers sont deux habitats distincts ; populations par GitHub |
| `CON-015` | Nœuds Mornac/Fours | Plusieurs nœuds anciens emploient Mornac pour le secteur valdornais | **Résolu en P8 par P3 :** identifiants conservés ; situations interprétées comme Fours de Valdorne |
| `CON-016` | Storylet de mort | `ST-DEATH-MEHDi-03` diffère seulement par la casse | **Résolu en P8 :** `ST-DEATH-MEHDI-03` canonique ; ancienne forme alias |

---

# 14. Registre des doublons

`A_ARBITRER` dans le gabarit ci-dessus demeure une valeur disponible pour une future proposition ; aucun bloc actuel du Master ne porte ce statut.

| ID | Blocs concernés | Traitement final |
|---|---|---|
| `DUP-001` | Instructions projet, constitution du MJ, README, rapport d’application | **Résolu en P2 :** une seule constitution `AUTH-*`; les autres ne valent plus que comme provenance ou QA |
| `DUP-002` | Moteur relationnel et dossier psychologique d’Aveline répété | **Résolu en P2/P6 :** principes dans `NPC-*` / `REL-*`; fiche unique `NPC-AVELINE` |
| `DUP-003` | Antagonistes dans les fichiers 14 et 23, plus données 14A/23A | **Résolu en P6 :** une fiche scellée par `ANT-*`; projections structurées conservées comme vues |
| `DUP-004` | Storylets dans les fichiers 13, 13A, 40 et 40 YAML | **Résolu en P8 :** registre unique de 40 identifiants ; contenu non canonique avant activation |
| `DUP-005` | Mortalité dans les fichiers 20 et 60 | **Résolu en P4 :** `RULE-INJURY` devient la référence ; doublon tardif vaut validation historique |
| `DUP-006` | Réputation et preuves dans 18/19 puis 61 | **Résolu en P5 :** chaînes `EVIDENCE-*`, `RUMOR-*` et `REPUTATION-*` uniques |
| `DUP-007` | Compagnons en prose, YAML, arcs, décisions autonomes et storylets | **Résolu en P6/P8 :** fiche centrale par PNJ ; arcs et scènes référencés séparément |
| `DUP-008` | Trame 60 nœuds, trame directe, graphe et nœuds schématisés | **Résolu en P8 :** registre unique de 60 nœuds ; prose, conditions et graphe deviennent vues |
| `DUP-009` | Bestiaire en prose et JSON | **Résolu en P3/P4/P7 :** lore, statistiques et chaînes séparés ; JSON reste projection structurée |
| `DUP-011` | Monde concret V3.2 et extensions de conversation | **Résolu en P3 :** `WORLD-*`, `REG-*`, `CITY-*` et `RULE-*` deviennent références ; extensions ne valent jamais événements passés |
| `DUP-012` | Combat, mortalité et mécaniques létales répétés | **Résolu en P4 :** `RULE-COMBAT`, `RULE-INJURY` et modules associés deviennent références uniques |
| `DUP-013` | Statistiques de créatures en prose et JSON | **Résolu en P4 :** table `BESTIARY-STATS` pour espèces écologiques ; JSON reste projection structurée |
| `DUP-014` | Témoins, preuves, rumeurs et réputation répétés dans les modules 18, 19 et 61 | **Résolu en P5 :** `KNOW-*`, `EVIDENCE-*`, `RUMOR-*` et `REPUTATION-*` deviennent références uniques |
| `DUP-015` | Monde autonome, factions, fan-out et tours du monde dispersés | **Résolu en P5 :** `WORLD-TURN`, `AGENT-*`, `CLOCK-*`, `FANOUT-*`, `ECON-*` et `ECOLOGY-*` deviennent références |
| `DUP-016` | Antagonistes identiques dans les fichiers 14 et 23, plus projections structurées | **Résolu en P6 :** un dossier scellé par identifiant ; registre synthétique dans le Master |
| `DUP-017` | Compagnons répartis entre fiches, mémoire, décisions et arcs | **Résolu en P6/P8 :** fiche de référence par personnage ; arcs et scènes dans les registres scellés |
| `DUP-018` | Écologie répartie entre fiches, JSON, monde actif et extensions | **Résolu en P7 :** index unique des chaînes ; statistiques restent en P4 et projections vivantes en P5 |
| `DUP-019` | Trame 60 nœuds, trame directe, schéma et graphe YAML | **Résolu en P8 :** un registre et un schéma uniques ; formats historiques deviennent projections |
| `DUP-020` | Arcs en prose et YAML | **Résolu en P8 :** neuf arcs de cinq beats sous identifiants uniques |
| `DUP-021` | Storylets dans banques 13/13A et 40 prose/YAML | **Résolu en P8 :** registre unique de 40 storylets ; ouvertures non canoniques avant jeu |
| `DUP-010` | Tests dispersés et matrice finale | **Résolu en P2 pour le noyau :** `QA-CORE` devient la suite de référence ; tests spécialisés restent dans leurs futurs domaines |

---

# 15. Extensions validées

Ces ensembles ont été validés dans la conversation de worldbuilding. Les domaines de monde sont désormais intégrés en passe 3 ; leurs données vivantes éventuelles restent soumises à GitHub :

1. identité historique d’Orvane et Cinq Garanties ;
2. pouvoirs et institutions de la Couronne ;
3. cultures régionales et différences internes ;
4. économie quotidienne, monnaie, prix, salaires, crédit et dette ;
5. famille, foyer, lignée, mariage, filiation, héritage et enfance ;
6. religion populaire, doctrine, rites et superstitions ;
7. justice, crime, preuves, juridictions et violence contextualisée ;
8. guerre, armées, mercenaires, sièges et logistique ;
9. armes remarquables, artefacts existants et place culturelle des armes ;
10. villes et atlas pratique : Valdorne, Mirevase/Namarre, Kérel et lieux secondaires ;
11. extérieur d’Orvane : Thyrane, terres de Kars et hautes routes d’Iskar ;
12. chaînes écologiques, ressources surnaturelles et conséquences des proliférations/disparitions ;
13. pouvoirs et progression surnaturelle de Mehdi sans destin imposé ;
14. narration non aseptisée, voix distinctes, autonomie des PNJ et relations uniques ;
15. narration romanesque continue et profil dynamique descriptif de Mehdi.
16. sexualité, consentement, mœurs régionales, santé reproductive et conséquences sociales sans état vivant présumé.

Règle de portée : l’extérieur et les lieux lointains ne sont détaillés davantage que lorsqu’ils entrent réellement en jeu.

---

# 16. Ordre d’intégration complète

1. **Passe 2 — Noyau : terminée.** Transaction de tour, mémoire, secrets, narration, agence, jets et QA sont consolidés dans `TURN-*`, `EVENT-*`, `MEM-*`, `REL-*`, `NPC-*`, `SCENE-*` et `QA-*`.
2. **Passe 3 — Monde : terminée.** Invariants, géographie, régions, cultures, institutions, économie, droit, famille, langues, religion, guerre, villes, vie quotidienne, extérieur, magie, progression surnaturelle, armes, artefacts et écologie sont consolidés.
3. **Passe 4 — Atlas et systèmes physiques : terminée.** Lieux secondaires, combat, blessures, fatigue, voyage, profils humains et statistiques du bestiaire sont consolidés.
4. **Passe 5 — Réputation et monde actif : terminée.** Témoins, preuves, rumeurs, publics, chaleur, factions, agents, horloges, fan-out, économie et écologie hors champ sont consolidés.
5. **Passe 6 — Personnages préparés : terminée.** Mehdi, compagnons, PNJ majeurs, voix, autonomie conditionnelle et douze antagonistes scellés sont consolidés sans état vivant présumé.
6. **Passe 7 — Écologie : terminée.** Bestiaire dédupliqué, chaînes de milieu, ressources surnaturelles, collecte et conséquences écologiques sont consolidés sans population présumée.
7. **Passe 8 — Campagne scellée : terminée.** Fronts, 60 nœuds, neuf arcs, 40 storylets, accès aux secrets et liaison GitHub sont consolidés sans activation présumée.
8. **Passe 9 — Validation : terminée.** Index, provenance, priorités, alias, cardinalités, contradictions, doublons, état courant et contrôle de fuite MJ sont audités.
9. **Passe 10 — Inventaire des Sources : terminée.** Bootstrap, carte et corpus concaténé ont été comparés sans modification du miroir synchronisé.
10. **Passe 11 — Intimité : terminée.** Sexualité, consentement, variations régionales, santé et conséquences sociales sont intégrés sans relation ni état courant présumé.
11. **Passe 12 — Migration du corpus : terminée.** Les 56 blocs V3.2 sont classés ; 39 détails utiles sont extraits et cloisonnés ; anciennes sauvegardes et autorités restent hors des Sources actives.
12. **Passe 13 — Persistance renforcée : terminée.** Registre HIDDEN, profil de Mehdi, mémoire par chapitres, accès ciblé au Master et reprise idempotente sont actifs.
13. **Passe 14 — Jets et caractéristiques : terminée.** Fiche mécanique courante, hasard serveur, difficultés, marges, résolution sociale et affichage obligatoire des jets publics sont intégrés.

Critère de fin : chaque information canonique n’existe qu’à un endroit de référence, possède un identifiant stable, une classe d’accès, une provenance et des liens vers ses usages.

---

# 17. Archives explicitement non canoniques

Ne jamais fusionner automatiquement dans Orvane : Néréth, Edras, Varne, Mehdi Veyr, Darian Veyr, Mira Veyr, Edran Korr, le système à sept attributs, les Six Courants, `VEY_SAVE_V1`, `Codex_Vivant_COMPLET_v1.0.md`, `04_SAUVEGARDE_CAMPAGNE.md` et `PC-NER-0001_MEHDI_VEYR.md`.

Une reprise d’idée exige une décision OOC explicite, une adaptation complète et un nouvel enregistrement canonique. Une ressemblance de nom ne suffit jamais.

---

# 18. Checklist silencieuse avant toute future publication du Master

- l’autorité GitHub reste première ;
- aucun état vivant n’a été inventé depuis une capsule historique ;
- aucune donnée `HIDDEN_MJ` n’a glissé dans une section publique ;
- aucun doublon n’introduit deux valeurs concurrentes ;
- chaque arbitrage est explicite et traçable ;
- l’interprétation courante déléguée de Mehdi respecte `PLAY-AGENCY` et s’arrête avant tout choix majeur ;
- chaque PNJ conserve voix, connaissances, intérêts et autonomie ;
- les relations restent multidimensionnelles ;
- les règles de létalité, causalité et jets restent cohérentes ;
- le contenu demeure utilisable en jeu et retrouvable rapidement.

---

# 19. P13 — Durcissement de la mémoire persistante

## `MEM-HIDDEN-PRESERVE` — Registre caché non destructif

`state/HIDDEN.yaml` conserve le registre des emplacements non résolus sans inventer leur valeur. Un client ancien ou un document complet incomplet ne peut plus supprimer silencieusement ce registre : le serveur fusionne les champs omis avec l’état GitHub chargé et bloque toute disparition non explicitement résolue.

La restauration technique effectuée après le tour 720 reprend uniquement les chemins non résolus attestés au dernier commit intact. Elle ne restaure aucune valeur secrète, ne crée aucun fait et n’avance ni le tour ni la fiction.

## `MEM-MEHDI-PROFILE` — Continuité descriptive du protagoniste

`state/MEHDI_PROFILE.yaml` conserve les directions explicitement données par le joueur et les comportements démontrés avec leurs `event_id`. Il sert aux répliques, gestes et micro-décisions délégués. Toute tendance reste révisable, accepte les contre-exemples et ne devient jamais émotion intérieure, connaissance ou choix majeur automatique.

## `MEM-CHAPTERS` — Mémoire rapide par chapitres

`state/NARRATIVE_MEMORY.yaml` indexe la campagne par tranches de 50 tours. Chaque résumé cite ses événements, signale sa couverture et reste inférieur au journal append-only. Une tranche nouvelle peut être marquée `summary_due` jusqu’à production d’un résumé attesté ; aucun texte manquant n’est comblé par invention.

## `MASTER-TARGETED-ACCESS` — Recherche ciblée du référentiel

Le Master complet réside aussi dans GitHub sous `reference/VEY_RUNE_MASTER.md`. `load_game` ne charge que son index léger ; le MJ utilise `search_master`, puis `fetch_master_section`, afin de récupérer le domaine nécessaire sans injecter l’ensemble du document à chaque tour. Toute section demeure soumise au cloisonnement et à l’état vivant.

## `SAVE-IDEMPOTENT-RECOVERY` — Réponse réseau perdue

Si GitHub a reçu le commit mais que la réponse de `save_turn` disparaît, `check_save_status` vérifie le `save_id` et le dernier `event_id`. Une répétition exacte reconnue retourne `already_committed` au lieu de produire un second tour ou une fausse erreur de continuité.

## `VALIDATION-SINGLE-PATH` — Contrôles alignés

Le validateur local et le Worker partagent les invariants de `HIDDEN`. Les pushes directs comme les pull requests vérifient l’append-only. Profil, mémoire, projections, checkpoint et journal sont synchronisés dans le même commit atomique.

---

# 20. P14 — Jets, caractéristiques et lisibilité mécanique

## `MECH-SHEET-PERSISTENT` — Fiche actuelle de Mehdi

`state/MEHDI_SHEET.yaml` restaure techniquement les valeurs attestées par le dernier snapshot complet `VEY-0724`, tour 714, après vérification des événements jusqu’au tour courant. Cette restauration ne modifie aucune valeur, n’ajoute aucun progrès et n’avance pas la fiction. La fiche devient ensuite une projection atomique : chaque tour la synchronise, et tout changement exige un événement mécanique explicite. Elle conserve également ressources, argent, partage non résolu et objets attestés afin qu’une fiche dite courante ne perde pas silencieusement l’inventaire du personnage.

## `MECH-RANDOM-SERVER` — Dés impartiaux

`roll_dice` produit les dés au moyen du générateur cryptographique du Worker, sans créer de tour. Le jet est lié au `headSha` chargé et au prochain `save_id`, puis signé par un `roll_receipt`. Le MJ reprend exactement le reçu, le `roll_id` et les valeurs obtenues dans l’événement du test. `save_turn` refuse un dé modifié, un reçu falsifié ou un reçu réutilisé pour un autre tour. Le MJ ne choisit, ne corrige et ne relance jamais les dés pour obtenir une issue narrative.

## `MECH-CHECK-VALIDATE` — Validation sans dé

Avant un test mécanique structuré, `validate_check` vérifie au même `headSha` l’acteur, sa caractéristique, sa maîtrise, les modificateurs déclarés et l’opposition. Aucun dé n’est lancé pendant cette étape. Une fiche absente retourne `ACTOR_UNRESOLVED` ; une statistique adverse absente retourne `OPPOSITION_UNRESOLVED`. Le MJ ne remplace jamais ce refus par une valeur improvisée.

## `MECH-CHECK-SERVER` — Résolution complète signée

Après validation, `roll_check` relit le même canon, tire `2d10` par le générateur cryptographique du Worker, puis calcule caractéristique, maîtrise, modificateurs, total, opposition, marge et degré. Le reçu est lié au `headSha`, au prochain `save_id`, à l’acteur, à l’action et à toute la résolution. `save_turn` refuse un dé, une valeur, un total, une marge, un degré ou une projection publique modifiés.

Le transfert recommandé entre les deux outils est atomique : le MJ recopie intact dans l’événement le petit bloc `signed_check` renvoyé par `roll_check`. À partir de son reçu, `save_turn` reconstruit lui-même `roll_id`, notation, dés, total et `mechanical_check` avant d’écrire le journal. Les anciens événements qui répètent ces champs restent compatibles, mais toute valeur répétée doit être identique au reçu. Un champ redondant oublié ne peut donc plus invalider un jet authentique, tandis qu’une altération demeure impossible.

`roll_dice` reste la primitive des hasards sans résolution complète : dégâts, localisation, table ou autre tirage explicitement demandé par une règle. Il ne remplace pas `roll_check` lorsqu’un test dépend de statistiques.

## `MECH-CHECK-VISIBILITY` — Deux projections sans fuite

`gm_resolution` contient la résolution complète nécessaire au MJ. `public_display` contient uniquement ce qui peut être montré au joueur. Lorsque l’opposition est cachée, sa valeur, la marge et le degré exacts ne figurent pas dans `public_display`. Le reçu complet est chiffré et authentifié : il peut être vérifié par `save_turn` sans publier les statistiques secrètes.

## `MECH-PROFILE-INDEX` — Profils mécaniques et état vivant

`reference/MECHANICAL_PROFILES.json` est un index lisible par le serveur, strictement subordonné aux profils numériques du Master. Une entrée de cet index ne crée jamais une personne ou une créature dans la campagne. Elle devient applicable seulement lorsqu’un acteur vivant de `state/` référence explicitement son `mechanical_profile_id` ou lorsque P15 crée causalement sa fiche nommée exacte ; les valeurs directes et états sauvegardés de cette instance prévalent.

## `MECH-GENERIC-NPC-PROFILES` — Secours persistant pour PNJ improvisés

Un PNJ vivant sans fiche individuelle peut recevoir un profil générique avant son premier test mécanique. Ce choix se fonde sur ce que la fiction a déjà établi, jamais sur les valeurs de Mehdi ni sur l'issue désirée. L'attribution fournit `target_ref`, `profile_id`, `basis`, `rationale` et `evidence_refs` à `validate_check`, puis à `roll_check`.

| Profil | E/D/P | Capacités utiles | Maîtrises utiles | Condition d'emploi |
|---|---:|---|---|---|
| `NPC-CIVIL-ORDINARY` | 5/10/0 | toutes 0 | aucune | seul défaut minimal autorisé sans compétence établie |
| `NPC-WORKER-ROBUST` | 8/10/0 | Vigueur 2, Volonté 1 | Athlétisme 2, Artisanat 1 | travail physique ou robustesse explicitement établis |
| `NPC-GUARD-AVERAGE` | 8/12/2 | Vigueur 2, Adresse 1, Instinct 1, Volonté 1 | Mêlée 2, Athlétisme 1, Vigilance 1 | garde ordinaire réellement identifié ou équivalent |
| `NPC-MERCENARY-TRAINED` | 10/13/2 | Vigueur 2, Adresse 2, Instinct 2, Volonté 2 | Mêlée 3, Athlétisme 2, Vigilance 2, Intimidation 1 | entraînement professionnel établi |
| `NPC-VETERAN` | 12/14/3 | Vigueur 3, Adresse 2, Instinct 3, Raison 1, Volonté 3, Présence 1 | Mêlée 4, Athlétisme 3, Vigilance 3, Intimidation 2, Commandement 2 | expérience durable et dangereuse attestée |
| `NPC-SPECIALIST-AGILE` | 8/15/1 | Vigueur 1, Adresse 3, Instinct 3, Raison 1, Volonté 2, Présence 1 | Mêlée 2, Athlétisme 2, Mobilité 4, Furtivité 3, Vigilance 3 | agilité ou spécialisation perceptible et établie |
| `NPC-COMBATANT-ELITE` | 14/15/3 | Vigueur 3, Adresse 3, Instinct 3, Raison 1, Volonté 3, Présence 2 | Mêlée 4, Athlétisme 4, Mobilité 3, Vigilance 3, Intimidation 3, Commandement 3 | statut d'élite démontré par plusieurs faits canoniques |
| `NPC-MASTER-CHAMPION` | 16/16/4 | Vigueur 4, Adresse 4, Instinct 4, Raison 2, Volonté 4, Présence 3 | Mêlée 5, Athlétisme 5, Mobilité 4, Vigilance 4, Intimidation 3, Commandement 4 | maître ou champion rarissime ; exige au moins trois preuves canoniques distinctes |

`E/D/P` signifie Endurance, Défense et Protection. Toute capacité ou maîtrise non indiquée vaut 0. Un profil est un socle, pas une identité ni une présence. Les valeurs individuelles déjà sauvegardées prévalent.

Lorsque le profil est utilisé pour lancer les dés, `roll_check` le verrouille dans le reçu et renvoie `required_profile_persistence`. Le même `save_turn` doit enregistrer sous la cible `HIDDEN` le `mechanical_profile_id` et l'objet `mechanical_profile_assignment` exact. Une omission, une attribution sans reçu, une altération ou une réattribution future est bloquée. Si les faits ne permettent aucun choix légitime, `OPPOSITION_UNRESOLVED` demeure la bonne réponse.

## `MECH-PREPARED-COMPANION-PROFILES` — Fiches mécaniques préparées sans activation

Les fiches `CHAR-*` ci-dessous sont des calibrations mécaniques `STATIC_PREPARED`. Elles ne prouvent ni présence, ni rencontre, ni compagnonnage actuel, ni équipement, ni blessure, ni survie. Elles deviennent vivantes seulement si GitHub établit l’instance correspondante puis si un premier jet signé ou un changement causal P15 initialise son identifiant exact. Une fiche nommée ne peut jamais être attribuée à un autre acteur.

| Fiche | E/D/P | Capacités | Maîtrises principales | Provenance mécanique |
|---|---:|---|---|---|
| `CHAR-AVELINE-SOR` | 12/15/3 | Vig 2, Adr 3, Ins 2, Rai 1, Vol 2, Pré 1 | Mêlée 4, Athlétisme 3, Vigilance 3 | valeurs attestées par `VEY-0719R`; les 11/12 Endurance de ce checkpoint restent un état historique, pas son état actuel |
| `CHAR-SIVE` | 10/14/2 | Vig 2, Adr 3, Ins 4, Rai 3, Vol 3, Pré 3 | Mêlée 3, Furtivité 4, Vigilance 4, Tromperie 4, Mobilité 3 | reconstruction OOC P14.4 : éclaireuse, infiltratrice et agente de terrain |
| `CHAR-LYSA` | 10/13/1 | Vig 1, Adr 2, Ins 3, Rai 4, Vol 4, Pré 3 | Médecine 4, Vigilance 4, Influence 4, Érudition 3, Rites 2 | reconstruction OOC P14.4 : soigneuse, observatrice et négociatrice |
| `CHAR-ALDREN-VAUL` | 16/16/4 | Vig 4, Adr 4, Ins 4, Rai 2, Vol 4, Pré 3 | Mêlée 5, Athlétisme 5, Vigilance 4, Commandement 4, Équitation 4 | calibration P14.3 de maître militaire préparé |
| `CHAR-ADRASTE-DE-LICE` | 12/15/3 | Vig 3, Adr 3, Ins 3, Rai 2, Vol 3, Pré 3 | Mêlée 4, Athlétisme 3, Vigilance 3, Commandement 4, Équitation 4 | calibration P14.3 d'héritière guerrière préparée |
| `CHAR-ILYE-NAMAR` | 8/12/1 | Vig 1, Adr 2, Ins 2, Rai 4, Vol 3, Pré 3 | Vigilance 3, Érudition 3, Influence 3, Commandement 4, Navigation 3 | calibration P14.3 d'organisatrice et logisticienne préparée |
| `CHAR-EREN-CORDES-ROUGES` | 9/15/1 | Vig 1, Adr 4, Ins 4, Rai 2, Vol 3, Pré 2 | Tir 3, Mobilité 4, Furtivité 4, Vigilance 3, Survie 3, Tromperie 3, Équitation 4 | calibration P14.3 de cavalier, messager et contrebandier préparé |
| `CHAR-IRMINE-DERNIERE-PORTE` | 9/12/2 | Vig 1, Adr 1, Ins 2, Rai 4, Vol 4, Pré 3 | Vigilance 3, Érudition 4, Rites 5, Médecine 2 | calibration P14.3 de gardienne rituelle préparée |
| `CHAR-DAREL-ONNE` | 8/11/1 | Vig 1, Adr 2, Ins 2, Rai 5, Vol 3, Pré 2 | Médecine 5, Artisanat 4, Érudition 4, Rites 3 | calibration P14.3 de médecin des liaisons préparé |
| `CHAR-YSRA-KELD` | 13/14/2 | Vig 4, Adr 3, Ins 4, Rai 1, Vol 3, Pré 2 | Mêlée 4, Athlétisme 4, Vigilance 4, Survie 5, Tir 3 | calibration P14.3 de chasseuse des Marches préparée |
| `CHAR-VAERA-NHAL` | 9/14/1 | Vig 1, Adr 3, Ins 4, Rai 4, Vol 4, Pré 5 | Vigilance 4, Influence 5, Tromperie 5, Commandement 4 | calibration P14.3 d'organisatrice sociale préparée |

Les valeurs directes, blessures, Endurance actuelle, équipement et techniques sauvegardés pour une instance prévalent toujours. Aveline conserve comme techniques attestées `angle_vivant` et `interception_d_amorce`; aucune technique nouvelle n'est créée pour les autres fiches.

Les données anciennes de Sive et Lysa ayant été perdues, leur reconstruction P14.4 est une **extension OOC explicitement autorisée**, pas la récupération prétendue d'une vérité cachée. Elle fixe seulement leurs rôles et bases mécaniques à partir de maintenant. Elle ne leur invente aucun ancien exploit, équipement, secret, souvenir, localisation ou événement. La compagne `Lysa` reste une identité propre, distincte de Lysa Onne et de l'inspectrice Lysa Venn tant qu'un futur fait GitHub n'établit pas volontairement un lien.

## `MECH-PUBLIC-DISPLAY` — Jets visibles

Tout jet dont l’existence et l’opposition sont publiques est affiché ainsi, sans être noyé dans la prose :

```text
🎲 Test — Intimidation
2d10 [7, 10] + Présence 1 + Intimidation 2 + situation 0 = 20
DD 17 • marge +3 • réussite
Conséquence : le comportement obtenu ou le prix subi.
```

La règle vaut aussi pendant une conversation. L’absence de jet est normale pour une simple question, une déclaration, une information certaine ou une action sans conséquence significative.

## `MECH-HIDDEN-ROLL` — Opposition sensible

Si révéler le DD, la marge ou même la nature exacte de l’opposition dévoilerait un secret, la réponse montre les dés, les valeurs publiques et le total de Mehdi, puis `opposition cachée` et l’effet perceptible. Le détail complet est conservé uniquement dans `HIDDEN`. Un test caché ne peut jamais être utilisé pour annoncer au joueur une vérité que Mehdi n’a pas découverte.

---

# 21. P15 — Fiches vivantes des compagnons

## `COMP-LIVE-SHEETS` — Projection actuelle sans activation rétroactive

Les profils `CHAR-*` de P14 restent des bases `STATIC_PREPARED`. Une fiche vivante n’existe dans `HIDDEN.companion_sheets` qu’après un événement canonique du tour : soit le premier test signé du personnage, soit un `companion_change` qui cite cet événement. Une opération OOC, l’existence d’une fiche préparée, une ancienne relation ou une localisation non résolue ne suffit jamais.

À sa première activation légitime, le serveur initialise exactement Endurance maximale, Défense, Protection, capacités, maîtrises et techniques préparées du profil correspondant. Cette initialisation ne crée aucun ancien exploit, équipement, souvenir, secret, lien, blessure ou événement. Les écarts ultérieurs deviennent l’état vivant GitHub et prévalent sur la base P14.

Les jets suivants d’un compagnon utilisent sa projection vivante `hidden:companion_sheets.<CHAR-ID>`. Ils prennent donc en compte blessures, progression et autres valeurs effectivement enregistrées, au lieu de revenir silencieusement au profil préparé.

## `COMP-CAUSAL-CHANGES` — Mutation contrôlée et journal append-only

Toute modification de fiche passe par `save_turn.companion_changes`. Chaque entrée nomme `change_id`, `profile_id`, `character_key`, domaine, chemin, opération, valeur `before`, valeur `after`, cause, `source_event_id` et durée ; l’événement source cite aussi le profil dans `companion_refs`. Le serveur vérifie l’identité nommée, l’existence de l’événement dans le tour, l’ancien état exact, les bornes mécaniques et la cohérence de durée ; il applique ensuite la mutation et ajoute une trace à `HIDDEN.companion_change_log`.

Le client ne modifie jamais directement `companion_sheets` ou `companion_change_log`. Une écriture directe, un événement absent, un `before` faux, un identifiant réutilisé ou une progression artificiellement gonflée est refusé. Une capacité, une maîtrise, l’Endurance maximale, la Défense ou la Protection ne progresse pas de plus de +1 par événement ; une évolution supérieure exige plusieurs causes réellement jouées.

Les domaines suivis sont : mécanique et ressources ; blessures et séquelles ; équipement ; techniques ; relations ; émotions ; objectifs personnels. Une réaction passagère sans conséquence future peut rester dans la scène. Dès qu’elle influe durablement sur la conduite, une relation ou un objectif, elle devient un changement causal sauvegardé.

## `COMP-RELATION-EMOTION` — Mémoire relationnelle sans jauge magique

Une relation persistante conserve au minimum sa cible, plusieurs dimensions éventuelles, ses événements-ancres, promesses, dettes et limites. Les nombres ne sont que des résumés internes bornés ; ils ne remplacent jamais les faits ni les objectifs du PNJ. Un geste positif n’efface donc pas automatiquement une humiliation, une dette, une divergence morale ou une peur antérieure.

Les émotions momentanées et durables restent séparées. Toute émotion enregistrée cite son événement source et son intensité ; une émotion durable exige une durée durable ou permanente. Elle ne devient ni omniscience, ni obligation de romance, de pardon, de loyauté ou de trahison. Les objectifs personnels conservent leur propre statut et peuvent évoluer indépendamment de Mehdi.

## `COMP-NO-CURRENT-STATE-CREATED` — État courant inchangé par P15

L’intégration de P15 est strictement OOC et technique. Elle n’ajoute aujourd’hui aucune fiche à `state/HIDDEN.yaml`, ne localise aucun compagnon, ne crée aucune présence, alliance, blessure, émotion, relation ou objectif, et n’avance ni le tour ni le temps. Les registres vivants apparaîtront uniquement lorsqu’un futur tour canonique en fournira la cause.
