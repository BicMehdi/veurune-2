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

Les fichiers `.yaml` de ce dépôt utilisent le sous-ensemble JSON de YAML 1.2. Ils restent des documents YAML valides tout en permettant une validation reproductible avec Node.js sans bibliothèque externe.
