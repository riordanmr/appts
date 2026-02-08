const { app } = require('@azure/functions');
const { ensureTablesExist, getAllStylists } = require('../shared/tableStorage');

app.http('getStylists', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'stylists',
  handler: async (request, context) => {
    try {
      await ensureTablesExist();
      const stylists = await getAllStylists();

      return {
        status: 200,
        jsonBody: stylists
      };
    } catch (error) {
      context.error('Error fetching stylists:', error);
      return {
        status: 500,
        jsonBody: { error: 'Failed to fetch stylists' }
      };
    }
  }
});
