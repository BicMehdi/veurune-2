declare namespace Cloudflare {
  interface Env {
    OAUTH_KV: KVNamespace;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    COOKIE_ENCRYPTION_KEY: string;
    GITHUB_REPO_TOKEN: string;
    ALLOWED_GITHUB_LOGIN: string;
    GITHUB_OWNER?: string;
    GITHUB_REPO?: string;
    GITHUB_BRANCH?: string;
  }
}

interface Env extends Cloudflare.Env {}
