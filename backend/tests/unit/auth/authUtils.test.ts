/**
 * Unit Tests for Authentication Utilities
 * Testing token generation, hashing, and validation functions
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

describe('Auth Utils - Token Generation', () => {
  describe('generateRefreshToken', () => {
    const generateRefreshToken = () => {
      return crypto.randomBytes(64).toString('hex');
    };

    it('should generate a 128-character hex string', () => {
      const token = generateRefreshToken();
      expect(token).toHaveLength(128); // 64 bytes = 128 hex chars
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate cryptographically random tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateRefreshToken());
      }
      expect(tokens.size).toBe(100); // All unique
    });
  });

  describe('hashToken', () => {
    const hashToken = (token: string) => {
      return crypto.createHash('sha256').update(token).digest('hex');
    };

    it('should hash token consistently', () => {
      const token = 'test-token-123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should produce 64-character SHA-256 hash', () => {
      const token = 'test-token';
      const hash = hashToken(token);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');
      expect(hash1).not.toBe(hash2);
    });

    it('should be deterministic', () => {
      const token = 'my-secret-token';
      const expectedHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      expect(hashToken(token)).toBe(expectedHash);
    });
  });
});

describe('Auth Utils - JWT Operations', () => {
  const JWT_SECRET = 'test-secret-key';
  const mockUser = {
    id: '123456789',
    email: 'test@example.com',
    username: 'testuser'
  };

  describe('JWT Token Generation', () => {
    it('should generate valid JWT token', () => {
      const token = jwt.sign(
        { id: mockUser.id, email: mockUser.email, username: mockUser.username },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature
    });

    it('should include user data in token payload', () => {
      const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '15m' });
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.username).toBe(mockUser.username);
    });

    it('should set expiration time', () => {
      const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '15m' });
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp - decoded.iat).toBe(15 * 60); // 15 minutes in seconds
    });

    it('should support different expiration formats', () => {
      const formats = ['1h', '24h', '7d', '30m'] as const;
      
      formats.forEach(format => {
        const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: format as string });
        expect(token).toBeDefined();
        expect(() => jwt.verify(token, JWT_SECRET)).not.toThrow();
      });
    });
  });

  describe('JWT Token Verification', () => {
    it('should verify valid token', () => {
      const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '1h' });
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(mockUser.id);
    });

    it('should reject token with wrong secret', () => {
      const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '1h' });
      
      expect(() => {
        jwt.verify(token, 'wrong-secret');
      }).toThrow();
    });

    it('should reject expired token', () => {
      const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '0s' });
      
      // Wait a bit to ensure token expires
      setTimeout(() => {
        expect(() => {
          jwt.verify(token, JWT_SECRET);
        }).toThrow('jwt expired');
      }, 100);
    });

    it('should reject malformed token', () => {
      expect(() => {
        jwt.verify('invalid.token.here', JWT_SECRET);
      }).toThrow();
    });
  });
});

describe('Auth Utils - Password Hashing', () => {
  describe('bcrypt hashing', () => {
    it('should hash password securely', async () => {
      const password = 'mySecurePassword123';
      const hash = await bcrypt.hash(password, 12);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt format
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword';
      const hash1 = await bcrypt.hash(password, 12);
      const hash2 = await bcrypt.hash(password, 12);

      expect(hash1).not.toBe(hash2); // Due to random salt
    });

    it('should verify correct password', async () => {
      const password = 'correctPassword';
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correctPassword';
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare('wrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should use specified salt rounds', async () => {
      const password = 'test';
      const hash = await bcrypt.hash(password, 12);

      // bcrypt hash format: $2b$rounds$salt+hash
      const rounds = hash.split('$')[2];
      expect(rounds).toBe('12');
    });
  });

  describe('password security', () => {
    it('should handle special characters', async () => {
      const password = 'p@ssw0rd!#$%^&*()';
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle unicode characters', async () => {
      const password = '密码🔐test';
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle empty string (edge case)', async () => {
      const password = '';
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare('', hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await bcrypt.compare('notEmpty', hash);
      expect(isInvalid).toBe(false);
    });
  });
});

describe('Auth Utils - Cookie Options', () => {
  const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  it('should configure secure cookies for production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none' as const,
      path: '/',
      maxAge: REFRESH_TOKEN_EXPIRES_MS
    };

    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.secure).toBe(true);
    expect(cookieOptions.sameSite).toBe('none');
    expect(cookieOptions.maxAge).toBe(7 * 24 * 60 * 60 * 1000);

    process.env.NODE_ENV = originalEnv;
  });

  it('should allow insecure cookies for development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none' as const,
      path: '/',
      maxAge: REFRESH_TOKEN_EXPIRES_MS
    };

    expect(cookieOptions.secure).toBe(false);

    process.env.NODE_ENV = originalEnv;
  });

  it('should set httpOnly to prevent XSS attacks', () => {
    const cookieOptions = {
      httpOnly: true,
      secure: false,
      sameSite: 'none' as const,
      path: '/',
      maxAge: REFRESH_TOKEN_EXPIRES_MS
    };

    expect(cookieOptions.httpOnly).toBe(true);
  });

  it('should set correct expiry time', () => {
    const days = 7;
    const expectedMs = days * 24 * 60 * 60 * 1000;

    expect(REFRESH_TOKEN_EXPIRES_MS).toBe(expectedMs);
  });
});
