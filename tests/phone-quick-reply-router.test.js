const test = require("node:test");
const assert = require("node:assert/strict");

test("le bouton de réponse transmet le type SMS au formulaire", async () => {
    const modal = require("../src/v2/modals/PhoneMessageModal");
    const original = modal.show;
    const calls = [];
    modal.show = async (...args) => calls.push(args);
    try {
        const router = require("../src/v2/router/buttons/PhoneRouter");
        const interaction = {
            customId: "v2_phone_quick_reply:58:character:sms",
            isButton: () => true
        };
        assert.equal(await router(interaction), true);
        assert.equal(calls[0][1], "58");
        assert.equal(calls[0][2], "character");
        assert.equal(calls[0][3].kind, "sms");
    } finally {
        modal.show = original;
    }
});
