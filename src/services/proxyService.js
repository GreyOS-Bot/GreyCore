function parseProxy(message) {

    const match = message.match(/^([^:\r\n]+):\s*([\s\S]*)$/);

    if (!match) {
        return null;
    }

    return {
        character: match[1].trim(),
        content: match[2].trim()
    };
}

module.exports = {
    parseProxy
};
