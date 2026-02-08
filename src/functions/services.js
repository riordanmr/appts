const { app } = require('@azure/functions');
const { ensureTablesExist, getAllServices } = require('../shared/tableStorage');

app.http('getServices', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'services',
  handler: async (request, context) => {
    try {
      await ensureTablesExist();
      const services = await getAllServices();

      return {
        status: 200,
        jsonBody: services
      };
    } catch (error) {
      context.error('Error fetching services:', error);
      return {
        status: 500,
        jsonBody: { error: 'Failed to fetch services' }
      };
    }
  }
});
