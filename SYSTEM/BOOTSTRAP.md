# Reprise canonique de Veyrune

Ce dépôt est la mémoire persistante de Veyrune. Une reprise ne doit jamais inventer un fait manquant ni faire avancer la fiction pendant le chargement.

## Ordre exact de chargement

1. Charger `rules/PERSISTENCE.md`, puis `rules/NARRATION_DARK_FANTASY.md`, et appliquer leurs invariants avant de lire l’état de jeu. La narration Dark Fantasy est permanente.
2. Exécuter `npm run validate`. Interrompre la reprise si la validation échoue.
3. Charger `state/CURRENT.yaml` comme unique état canonique courant visible par le joueur et résoudre sa projection publique référencée dans `state/WORLD.yaml`.
4. Charger `state/MEHDI_SHEET.yaml` comme fiche mécanique courante, puis `state/MEHDI_PROFILE.yaml` et `state/NARRATIVE_MEMORY.yaml` comme index descriptifs de continuité. Ils ne créent jamais un événement, une émotion ni un choix majeur.
5. Charger les événements récents depuis le fichier `events/` correspondant au tour courant : au minimum les six derniers tours disponibles, ou toute la scène active si elle est plus courte. Ne jamais réécrire ni supprimer une ligne passée.
6. Côté MJ uniquement, charger `state/HIDDEN.yaml` en dernier. Ne jamais transmettre ce fichier, son contenu ou ses déductions au joueur avant leur découverte canonique.
7. Utiliser `reference/MASTER_INDEX.md`, puis `search_master` et `fetch_master_section`, seulement lorsqu’un domaine de monde ou de mécanique est nécessaire. Une préparation n’est jamais un état courant.
8. Vérifier que le dernier événement, le `save_id`, le `parent_save_id` et le `turn` concordent avec `CURRENT.yaml`.
9. Reprendre seulement après réussite de ces contrôles. Le chargement et un checkpoint technique n’avancent jamais la fiction.

## État de récupération initial

- checkpoint canonique : `VEY-0719R` ;
- sauvegarde canonique récupérée : `VEY-0719`, tour `709` ;
- tour technique conservé : `709` ;
- fiction avancée : non ;
- source canonique principale : capsule `VEY_SAVE_V2` / `VEY-0719` fournie directement par le joueur ;
- snapshot importé : complet ; historique événementiel reconstruit : partiel et limité aux faits récents attestés ;
- prochaine sauvegarde autorisée : `VEY-0720` ;
- parent obligatoire de cette prochaine sauvegarde : `VEY-0719R` ;
- prochain tour obligatoire : `710`.

`VEY-0719R` est un ancrage technique de récupération de `VEY-0719`. Le suffixe `R` ne modifie pas le tour. Le snapshot complet vient de la capsule attestée ; le journal ne reconstruit que les événements récents qu’elle établit directement. Aucun événement causal ancien n’est déduit. Le checkpoint conserve donc le tour `709`.

## Écriture d’un nouveau tour

Avec Veyrune Cloud Save, préférer `save_turn` en `mode: patch`. Envoyer uniquement les modifications du tour ; le serveur conserve les champs absents, applique les suppressions explicites marquées `null`, reconstruit les sept documents complets et le journal, puis exécute exactement les mêmes validations de continuité, de visibilité et d’append-only que le mode complet. Le mode complet historique est lui aussi fusionné avec l’état courant : une omission ne peut plus effacer silencieusement une donnée.

1. Partir de `state/CURRENT.yaml` validé.
2. Résoudre le tour selon l’interprétation déléguée de Mehdi, mais rendre la main avant tout choix majeur défini par `rules/NARRATION_DARK_FANTASY.md`, sans exposer de secret MJ. Pour toute incertitude mécanique, utiliser `roll_dice` avec le `headSha` et le prochain `save_id`, les valeurs de `MEHDI_SHEET` et la section mécanique ciblée du Master ; conserver le reçu dans l’événement.
3. Préparer les événements atomiques avec `event_id`, `save_id`, `parent_save_id`, `turn`, `event_time` et `record_time`.
4. Ajouter les événements à la fin du fichier JSONL de la tranche concernée. Ne jamais modifier les lignes antérieures ; une correction est un nouvel événement.
5. Créer `saves/<save_id>.yaml` avec le parent égal au `save_id` courant, un tour égal au tour courant plus un et l’identifiant de sauvegarde explicitement suivant dans la séquence. Le numéro du tour ne sert jamais à calculer l’identifiant de sauvegarde.
6. Mettre à jour `CURRENT.yaml`, `WORLD.yaml`, `HIDDEN.yaml`, `MEHDI_SHEET.yaml`, `MEHDI_PROFILE.yaml` et `NARRATIVE_MEMORY.yaml` dans la même modification atomique. Toute modification de fiche cite un événement mécanique ; toute observation du profil cite une instruction OOC ou des événements joués ; tout résumé de chapitre cite ses événements.
Les fiches vivantes `CHAR-*` passent exclusivement par `companion_changes`; le serveur applique leurs mutations causales et tient leur journal caché append-only. Une opération OOC ne crée aucune fiche vivante.

7. Exécuter `npm test`. Une erreur de parent, de tour, de secret ou d’append-only bloque le commit.
8. Commit et push seulement après validation réussie.

Si la réponse de `save_turn` est perdue après l’écriture GitHub, appeler `check_save_status` avec le `save_id` et le dernier `event_id` attendus. Cette vérification ne crée aucun tour et empêche une seconde écriture ambiguë.

## Reconstruction historique

Un événement historique ne peut être ajouté que s’il est attesté par une source. Toute reconstruction incomplète doit porter :

```json
{
  "historical_reconstruction": true,
  "reconstruction_status": "partial",
  "attested_sources": ["référence précise"]
}
```

En l’absence de source attestée, ne pas créer l’événement.
