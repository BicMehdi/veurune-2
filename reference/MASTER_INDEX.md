# Index ciblé du Master Veyrune

> Document d’orientation MJ. Le référentiel complet est `reference/VEY_RUNE_MASTER.md`. Cet index ne crée aucun état courant et ne remplace jamais GitHub `state/`.

## Ordre d’usage

1. Charger `load_game`.
2. Appliquer `persistence`, puis `narration_rules`.
3. Utiliser `search_master` seulement pour le domaine nécessaire à la scène.
4. Récupérer une section précise avec `fetch_master_section`.
5. Ne jamais transformer une possibilité préparée ou une donnée `HIDDEN_MJ` en événement courant sans preuve dans l’état GitHub.

## Domaines consolidés

- `P1` — autorité, hiérarchie, cloisonnement et architecture documentaire ;
- `P2` — moteur narratif, causalité, autonomie des PNJ, relations, mode roman et profil de Mehdi ;
- `P3` — monde d’Orvane : géographie, cultures, institutions, économie, religion, justice, guerre, villes et quotidien ;
- `P4` — mécaniques, jets, statistiques, combat, blessures, voyage et progression ;
- `P5` — circulation de l’information, réputation, chaleur, factions, horloges et conséquences autonomes ;
- `P6` — personnages, compagnons et antagonistes préparés ;
- `P7` — écologie, ressources, exploitation, créatures et variantes ;
- `P8` — fronts, nœuds, arcs, storylets et contenu dormant ;
- `P9-P12` — audits, provenance, extensions sociales, détails archivés et contrôles de non-régression.
- `P13` — mémoire persistante, HIDDEN non destructif, profil, chapitres et reprise idempotente ;
- `P14` — fiche mécanique, difficultés, marges, jets sociaux, dés serveur, profils génériques persistants et fiches préparées des compagnons.
- `P15` — fiches vivantes des compagnons, blessures, équipement, progression, relations, émotions, objectifs et journal causal serveur.
- `P16` — classement fonctionnel des PNJ, conception cachée pré-jet et verrouillage conjoint de la classe et du profil.
- `P16.1` — transfert MCP structuré de `signed_check`, reçu compressé et lecture rétrocompatible des reçus P16.
- `P16.2` — DD signé et public pour toute opposition directement perceptible, sans révéler le profil source.

## Accès mécanique rapide

- `TURN-RESOLVE` — quand lancer, DD et marges ;
- `RULE-CHARACTER-VALUES` — capacités, maîtrises et valeurs ;
- `RULE-SOCIAL-CHECKS` — dialogues à enjeu et oppositions ;
- `MECH-SHEET-PERSISTENT` — fiche mécanique courante ;
- `MECH-RANDOM-SERVER` — génération impartiale ;
- `MECH-CHECK-SERVER` — résolution signée et transfert atomique par `structuredContent.signed_check` ;
- `MECH-NPC-FUNCTIONAL-CLASSIFICATION` — `incidental`, `established`, `important`, `mysterious` et `important_mysterious` sans présumer la puissance ;
- `MECH-GENERIC-NPC-PROFILES` — huit profils génériques, du civil au maître/champion ;
- `MECH-PREPARED-COMPANION-PROFILES` — onze fiches nommées sans activation implicite ;
- `MECH-PUBLIC-DISPLAY` — présentation obligatoire ;
- `MECH-HIDDEN-ROLL` — opposition sensible ;
- `COMP-LIVE-SHEETS` — projection vivante cachée des compagnons ;
- `COMP-CAUSAL-CHANGES` — changements `before/after` liés à un événement ;
- `COMP-RELATION-EMOTION` — relations multidimensionnelles, émotions et objectifs persistants.

## Cloisonnement

- `PUBLIC_WORLD` : information générale utilisable si compatible avec GitHub ;
- `LOCAL_KNOWLEDGE` : information soumise au lieu, au métier ou à la culture ;
- `DISCOVERABLE` : vérité qui exige une découverte canonique avant narration comme fait ;
- `HIDDEN_MJ` et `HIDDEN_MJ_PREPARED` : préparation réservée au MJ, jamais révélée directement ;
- `ARCHIVE_NON_CANON` : provenance ou matériau exclu du canon actuel.

Le texte d’une section récupérée reste subordonné à l’état vivant. L’existence d’une fiche, d’un secret, d’un antagoniste, d’un arc ou d’une fin ne prouve jamais son activation.
