const { getGender } = require("gender-detection-from-name");

const LANGUAGES = ["fr", "en", "it", "es", "de", "tr"];
const AMBIGUOUS_NAMES = new Set([
    "alex",
    "alix",
    "andrea",
    "camille",
    "charlie",
    "claude",
    "dominique",
    "eden",
    "lou",
    "morgan",
    "noa",
    "sacha",
    "sasha",
    "sam",
    "yael"
]);

function normalize(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-ZÀ-ÿ' -]/g, " ")
        .trim()
        .split(/\s+/)[0]
        ?.toLocaleLowerCase("fr") || "";
}

function infer(firstname) {
    const normalized = normalize(firstname);
    if (!normalized || AMBIGUOUS_NAMES.has(normalized)) {
        return "unspecified";
    }

    const detected = new Set(
        LANGUAGES
            .map(language => getGender(normalized, language))
            .filter(value => value === "female" || value === "male")
    );

    if (detected.size !== 1) {
        return "unspecified";
    }
    return detected.values().next().value;
}

module.exports = { infer, normalize, AMBIGUOUS_NAMES };
