class StateType {
    constructor(data) {
        this.id = data.id;
        this.guildId = data.guildId;
        this.name = data.name;
        this.emoji = data.emoji || null;
        this.color = data.color || "#2B2D31";
        this.createdBy = data.createdBy;
        this.createdAt = data.createdAt;
    }
}

module.exports = StateType;