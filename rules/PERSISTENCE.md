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
22. Tout hasard mécanique provient du serveur. Utiliser `validate_check` puis `roll_check` pour un test complet ; réserver `roll_dice` au hasard brut sans caractéristique ni opposition. Le `roll_id`, le `roll_receipt`, les dés et `mechanical_check` sont repris exactement dans l’événement. Le serveur lie le reçu au `headSha` et au `save_id` attendus et refuse toute modification ou réutilisation.
23. Un jet public conserve formule, valeurs, DD ou défense, total, marge, degré et conséquence. Une opposition secrète conserve son détail uniquement dans `HIDDEN` et ne publie que les éléments perceptibles.
24. `validate_check` ne lance aucun dé. Une statistique d’acteur ou d’opposition absente de l’état canonique retourne `ACTOR_UNRESOLVED` ou `OPPOSITION_UNRESOLVED` ; le MJ ne la remplace jamais par une valeur improvisée.
25. `roll_check` relit les statistiques au commit attendu, calcule le test, chiffre et authentifie la résolution complète. `public_display` est la seule projection montrable au joueur ; `gm_resolution` et le contenu du reçu restent MJ.
26. Un PNJ vivant sans fiche individuelle peut recevoir avant son premier test un profil générique `NPC-*` de `MECHANICAL_PROFILES`. L'attribution cite sa justification et ses preuves, puis devient persistante ; elle n'est jamais choisie d'après la puissance de Mehdi ou l'issue souhaitée.
27. Sans fait établi permettant un profil spécialisé, seul `NPC-CIVIL-ORDINARY` est autorisé comme défaut minimal. Les profils ouvrier, garde, mercenaire, vétéran, spécialiste agile et combattant d'élite exigent une base fictionnelle citée.
28. Si `roll_check` renvoie `required_profile_persistence`, le même `save_turn` inscrit exactement `mechanical_profile_id` et `mechanical_profile_assignment` dans `HIDDEN`. La sauvegarde refuse l'omission, l'altération, une attribution hors reçu et toute réattribution ultérieure.
29. `NPC-MASTER-CHAMPION` est le seul palier générique au-dessus de l'élite. Il exige au moins trois références canoniques distinctes établissant une maîtrise exceptionnelle avant le jet.
30. Les profils `CHAR-*` sont des fiches mécaniques préparées, non des états vivants. Ils sont attribuables uniquement à leur acteur nommé réellement présent selon GitHub; ils ne créent ni rencontre, ni compagnonnage, ni localisation, ni survie.
31. Les valeurs directes sauvegardées prévalent sur la base `CHAR-*`. Endurance actuelle, blessures, équipement et techniques exigent leur propre état ou événement. Les reconstructions OOC de Sive et Lysa fournissent une base future sans fabriquer de passé, de souvenir, de localisation ou d'événement.

Les fichiers `.yaml` de ce dépôt utilisent le sous-ensemble JSON de YAML 1.2. Ils restent des documents YAML valides tout en permettant une validation reproductible avec Node.js sans bibliothèque externe.
