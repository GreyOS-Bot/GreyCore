module.exports = {

    colors: require("./theme/colors"),

    icons: require("./theme/icons"),

    embed: require("./ui/EmbedFactory"),

    button: require("./ui/ButtonFactory"),

    text: require("./ui/TextFactory"),

    page: require("./layouts/Page"),

    router: require("./router/PageRouter"),

    components: {

        navigation: require("./components/Navigation"),

        characterCard: require("./components/CharacterCard"),

        characterHeader: require("./components/CharacterHeader")

    }

};