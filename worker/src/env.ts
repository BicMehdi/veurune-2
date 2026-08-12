import type { GitHubEnv } from "./github";

type WorkerSecrets = {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  COOKIE_ENCRYPTION_KEY: string;
  ALLOWED_GITHUB_LOGIN: string;
};

export type VeyruneEnv = Cloudflare.Env & GitHubEnv & WorkerSecrets;
