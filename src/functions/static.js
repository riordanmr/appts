const { app } = require('@azure/functions');
const path = require('path');
const fs = require('fs');

// Serve index.html
app.http('serveIndex', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: '',
  handler: async (request, context) => {
    try {
      const filePath = path.join(__dirname, '../../public/index.html');
      const content = fs.readFileSync(filePath, 'utf8');
      
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/html'
        },
        body: content
      };
    } catch (error) {
      context.error('Error serving index:', error);
      return {
        status: 500,
        body: 'Internal server error'
      };
    }
  }
});

// Serve stylist portal
app.http('serveStylist', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'stylist',
  handler: async (request, context) => {
    try {
      const filePath = path.join(__dirname, '../../public/stylist.html');
      const content = fs.readFileSync(filePath, 'utf8');
      
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/html'
        },
        body: content
      };
    } catch (error) {
      context.error('Error serving stylist portal:', error);
      return {
        status: 500,
        body: 'Internal server error'
      };
    }
  }
});

// Serve CSS
app.http('serveCSS', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'css/{*file}',
  handler: async (request, context) => {
    try {
      const file = request.params.file;
      const filePath = path.join(__dirname, '../../public/css', file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/css'
        },
        body: content
      };
    } catch (error) {
      context.error('Error serving CSS:', error);
      return {
        status: 404,
        body: 'Not found'
      };
    }
  }
});

// Serve JS
app.http('serveJS', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'js/{*file}',
  handler: async (request, context) => {
    try {
      const file = request.params.file;
      const filePath = path.join(__dirname, '../../public/js', file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript'
        },
        body: content
      };
    } catch (error) {
      context.error('Error serving JS:', error);
      return {
        status: 404,
        body: 'Not found'
      };
    }
  }
});
