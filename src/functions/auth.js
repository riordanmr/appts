const { app } = require('@azure/functions');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ensureTablesExist, createUser, getUserByEmail } = require('../shared/tableStorage');

app.http('register', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      await ensureTablesExist();

      const body = await request.json();
      const { email, phone, password, name } = body;

      if (!email || !phone || !password || !name) {
        return {
          status: 400,
          jsonBody: { error: 'All fields are required' }
        };
      }

      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return {
          status: 400,
          jsonBody: { error: 'Email already registered' }
        };
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Create user
      await createUser({
        email,
        phone,
        password: hashedPassword,
        name,
        role: 'customer'
      });

      // Generate token
      const token = jwt.sign(
        { email, role: 'customer' },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '7d' }
      );

      return {
        status: 201,
        jsonBody: {
          message: 'User registered successfully',
          token,
          user: { email, name, role: 'customer' }
        }
      };
    } catch (error) {
      context.error('Registration error:', error);
      return {
        status: 500,
        jsonBody: { error: 'Registration failed' }
      };
    }
  }
});

app.http('login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      await ensureTablesExist();

      const body = await request.json();
      const { email, password } = body;

      if (!email || !password) {
        return {
          status: 400,
          jsonBody: { error: 'Email and password are required' }
        };
      }

      // Find user
      const user = await getUserByEmail(email);
      if (!user) {
        return {
          status: 401,
          jsonBody: { error: 'Invalid credentials' }
        };
      }

      // Verify password
      const validPassword = bcrypt.compareSync(password, user.password);
      if (!validPassword) {
        return {
          status: 401,
          jsonBody: { error: 'Invalid credentials' }
        };
      }

      // Generate token
      const token = jwt.sign(
        { email: user.email, role: user.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '7d' }
      );

      return {
        status: 200,
        jsonBody: {
          message: 'Login successful',
          token,
          user: { email: user.email, name: user.name, role: user.role }
        }
      };
    } catch (error) {
      context.error('Login error:', error);
      return {
        status: 500,
        jsonBody: { error: 'Login failed' }
      };
    }
  }
});
