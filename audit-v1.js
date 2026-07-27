require("dotenv").config();

require("./src/database/schema");

const runAuditV1 =
    require("./src/database/auditV1");

runAuditV1();