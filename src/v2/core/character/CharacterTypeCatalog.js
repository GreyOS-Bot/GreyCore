const CHARACTER_TYPES = {
    personnage_joue: {
        label:
            "Personnage joué",
        displayLabel:
            "PJ",
        isNpc:
            false,
        creationMode:
            "complete",
        usageScope:
            "owner",
        installationVisibility:
            "private"
    },
    pj_masque: {
        label:
            "PJ masqué",
        displayLabel:
            "PJ masqué",
        isNpc:
            false,
        creationMode:
            "complete",
        usageScope:
            "owner",
        installationVisibility:
            "private"
    },
    animal: {
        label:
            "Animal",
        displayLabel:
            "Animal",
        isNpc:
            false,
        creationMode:
            "complete",
        usageScope:
            "owner",
        installationVisibility:
            "private"
    },
    pnj: {
        label:
            "PNJ",
        displayLabel:
            "PNJ",
        isNpc:
            true,
        creationMode:
            "complete",
        usageScope:
            "owner",
        installationVisibility:
            "private"
    },
    random: {
        label:
            "Random",
        displayLabel:
            "Random",
        isNpc:
            true,
        creationMode:
            "simple",
        usageScope:
            "shared",
        installationVisibility:
            "shared"
    },
    pnj_reserve: {
        label:
            "PNJ réservé",
        displayLabel:
            "PNJ réservé",
        isNpc:
            true,
        creationMode:
            "simple",
        usageScope:
            "staff",
        installationVisibility:
            "staff"
    },
    reserve_staff: {
        label:
            "Réservé staff",
        displayLabel:
            "Réservé staff",
        isNpc:
            true,
        creationMode:
            "simple",
        usageScope:
            "staff",
        installationVisibility:
            "staff"
    }
};

const LEGACY_DISPLAY_LABELS = {
    pj:
        "PJ",
    pc:
        "PJ",
    player:
        "PJ",
    npc:
        "PNJ"
};

function normalize(
    value
) {
    return String(
        value
        || ""
    )
        .trim()
        .toLowerCase();
}

function isSupported(
    value
) {
    return Object.prototype
        .hasOwnProperty
        .call(
            CHARACTER_TYPES,
            normalize(
                value
            )
        );
}

function getDisplayLabel(
    value
) {
    const normalized =
        normalize(
            value
        );

    if (!normalized) {
        return null;
    }

    return (
        CHARACTER_TYPES[
            normalized
        ]?.displayLabel
        || LEGACY_DISPLAY_LABELS[
            normalized
        ]
        || String(value)
            .trim()
    );
}

function isNpc(
    value
) {
    const normalized =
        normalize(
            value
        );

    if (
        normalized === "npc"
    ) {
        return true;
    }

    return (
        CHARACTER_TYPES[
            normalized
        ]?.isNpc
        === true
    );
}

function isPlayedCharacter(value) {
    return ["personnage_joue", "pj_masque"].includes(normalize(value));
}

function getDefinition(
    value
) {
    return (
        CHARACTER_TYPES[
            normalize(value)
        ]
        || null
    );
}

function usesSimpleCreation(
    value
) {
    return getDefinition(value)
        ?.creationMode === "simple";
}

function getUsageScope(
    value
) {
    return getDefinition(value)
        ?.usageScope
        || "owner";
}

function getInstallationVisibility(
    value
) {
    return getDefinition(value)
        ?.installationVisibility
        || "private";
}

module.exports = {
    CHARACTER_TYPES,
    isSupported,
    getDisplayLabel,
    isNpc,
    isPlayedCharacter,
    getDefinition,
    usesSimpleCreation,
    getUsageScope,
    getInstallationVisibility
};
