class Character {
    constructor(data) {
        this.id = data.id;
        this.guildId = data.guildId;
        this.ownerId = data.ownerId;
        this.name = data.name;
        this.avatar = data.avatar || null;
        this.color = data.color || "#2B2D31";
        this.visibility = data.visibility || "private";
        this.type = data.type || "personnage_joue";
        this.status = data.status || "pending";
        this.validatedBy = data.validatedBy || null;
        this.validatedAt = data.validatedAt || null;
        this.rejectionReason = data.rejectionReason || null;
        this.isActive = data.isActive ?? true;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }
}

module.exports = Character;