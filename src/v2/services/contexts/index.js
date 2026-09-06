const Repository = require('../../repositories/ContextRepository');
const ContextService = require('./ContextService');
const ContextResolutionService = require('./ContextResolutionService');
const contexts = new ContextService(new Repository());
module.exports = { contexts, resolution: new ContextResolutionService(contexts) };
