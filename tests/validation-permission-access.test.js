const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { stubModule } = require("./helpers/moduleStub");

test("2C.5c2 centralise les décisions validation sur characters strict opt-in", () => {
    const calls = [];
    stubModule(
        "src/v2/core/services/StaffPermissionDecisionService.js",
        {
            decide(options) {
                calls.push(options);
                return { allowed: options.write !== "denied" };
            }
        }
    );
    const servicePath = require.resolve(
        "../src/v2/core/services/ValidationPermissionAccessService"
    );
    delete require.cache[servicePath];
    const service = require(servicePath);
    const interaction = { guildId: "guild" };

    assert.equal(service.canRead(interaction), true);
    assert.equal(service.canWrite(interaction), true);
    assert.deepEqual(calls, [
        {
            interaction,
            permission: "characters",
            write: false,
            allowValidationBridge: true
        },
        {
            interaction,
            permission: "characters",
            write: true,
            allowValidationBridge: true
        }
    ]);
    assert.equal("legacyCanAccessParity" in calls[0], false);
});

test("2C.5c2 retire les guards legacy des handlers staff migrés", () => {
    const root = path.join(__dirname, "../src");
    const files = [
        "commands/validations/index.js",
        "v2/interactions/buttons/validationApprove.js",
        "v2/interactions/buttons/validationReject.js",
        "v2/interactions/buttons/openValidationHistory.js",
        "v2/interactions/buttons/openValidationStory.js",
        "v2/interactions/buttons/sendValidationReminder.js",
        "v2/interactions/buttons/requestCharacterChange.js",
        "v2/interactions/buttons/approveChangeRequest.js",
        "v2/interactions/buttons/rejectChangeRequest.js",
        "v2/interactions/modals/rejectValidation.js",
        "v2/interactions/modals/rejectChangeRequest.js",
        "v2/interactions/modals/submitCharacterChangeRequest.js"
    ];
    for (const file of files) {
        const source = fs.readFileSync(path.join(root, file), "utf8");
        assert.doesNotMatch(source, /ValidationStaffPolicy|canReview|canManageServerTools/);
        assert.match(source, /ValidationPermissionAccessService/);
    }
});

test("2C.5c2 conserve les actions joueur hors du cutover staff", () => {
    const root = path.join(__dirname, "../src/v2/interactions");
    for (const file of [
        "buttons/requestInstallationValidation.js",
        "buttons/openRejectedProfileEdit.js",
        "modals/updateRejectedProfile.js",
        "modals/createStorySubmit.js"
    ]) {
        const source = fs.readFileSync(path.join(root, file), "utf8");
        assert.doesNotMatch(source, /ValidationPermissionAccessService|allowValidationBridge/);
    }
});
