const UI =
    require("../framework");

const pageRoutes = [
    [
        "page:staff:home",
        require("./staff/StaffCenterPage")
    ],
    [
        "page:staff:section",
        require("./staff/StaffSectionPage")
    ],
    [
        "page:character:home",
        require(
            "./character/OpenCharacterDashboardPage"
        )
    ],
    [
        "page:character:relationships",
        require(
            "./character/CharacterRelationshipsPage"
        )
    ],
    [
        "page:character:encounters",
        require(
            "./character/CharacterEncountersPage"
        )
    ],
    [
        "page:character:category:character",
        require(
            "./character/CharacterMainCategoryPage"
        )
    ],
    [
        "page:character:category:social",
        require(
            "./character/CharacterSocialCategoryPage"
        )
    ],
    [
        "page:character:category:possessions",
        require(
            "./character/CharacterPossessionsCategoryPage"
        )
    ],
    [
        "page:character:category:management",
        require(
            "./character/CharacterManagementCategoryPage"
        )
    ],
    [
        "page:character:assets",
        require(
            "./character/CharacterAssetsPage"
        )
    ],
    [
        "page:character:profile",
        require(
            "./character/CharacterProfilePage"
        )
    ],
    [
        "page:character:states",
        require(
            "./character/CharacterStatesPage"
        )
    ],
    [
        "page:character:journal",
        require(
            "./character/CharacterJournalPage"
        )
    ],
    [
        "page:character:outfit",
        require(
            "./character/CharacterOutfitPage"
        )
    ],
    [
        "page:character:installations",
        require(
            "./character/CharacterContinuitiesManagementPage"
        )
    ],
    [
        "page:character:installation",
        require(
            "./character/CharacterInstallationPage"
        )
    ],
    [
        "page:character:installation-delete",
        require(
            "./character/CharacterInstallationDeleteConfirmationPage"
        )
    ],
    [
        "page:character:installation-delete-confirmed",
        require(
            "./character/CharacterInstallationDeletePage"
        )
    ],
    [
        "page:character:settings",
        require(
            "./character/CharacterSettingsPage"
        )
    ],
    [
        "page:character:delete",
        require(
            "./character/CharacterDeleteConfirmationPage"
        )
    ],
    [
        "page:character:delete-confirmed",
        require(
            "./character/CharacterDeletePage"
        )
    ]
];

let pagesRegistered =
    false;

function registerPages() {
    if (pagesRegistered) {
        return;
    }

    for (
        const [
            route,
            handler
        ] of pageRoutes
    ) {
        UI.router.register(
            route,
            handler
        );
    }

    pagesRegistered =
        true;
}

module.exports = {
    registerPages
};
