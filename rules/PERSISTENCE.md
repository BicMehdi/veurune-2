# Invariants de persistance

1. `state/CURRENT.yaml` est l’unique état canonique courant.
2. Les fichiers `events/*.jsonl` sont append-only. Une rectification est un nouvel événement qui référence l’événement corrigé.
3. Chaque événement possède `event_id`, `save_id`, `parent_save_id`, `turn`, `event_time` et `record_time`.
4. Chaque sauvegarde narrative non racine possède un parent existant et `turn = parent.turn + 1`.
5. L’état courant correspond exactement au checkpoint terminal de la chaîne.
6. `save_id` et `turn` sont deux compteurs indépendants. Un `save_id` ne doit jamais être déduit du tour.
7. Le prochain checkpoint attendu possède comme parent le `save_id` courant, comme tour `CURRENT.turn + 1` et comme identifiant la sauvegarde explicitement suivante dans la séquence du parent.
8. Un suffixe technique comme `R` ne modifie ni le numéro de sauvegarde sous-jacent ni le tour.
9. Un checkpoint technique ne fait jamais avancer `turn`.
10. Aucun secret non découvert ne figure dans `CURRENT.yaml`, `WORLD.yaml`, `events/` ou un fichier destiné au joueur.
11. `state/HIDDEN.yaml` est réservé au MJ et ne contient aucune duplication destinée au joueur.
12. Aucun événement fictif ancien non attesté n’est créé.
13. Toute reconstruction historique incomplète est marquée `historical_reconstruction: true`, `reconstruction_status: partial` et cite au moins une source attestée.
14. Un checkpoint technique ne fait pas avancer la fiction.
15. Une suppression ou une modification d’une ligne JSONL existante bloque la validation append-only.
16. Un patch de sauvegarde ne modifie que les clés explicitement fournies. Les données absentes restent intactes ; `null` constitue une suppression explicite et un tableau fourni remplace le tableau entier. Le checkpoint complet reconstruit subit toutes les validations ordinaires avant le commit.
17. Le mode complet historique est matérialisé par fusion avec l’état GitHub chargé. Une clé omise n’est jamais interprétée comme une suppression.
18. Le registre `HIDDEN.unresolved_secrets` ne peut perdre silencieusement aucun chemin. Une découverte future doit conserver une trace explicite de la résolution au lieu d’effacer la mémoire.
19. `MEHDI_PROFILE` reste descriptif, sourcé et révisable ; il ne prescrit jamais un choix majeur. `NARRATIVE_MEMORY` est un index de rappel et ne remplace jamais les événements.
20. Une réponse réseau absente après `save_turn` se résout par `check_save_status`, jamais par une nouvelle supposition de tour.
21. `state/MEHDI_SHEET.yaml` est la projection mécanique courante visible du protagoniste. Elle reste synchronisée avec `CURRENT` et ne change que par événement mécanique explicite.
22. Tout hasard mécanique provient du serveur. Utiliser `validate_check` puis `roll_check` pour un test complet ; réserver `roll_dice` au hasard brut sans caractéristique ni opposition. Pour un test complet, recopier intact le petit bloc `signed_check` dans l’événement : `save_turn` vérifie son reçu puis reconstruit lui-même `roll_id`, notation, dés, total et `mechanical_check`. Les anciens événements qui fournissent ces champs séparément restent acceptés s’ils correspondent exactement au reçu. Le serveur lie le reçu au `headSha` et au `save_id` attendus et refuse toute modification ou réutilisation.
23. Un jet public conserve formule, valeurs, DD ou défense, total, marge, degré et conséquence. Une opposition secrète conserve son détail uniquement dans `HIDDEN` et ne publie que les éléments perceptibles.
24. `validate_check` ne lance aucun dé. Une statistique d’acteur ou d’opposition absente de l’état canonique retourne `ACTOR_UNRESOLVED` ou `OPPOSITION_UNRESOLVED` ; le MJ ne la remplace jamais par une valeur improvisée.
25. `roll_check` relit les statistiques au commit attendu, calcule le test, chiffre et authentifie la résolution complète. `public_display` est la seule projection montrable au joueur ; `gm_resolution` et le contenu du reçu restent MJ.
26. Avant le premier test d’un PNJ vivant sans fiche individuelle, `npc_class` décrit sa fonction narrative et son degré de préconstruction, jamais sa puissance : `incidental`, `established`, `important`, `mysterious` ou `important_mysterious`. Le classement cite critères, justification et sources, et précède obligatoirement les dés.
27. Un PNJ `incidental` ou `established` sans compétence établie ne reçoit que `NPC-CIVIL-ORDINARY` comme défaut minimal. Un profil spécialisé demeure possible si des faits antérieurs le justifient. Un PNJ `important`, `mysterious` ou `important_mysterious` ne peut jamais être déclaré faible par simple absence de preuve publique.
28. Pour `important`, `mysterious` ou `important_mysterious`, le MJ peut choisir secrètement un profil `NPC-*` selon la conception réelle antérieure au dé avec `basis: hidden_conception`. `validate_check` résout le classement depuis `HIDDEN`, `NPC_DESIGN_REGISTRY` ou la déclaration pré-jet ; `roll_check` signe ensuite classement, profil et jet. Le choix ne dépend jamais des valeurs de Mehdi, du dé obtenu ou de l’issue désirée.
29. Si `roll_check` renvoie `required_profile_persistence`, le même `save_turn` inscrit exactement `npc_class`, `npc_classification`, `mechanical_profile_id` et `mechanical_profile_assignment` dans `HIDDEN`. La sauvegarde refuse omission, altération, attribution hors reçu, reclassification et réattribution. `NPC-MASTER-CHAMPION` exige toujours trois références et, avec `hidden_conception`, une autorisation préparée explicite antérieure au jet.
30. Les profils `CHAR-*` sont des fiches mécaniques préparées, non des états vivants. Ils sont attribuables uniquement à leur acteur nommé réellement présent selon GitHub; ils ne créent ni rencontre, ni compagnonnage, ni localisation, ni survie.
31. Les valeurs directes sauvegardées prévalent sur la base `CHAR-*`. Endurance actuelle, blessures, équipement et techniques exigent leur propre état ou événement. Les reconstructions OOC de Sive et Lysa fournissent une base future sans fabriquer de passé, de souvenir, de localisation ou d'événement.

32. Les fiches vivantes des compagnons résident dans `HIDDEN.companion_sheets`. Elles ne sont jamais créées par une opération OOC : un premier jet signé ou un `companion_change` causé par un événement du tour est obligatoire.
33. Toute modification durable ou temporaire d’une fiche `CHAR-*` passe par `save_turn.companion_changes` avec `before`, `after`, `cause`, `source_event_id` et `duration`. L’événement source cite aussi la fiche dans `companion_refs`. Le serveur applique la mutation et ajoute son entrée à `HIDDEN.companion_change_log`; le client ne modifie jamais directement ces deux registres.
34. Blessures, équipement, techniques, progression, relations, émotions durables et objectifs personnels restent distincts. Une émotion momentanée peut disparaître avec la scène ; une relation durable conserve ses dimensions, ancres, promesses, dettes et limites au lieu d’être réduite à une jauge unique.
35. Une fiche vivante ne prouve aucun ancien événement. Son initialisation reprend seulement la base préparée exacte du personnage au moment où un événement canonique établit son usage ; tout écart d’état exige ensuite sa propre cause jouée.
36. `load_game` et `check_health` publient les versions et capacités réellement enregistrées par le Worker. Un ancien catalogue ChatGPT peut atteindre les fonctions de mécanique, de Master et de récupération par le pont en lecture seule `search` → `fetch`; ce pont ne peut jamais effectuer `save_turn`. L’absence visuelle d’un outil dans une conversation ne prouve donc pas son absence du Worker, mais le schéma P16 de classement et le schéma avancé de `save_turn` exigent toujours un catalogue MCP rafraîchi.

Les fichiers `.yaml` de ce dépôt utilisent le sous-ensemble JSON de YAML 1.2. Ils restent des documents YAML valides tout en permettant une validation reproductible avec Node.js sans bibliothèque externe.
