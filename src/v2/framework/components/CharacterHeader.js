const characterTypeCatalog =
    require(
        "../../core/character/CharacterTypeCatalog"
    );

class CharacterHeader {

    build(character = {}) {

        const displayName =
            this.getDisplayName(character);

        const age =
            this.getAge(character);

        const organization =
            this.getOrganization(character);

        const characterType =
            this.getCharacterType(character);

        const rpStatus =
            this.getRpStatus(character);

        const summaryParts = [];

        if (characterType) {
            summaryParts.push(
                `🎭 ${characterType}`
            );
        }

        if (organization) {
            summaryParts.push(
                `💼 ${organization}`
            );
        }

        if (age) {
            summaryParts.push(
                `🎂 ${age}`
            );
        }

        const lines = [

            `# ${displayName.toUpperCase()}`,

            "",

            summaryParts.join(" • ")

        ];

        if (rpStatus) {

            lines.push(
                "",
                `❤️‍🩹 ${rpStatus}`
            );

        }

        return lines.join("\n");

    }

    getDisplayName(character) {
        const displayName = (
            character.display_name
            || character.displayName
            || character.proxy_name
            || character.name
            || character.firstname
            || "Personnage"
        );

        return String(displayName)
            .normalize("NFC");

    }

    getAge(character) {

        const age =
            character.age
            ?? character.profile?.age
            ?? null;

        if (
            age === null ||
            age === undefined
        ) {
            return null;
        }

        const value =
            String(age).trim();

        if (!value) {
            return null;
        }

        if (/ans?$/i.test(value)) {
            return value;
        }

        return `${value} ans`;

    }

    getOrganization(character) {

        const organization =
            character.organization
            || character.organisation
            || character.organization_name
            || character.gang
            || character.gang_name
            || character.profile?.organization
            || character.profile?.organisation
            || character.profile?.gang
            || null;

        if (!organization) {
            return null;
        }

        return String(organization).trim();

    }

    getCharacterType(character) {

        const rawType =
            character.character_type
            || character.characterType
            || character.type
            || null;

        if (rawType) {
            return characterTypeCatalog
                .getDisplayLabel(
                    rawType
                );

        }

        if (
            character.is_npc === true ||
            character.isNpc === true ||
            character.is_pnj === true ||
            character.isPnj === true
        ) {
            return "PNJ";
        }

        return "PJ";

    }

    getRpStatus(character) {

        const status =
            character.rp_status
            || character.rpStatus
            || character.status_rp
            || character.statusRp
            || null;

        if (!status) {
            return null;
        }

        return String(status).trim();

    }

}

module.exports =
    new CharacterHeader();
