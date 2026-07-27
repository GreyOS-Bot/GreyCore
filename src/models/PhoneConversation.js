class PhoneConversation {
    constructor(data) {
        this.id = data.id;

        this.guildId = data.guildId;

        this.phoneAId = data.phoneAId;
        this.phoneBId = data.phoneBId;

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }
}

module.exports = PhoneConversation;