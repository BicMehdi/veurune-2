# Veyrune Cloud Save

Serveur MCP personnel qui permet à ChatGPT mobile de charger et sauvegarder Veyrune sur GitHub alors que le PC est éteint.

## Outils exposés

- `search` et `fetch` : consultation des documents canoniques visibles joueur ;
- `load_game` : chargement des règles de persistance et de narration, de l’état courant, des événements récents et de l’état MJ ;
- `roll_dice` : génération impartiale des dés, liée au canon chargé et accompagnée d’un reçu vérifié par `save_turn`, sans avancer la fiction ;
- `validate_check` : validation sans dé des références d’acteur, caractéristiques, maîtrises, modificateurs et opposition ;
- `roll_check` : résolution mécanique complète et reçu chiffré, avec projections MJ et joueur séparées ;
- `search_master` et `fetch_master_section` : consultation ciblée du Master MJ sans charger ses 154 Ko à chaque tour ;
- `save_turn` : validation puis commit Git atomique d’un nouveau tour ;
- `check_save_status` : résolution idempotente d’une réponse réseau perdue après un commit ;
- `check_health` : vérification authentifiée de GitHub et de l’état courant.

`save_turn` refuse les parents ou commits périmés, les tours discontinus, un mauvais `save_id`, les secrets dans les projections joueur, les reconstructions historiques injectées, toute modification non append-only du journal et tout calcul mécanique différent de son reçu serveur.

Les PNJ improvisés utilisent les profils génériques `NPC-*` de `reference/MECHANICAL_PROFILES.json`. L'attribution est fournie à `validate_check` et `roll_check` avant les dés, avec justification et références. `roll_check` renvoie `required_profile_persistence`; `save_turn` exige sa copie exacte dans `HIDDEN`, puis interdit toute réattribution. Sans preuve d'un niveau particulier, seul le profil civil ordinaire est accepté.

Le catalogue comprend également le niveau rarissime `NPC-MASTER-CHAMPION`, qui exige trois preuves, et onze fiches préparées `CHAR-*`. Une fiche nommée ne peut être attribuée qu'à l'acteur correspondant déjà vivant dans GitHub. Elle ne l'active jamais. Sive et Lysa disposent de reconstructions OOC explicites, sans passé ni état courant inventés.

Les fiches vivantes `CHAR-*` sont stockées côté MJ dans `HIDDEN.companion_sheets`. Un premier jet signé initialise automatiquement la fiche exacte du personnage ; un changement narratif peut aussi l’initialiser s’il cite un événement du même tour. `save_turn.companion_changes` porte l’ancien état, le nouvel état, la cause, la durée et l’événement source, lequel cite le profil dans `companion_refs`. Le Worker applique lui-même la mutation et ajoute `HIDDEN.companion_change_log`, afin de bloquer les changements directs, les progressions gonflées et les évolutions sans cause. Les domaines suivis sont mécanique, blessures, équipement, techniques, relations multidimensionnelles, émotions et objectifs.

## Sauvegarde rapide sans perte

Le mode recommandé `save_turn({ mode: "patch", ... })` envoie seulement les changements du tour. Le Worker recharge les projections au même commit GitHub, applique une fusion récursive (`null` supprime une clé et un tableau remplace le tableau entier), reconstruit le checkpoint complet, puis exécute les validations ordinaires. Le mode complet ancien bénéficie désormais de la même préservation des champs omis. Le dépôt continue donc de contenir des snapshots complets : seule la quantité transmise par le MJ diminue.

L'écriture GitHub utilise une création d'arbre avec contenu intégré. Les huit fichiers du tour — sauvegarde, trois états principaux, fiche mécanique, profil de Mehdi, mémoire narrative et journal — restent réunis dans un commit atomique, sans appels séparés de création de blobs.

Les champs `mehdi_sheet` et `narration_rules` sont lus au même commit GitHub que le reste du canon. Le MJ utilise la fiche avant tout test et applique les règles d’affichage avant de présenter le résultat.

Si un ancien catalogue ne montre pas encore les nouveaux outils, `search("validate_check <JSON>")` ou `search("roll_check <JSON>")` renvoie un identifiant que `fetch` exécute avec exactement le même moteur. `search("roll_dice 2d10 <headSha> <next_save_id> <label>")` reste disponible pour les dés bruts. Ce pont peut être retiré lorsque tous les clients rafraîchissent correctement leur catalogue.

## Tests de non-régression

`npm test` exécute notamment :

- une simulation locale de 200 sauvegardes consécutives, de `VEY-0720 / tour 710` à `VEY-0919 / tour 909` ;
- les changements automatiques de journaux `0700-0799`, `0800-0899` et `0900-0999` ;
- le refus de deux sauvegardes concurrentes fondées sur le même état ;
- le refus d’un `HEAD` GitHub périmé avant toute écriture ;
- la création atomique des huit fichiers d’un tour et la mise à jour de `main` sans `force` ;
- la préservation de `HIDDEN`, de la fiche mécanique, du profil de Mehdi et de la mémoire narrative lorsqu’un ancien client les omet ;
- la détection d’une sauvegarde déjà commitée après une réponse réseau perdue ;
- la création causale d’une fiche vivante, son activation par jet signé et la lecture de ses statistiques par les jets suivants ;
- le refus d’une mutation directe, d’un événement source absent, d’un `before` faux ou d’une progression supérieure à +1 par événement.

Ces simulations utilisent uniquement des données en mémoire et ne créent aucun tour narratif dans le dépôt canonique.

## Développement

```powershell
npm install
npm test
npm run dev
```

Les fichiers `.dev.vars*` et `.env*` sont ignorés par Git. Ne jamais y placer un secret destiné à être commité.

## Déploiement personnel

1. Se connecter à Cloudflare avec Wrangler :

   ```powershell
   npx wrangler login
   ```

2. Créer le stockage OAuth :

   ```powershell
   npx wrangler kv namespace create OAUTH_KV
   ```

   Reporter l’identifiant obtenu dans `wrangler.jsonc` à la place de `<Add-KV-ID>`.

3. Effectuer un premier déploiement afin d’obtenir l’adresse `https://veyrune-cloud-save.<compte>.workers.dev` :

   ```powershell
   npm run deploy
   ```

4. Créer une application OAuth GitHub personnelle :

   - Homepage URL : l’adresse du Worker ;
   - Authorization callback URL : la même adresse suivie de `/callback`.

5. Créer un jeton GitHub finement limité au seul dépôt `BicMehdi/veurune-2`, avec permission `Contents: Read and write`.

6. Enregistrer les secrets via les invites Wrangler, sans les copier dans un fichier suivi par Git :

   ```powershell
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   npx wrangler secret put COOKIE_ENCRYPTION_KEY
   npx wrangler secret put GITHUB_REPO_TOKEN
   npx wrangler secret put ALLOWED_GITHUB_LOGIN
   ```

   `ALLOWED_GITHUB_LOGIN` doit valoir `BicMehdi`. Utiliser une longue valeur aléatoire pour `COOKIE_ENCRYPTION_KEY` ; une sous-clé distincte en est dérivée par le Worker pour signer les reçus de dés.

7. Redéployer puis tester `https://veyrune-cloud-save.<compte>.workers.dev/health` et le MCP à l’adresse terminée par `/mcp`.

## Installation dans ChatGPT

Dans ChatGPT sur le web :

1. activer le mode développeur dans les réglages de sécurité ;
2. ouvrir les plugins personnels et ajouter l’URL HTTPS terminée par `/mcp` ;
3. effectuer la connexion GitHub et installer le plugin ;
4. ouvrir un nouveau chat Veyrune avec le plugin activé.

Le plugin installé devient ensuite utilisable dans un chat normal sur mobile. Le serveur demande `load_game` avant une reprise et `save_turn` avant la réponse finale de chaque nouveau tour.

## Sources techniques

- [Plugins ChatGPT](https://learn.chatgpt.com/docs/plugins)
- [Serveur MCP OpenAI](https://developers.openai.com/plugins/build/mcp-server)
- [MCP distant sur Cloudflare](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/)
- [Secrets Cloudflare Workers](https://developers.cloudflare.com/workers/local-development/environment-variables/)
