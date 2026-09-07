module.exports = function initializeContexts(db = require('./database')) {
    return require('../v2/repositories/ContextSchema')(db);
};
