const button =
    require("../ui/ButtonFactory");

const icons =
    require("../theme/icons");

class Navigation {

    home(id = "v2_library_home") {

        return button.secondary({

            id,

            label: "Accueil",

            emoji: icons.home

        });

    }

    library(id = "v2_library_open") {

        return button.secondary({

            id,

            label: "Bibliothèque",

            emoji: icons.library

        });

    }

    close(id = "character_close") {

        return button.secondary({

            id,

            label: "Fermer",

            emoji: icons.close

        });

    }

}

module.exports =
    new Navigation();