class Phone {
    constructor(data) {
        this.id = data.id;

        this.guildId = data.guildId;

        this.characterId = data.characterId;

        this.phoneNumber = data.phoneNumber;

        this.isActive = data.isActive;

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }
}

module.exports = Phone;