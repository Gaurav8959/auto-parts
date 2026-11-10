const basePath = "/";

export default {
  url: {
    basePath,
  },
  timers: {
    // sessions can also be ended early: see tokenVersion on the user
    jwtTokenExpiration: "168h",
  },
  env: {
    // no fallback: the server refuses to start without a real secret (see worker.ts)
    authSecret: process.env.TOKEN_SECRET_KEY,
    minAuthSecretLength: 32,
  },
  authorizationIgnorePath: ["/", "/auth/login"],
};
