# Veyrune Cloud Save

Serveur MCP personnel qui permet à ChatGPT mobile de charger et sauvegarder Veyrune sur GitHub alors que le PC est éteint.

## Outils exposés

- `search` et `fetch` : consultation des documents canoniques visibles joueur ;
- `load_game` : chargement des règles de persistance et de narration, de l’état courant, des événements récents et de l’état MJ ;
- `save_turn` : validation puis commit Git atomique d’un nouveau tour ;
- `check_health` : vérification authentifiée de GitHub et de l’état courant.

`save_turn` refuse les parents ou commits périmés, les tours discontinus, un mauvais `save_id`, les secrets dans les projections joueur, les reconstructions historiques injectées et toute modification non append-only du journal.

Le champ `narration_rules` est lu depuis `rules/NARRATION_DARK_FANTASY.md` au même commit GitHub que le reste du canon. Le MJ l’applique avant de résoudre le tour.

## Tests de non-régression

`npm test` exécute notamment :

- une simulation locale de 200 sauvegardes consécutives, de `VEY-0720 / tour 710` à `VEY-0919 / tour 909` ;
- les changements automatiques de journaux `0700-0799`, `0800-0899` et `0900-0999` ;
- le refus de deux sauvegardes concurrentes fondées sur le même état ;
- le refus d’un `HEAD` GitHub périmé avant toute écriture ;
- la création atomique des cinq fichiers d’un tour et la mise à jour de `main` sans `force`.

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

   `ALLOWED_GITHUB_LOGIN` doit valoir `BicMehdi`. Utiliser une longue valeur aléatoire pour `COOKIE_ENCRYPTION_KEY`.

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
