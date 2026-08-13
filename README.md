# Veyrune 2 — Sauvegarde GitHub

Il n’est pas nécessaire de jouer sur PC en permanence.

Pour cet usage, le PC sert surtout à mettre en place Codex et le dépôt GitHub au début, puis éventuellement à effectuer certaines opérations de maintenance.

## Architecture active

### Configuration et maintenance sur PC

- connecter Codex ;
- connecter le dépôt `BicMehdi/veurune-2` ;
- créer les fichiers de sauvegarde ;
- vérifier que Codex peut créer des commits et pousser les changements vers GitHub.

### Utilisation sur téléphone

- continuer à jouer à Veyrune dans ChatGPT ;
- utiliser automatiquement ce dépôt GitHub comme sauvegarde permanente grâce à Veyrune Cloud Save.

## État actuel

Le Worker Cloudflare assure désormais le chargement et la sauvegarde depuis un chat mobile, PC éteint. Chaque vrai tour est validé puis enregistré atomiquement. Les anciens clients utilisant le format complet ne peuvent plus effacer des champs omis ; le format patch reste recommandé pour la vitesse.

Le projet conserve également :

- le profil descriptif et révisable de Mehdi ;
- sa fiche mécanique actuelle, synchronisée à chaque tour ;
- des jets impartiaux générés par le Worker, liés au tour par un reçu vérifiable et affichés clairement dans la narration ;
- une mémoire narrative par chapitres de 50 tours ;
- le Master consolidé complet avec recherche ciblée par section ;
- un registre MJ caché protégé contre les suppressions silencieuses ;
- une vérification de sauvegarde idempotente lorsque la réponse réseau se perd.

## Système de sauvegarde

Le système persistant est décrit dans [`SYSTEM/BOOTSTRAP.md`](SYSTEM/BOOTSTRAP.md). Avant toute reprise ou écriture, exécuter `npm test` pour vérifier la filiation des sauvegardes, les tours, les événements et l’état canonique.

## Règles du maître de jeu

Le mode permanent « Dark Fantasy brutal équilibré » est défini dans [`rules/NARRATION_DARK_FANTASY.md`](rules/NARRATION_DARK_FANTASY.md). `load_game` le charge au même commit que l’état canonique. Le fichier [`SYSTEM/CHATGPT_PROJECT_SOURCE.md`](SYSTEM/CHATGPT_PROJECT_SOURCE.md) est le bootstrap court à ajouter aux Sources du projet ChatGPT ; il renvoie toujours vers GitHub `main` au lieu de dupliquer le canon.

## Sauvegarde cloud depuis ChatGPT mobile

Le dossier [`worker/`](worker/) contient le serveur MCP personnel destiné à relier un chat ChatGPT normal au dépôt :

`ChatGPT mobile → plugin Veyrune → Cloudflare Worker → GitHub main`

Une fois déployé et installé comme plugin personnel, il fonctionne avec le PC éteint. Le Worker charge le canon avec `load_game` et crée une transaction Git atomique avec `save_turn`. Une écriture est refusée si le commit GitHub, le parent, le tour ou la prochaine sauvegarde attendue ne correspondent plus à l’état chargé.
