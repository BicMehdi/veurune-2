# Veyrune 2 — Sauvegarde GitHub

Il n’est pas nécessaire de jouer sur PC en permanence.

Pour cet usage, le PC sert surtout à mettre en place Codex et le dépôt GitHub au début, puis éventuellement à effectuer certaines opérations de maintenance.

## Architecture prévue

### Configuration initiale sur PC

- connecter Codex ;
- connecter le dépôt `BicMehdi/veurune-2` ;
- créer les fichiers de sauvegarde ;
- vérifier que Codex peut créer des commits et pousser les changements vers GitHub.

### Utilisation ensuite sur téléphone

- continuer à jouer à Veyrune dans ChatGPT ;
- utiliser ce dépôt GitHub comme sauvegarde permanente.

## Limite actuelle

Une conversation de jeu normale sur téléphone ne déclenche pas automatiquement Codex après chaque message. Les workflows ChatGPT et Codex restent séparés.

Pour obtenir une sauvegarde GitHub après chaque tour, il faut donc soit :

- faire passer la partie elle-même dans un workflow compatible avec Codex ou ChatGPT Work ;
- construire une automatisation qui écrit l’état de la partie dans GitHub ;
- lancer périodiquement Codex pour synchroniser la sauvegarde.

## Conclusion

L’installation initiale peut être réalisée une seule fois sur PC. En revanche, Codex seul ne transforme pas automatiquement une conversation mobile Veyrune en système de sauvegarde GitHub après chaque tour : cette synchronisation doit être automatisée séparément.

## Système de sauvegarde

Le système persistant est décrit dans [`SYSTEM/BOOTSTRAP.md`](SYSTEM/BOOTSTRAP.md). Avant toute reprise ou écriture, exécuter `npm test` pour vérifier la filiation des sauvegardes, les tours, les événements et l’état canonique.
