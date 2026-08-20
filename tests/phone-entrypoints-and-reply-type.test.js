const test = require("node:test");
const assert = require("node:assert/strict");

test("les réponses rapides conservent le type e-mail", () => {
    const manager = require("../src/v2/managers/PhoneActionV2Manager");
    const email = manager.smsButtons(12, "character", "email").toJSON();
    const sms = manager.smsButtons(12, "character", "text").toJSON();

    assert.equal(email.components[0].custom_id, "v2_phone_quick_reply:12:character:email");
    assert.equal(sms.components[0].custom_id, "v2_phone_quick_reply:12:character:sms");
});

test("un message de groupe expose un bouton de réponse commun", () => {
    const manager = require("../src/v2/managers/PhoneActionV2Manager");
    const payload = manager.groupReplyButtons(42).toJSON();

    assert.equal(payload.components[0].custom_id, "v2_phone_group_quick_reply:42");
    assert.equal(payload.components[0].label, "Répondre au groupe");
});

test("l’accueil du téléphone expose directement SMS, MMS et e-mail", () => {
    const source = require("node:fs").readFileSync(
        require("node:path").resolve("src/v2/pages/character/CharacterPhonePage.js"),
        "utf8"
    );

    assert.match(source, /v2_phone_new:/);
    assert.match(source, /v2_phone_mms_new_contact:/);
    assert.match(source, /v2_phone_email_new_contact:/);
});
