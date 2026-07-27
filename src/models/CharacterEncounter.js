class CharacterEncounter {
    constructor(data) {
        this.id = data.id;
        this.guildId = data.guildId;

        this.characterAId = data.characterAId;
        this.characterBId = data.characterBId;

        this.occurredAt = data.occurredAt;
        this.location = data.location || null;
        this.note = data.note || null;

        this.createdBy = data.createdBy;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }
}

module.exports = CharacterEncounter;