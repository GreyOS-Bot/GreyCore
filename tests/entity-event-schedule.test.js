const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeSchedule, matchSchedule } = require("../src/v2/services/entities/NarrativeEventSchedule");

test("une apparition combine date annuelle, jour et heure", () => {
    const schedule = normalizeSchedule({
        calendarRule: "10-31",
        weekdayRule: "samedi, dimanche",
        timeRule: "20:00",
        timezone: "Europe/Paris"
    });

    assert.deepEqual(schedule, {
        calendarRule: "annual:10-31",
        weekdayRule: "0,6",
        timeRule: "20:00",
        timezone: "Europe/Paris"
    });
    assert.equal(matchSchedule(schedule, new Date("2026-10-31T19:00:00.000Z")), "2026-10-31@20:00");
    assert.equal(matchSchedule(schedule, new Date("2026-10-31T18:59:00.000Z")), null);
});

test("une plage horaire traversant minuit reste active", () => {
    const schedule = normalizeSchedule({
        calendarRule: "toujours",
        weekdayRule: "tous",
        timeRule: "22:00-02:00",
        timezone: "UTC"
    });

    assert.equal(matchSchedule(schedule, new Date("2026-08-11T23:30:00.000Z")), "2026-08-11@22:00-02:00");
    assert.equal(matchSchedule(schedule, new Date("2026-08-11T03:00:00.000Z")), null);
});

test("une période de dates est inclusive", () => {
    const schedule = normalizeSchedule({
        calendarRule: "2026-12-20..2026-12-31",
        weekdayRule: "tous",
        timeRule: "18:00-23:59",
        timezone: "UTC"
    });

    assert.ok(matchSchedule(schedule, new Date("2026-12-20T18:00:00.000Z")));
    assert.ok(matchSchedule(schedule, new Date("2026-12-31T23:59:00.000Z")));
    assert.equal(matchSchedule(schedule, new Date("2027-01-01T18:00:00.000Z")), null);
});

test("les règles ambiguës ou invalides sont refusées", () => {
    assert.throws(() => normalizeSchedule({ calendarRule: "Halloween", weekdayRule: "tous", timeRule: "20:00" }), /Date invalide/);
    assert.throws(() => normalizeSchedule({ calendarRule: "toujours", weekdayRule: "funday", timeRule: "20:00" }), /Jours invalides/);
    assert.throws(() => normalizeSchedule({ calendarRule: "toujours", weekdayRule: "tous", timeRule: "25:00" }), /Heure invalide/);
});
