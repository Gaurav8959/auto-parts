declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      PORT?: string;
      DB_HOST?: string;
      DB_PORT?: string;
      DB_USER?: string;
      DB_PASSWORD?: string;
      DB_NAME?: string;
      TOKEN_SECRET_KEY?: string;
      FRONTEND_BASE_URL?: string;
      ADMIN_EMAIL?: string;
      ADMIN_PASSWORD?: string;
    }
  }
}

export {};
