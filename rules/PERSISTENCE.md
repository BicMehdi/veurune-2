# Invariants de persistance

1. `state/CURRENT.yaml` est l’unique état canonique courant.
2. Les fichiers `events/*.jsonl` sont append-only. Une rectification est un nouvel événement qui référence l’événement corrigé.
3. Chaque événement possède `event_id`, `save_id`, `parent_save_id`, `turn`, `event_time` et `record_time`.
4. Chaque sauvegarde non racine possède un parent existant et `turn = parent.turn + 1`.
5. L’état courant correspond exactement au checkpoint terminal de la chaîne.
6. Le prochain checkpoint attendu possède comme parent le `save_id` courant et comme tour `CURRENT.turn + 1`.
7. Aucun secret non découvert ne figure dans `CURRENT.yaml`, `WORLD.yaml`, `events/` ou un fichier destiné au joueur.
8. `state/HIDDEN.yaml` est réservé au MJ et ne contient aucune duplication destinée au joueur.
9. Aucun événement fictif ancien non attesté n’est créé.
10. Toute reconstruction historique incomplète est marquée `historical_reconstruction: true`, `reconstruction_status: partial` et cite au moins une source attestée.
11. Un checkpoint technique ne fait pas avancer la fiction.
12. Une suppression ou une modification d’une ligne JSONL existante bloque la validation append-only.

Les fichiers `.yaml` de ce dépôt utilisent le sous-ensemble JSON de YAML 1.2. Ils restent des documents YAML valides tout en permettant une validation reproductible avec Node.js sans bibliothèque externe.
