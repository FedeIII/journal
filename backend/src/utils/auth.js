import bcrypt from 'bcrypt';
import jwt from '@hapi/jwt';

const SALT_ROUNDS = 10;

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

export const generateToken = (userId, email) => {
  const token = jwt.token.generate(
    {
      aud: 'urn:audience:journal',
      iss: 'urn:issuer:journal',
      userId,
      email,
    },
    {
      key: process.env.JWT_SECRET,
      algorithm: 'HS256',
    },
    {
      ttlSec: 7 * 24 * 60 * 60, // 7 days
    }
  );
  return token;
};

export const validateToken = (token) => {
  try {
    const decoded = jwt.token.decode(token);
    jwt.token.verify(decoded, {
      key: process.env.JWT_SECRET,
      algorithm: 'HS256',
    });
    return decoded.decoded.payload;
  } catch (err) {
    return null;
  }
};
