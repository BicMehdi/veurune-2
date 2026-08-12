# Reprise canonique de Veyrune

Ce dépôt est la mémoire persistante de Veyrune. Une reprise ne doit jamais inventer un fait manquant ni faire avancer la fiction pendant le chargement.

## Ordre exact de chargement

1. Charger tous les fichiers de `rules/` et appliquer leurs invariants avant de lire l’état de jeu.
2. Exécuter `npm run validate`. Interrompre la reprise si la validation échoue.
3. Charger `state/CURRENT.yaml` comme unique état canonique courant visible par le joueur et résoudre sa projection publique référencée dans `state/WORLD.yaml`.
4. Charger les événements récents depuis le fichier `events/` correspondant au tour courant : au minimum les six derniers tours disponibles, ou toute la scène active si elle est plus courte. Ne jamais réécrire ni supprimer une ligne passée.
5. Côté MJ uniquement, charger `state/HIDDEN.yaml` en dernier. Ne jamais transmettre ce fichier, son contenu ou ses déductions au joueur avant leur découverte canonique.
6. Vérifier que le dernier événement, le `save_id`, le `parent_save_id` et le `turn` concordent avec `CURRENT.yaml`.
7. Reprendre seulement après réussite de ces contrôles. Le chargement et un checkpoint technique n’avancent jamais la fiction.

## État de récupération initial

- checkpoint canonique : `VEY-0719R` ;
- tour technique : `719` ;
- fiction avancée : non ;
- historique importé : non, reconstruction partielle en attente de sources attestées ;
- prochaine sauvegarde autorisée : `VEY-0720` ;
- parent obligatoire de cette prochaine sauvegarde : `VEY-0719R` ;
- prochain tour obligatoire : `720`.

`VEY-0719R` est un ancrage technique. Il ne prétend pas reconstruire le contenu de `VEY-0719` et ne crée aucun événement fictif ancien.

## Écriture d’un nouveau tour

1. Partir de `state/CURRENT.yaml` validé.
2. Résoudre le tour sans contrôler Mehdi et sans exposer de secret MJ.
3. Préparer les événements atomiques avec `event_id`, `save_id`, `parent_save_id`, `turn`, `event_time` et `record_time`.
4. Ajouter les événements à la fin du fichier JSONL de la tranche concernée. Ne jamais modifier les lignes antérieures ; une correction est un nouvel événement.
5. Créer `saves/<save_id>.yaml` avec le parent égal au `save_id` courant et un tour égal au tour courant plus un.
6. Mettre à jour `CURRENT.yaml`, `WORLD.yaml` et, côté MJ seulement, `HIDDEN.yaml` dans la même modification atomique.
7. Exécuter `npm test`. Une erreur de parent, de tour, de secret ou d’append-only bloque le commit.
8. Commit et push seulement après validation réussie.

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
