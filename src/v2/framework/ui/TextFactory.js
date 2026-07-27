class TextFactory {

    section(title, lines = []) {

        if (!Array.isArray(lines)) {
            lines = [lines];
        }

        const content = lines
            .filter(line => line !== null && line !== undefined && line !== "");

        if (content.length === 0) {
            return "";
        }

        return [
            `**${title}**`,
            "",
            ...content
        ].join("\n");
    }

    list(items = []) {

        return items
            .filter(Boolean)
            .map(item => `• ${item}`)
            .join("\n");
    }

    blocks(blocks = []) {

        return blocks
            .filter(Boolean)
            .join("\n\n");
    }

    empty(message) {

        return `*${message}*`;

    }

}

module.exports = new TextFactory();