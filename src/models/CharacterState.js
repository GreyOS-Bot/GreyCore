class CharacterState {
    constructor(data) {
        this.id = data.id;
        this.guildId = data.guildId;
        this.characterId = data.characterId;
        this.stateTypeId = data.stateTypeId;

        this.note = data.note || null;

        this.startedAt = data.startedAt;
        this.endedAt = data.endedAt || null;

        this.createdBy = data.createdBy;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    get isActive() {
        return this.endedAt === null;
    }
}

module.exports = CharacterState;