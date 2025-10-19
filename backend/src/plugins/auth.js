import Jwt from '@hapi/jwt';

export const authPlugin = {
  name: 'auth-plugin',
  version: '1.0.0',
  register: async (server) => {
    await server.register(Jwt);

    server.auth.strategy('jwt', 'jwt', {
      keys: process.env.JWT_SECRET,
      verify: {
        aud: 'urn:audience:journal',
        iss: 'urn:issuer:journal',
        sub: false,
        nbf: true,
        exp: true,
        maxAgeSec: 7 * 24 * 60 * 60, // 7 days
        timeSkewSec: 15,
      },
      validate: (artifacts, request, h) => {
        return {
          isValid: true,
          credentials: { userId: artifacts.decoded.payload.userId },
        };
      },
    });

    server.auth.default('jwt');
  },
};
