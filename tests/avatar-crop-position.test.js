const test = require("node:test");
const assert = require("node:assert/strict");

const avatarCropService = require(
    "../src/v2/services/media/AvatarCropService"
);

test(
    "le cadrage d’avatar reconnaît les neuf positions en français",
    () => {
        assert.equal(
            avatarCropService.resolvePosition("haut gauche"),
            "northwest"
        );
        assert.equal(
            avatarCropService.resolvePosition("Haut-droite"),
            "northeast"
        );
        assert.equal(
            avatarCropService.resolvePosition("centre"),
            "centre"
        );
        assert.equal(
            avatarCropService.resolvePosition("bas droite"),
            "southeast"
        );
    }
);

test(
    "le cadrage automatique reste utilisé sans choix valide",
    () => {
        assert.equal(
            avatarCropService.resolvePosition(""),
            "attention"
        );
        assert.equal(
            avatarCropService.resolvePosition("mon avatar"),
            "attention"
        );
    }
);
