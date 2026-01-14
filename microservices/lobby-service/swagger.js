const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Lobby Service API',
    description: 'Manage sports match lobbies'
  },
  host: 'localhost:3009',
  schemes: ['http']
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./app.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);
