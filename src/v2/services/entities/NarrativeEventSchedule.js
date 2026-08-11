const WEEKDAYS = new Map([
    ["dimanche", 0], ["lundi", 1], ["mardi", 2], ["mercredi", 3],
    ["jeudi", 4], ["vendredi", 5], ["samedi", 6]
]);

function normalizeSchedule({ calendarRule, weekdayRule, timeRule, timezone }) {
    return {
        calendarRule: normalizeCalendar(calendarRule),
        weekdayRule: normalizeWeekdays(weekdayRule),
        timeRule: normalizeTime(timeRule),
        timezone: normalizeTimezone(timezone)
    };
}

function matchSchedule(schedule, now = new Date()) {
    const parts = zonedParts(now, schedule.timezone);
    if (!matchesCalendar(schedule.calendarRule, parts.date)) return null;
    if (!matchesWeekday(schedule.weekdayRule, parts.weekday)) return null;
    if (!matchesTime(schedule.timeRule, parts.time)) return null;
    return `${parts.date}@${schedule.timeRule}`;
}

function normalizeCalendar(value) {
    const input = String(value || "toujours").trim().toLowerCase();
    if (["toujours", "tous", "*"].includes(input)) return "always";
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return `date:${input}`;
    if (/^(annuel:)?\d{2}-\d{2}$/.test(input)) return `annual:${input.replace(/^annuel:/, "")}`;
    const range = input.match(/^(\d{4}-\d{2}-\d{2})\s*(?:\.\.|au)\s*(\d{4}-\d{2}-\d{2})$/);
    if (range && range[1] <= range[2]) return `range:${range[1]}:${range[2]}`;
    throw new Error("Date invalide : utilisez toujours, AAAA-MM-JJ, MM-JJ ou AAAA-MM-JJ..AAAA-MM-JJ.");
}

function normalizeWeekdays(value) {
    const input = String(value || "tous").trim().toLowerCase();
    if (["tous", "tous les jours", "*"].includes(input)) return "*";
    const values = input.split(/[,;]+/).map(item => item.trim()).filter(Boolean);
    if (!values.length || values.some(item => !WEEKDAYS.has(item))) {
        throw new Error("Jours invalides : séparez lundi, vendredi, samedi… par des virgules.");
    }
    return [...new Set(values.map(item => WEEKDAYS.get(item)))].sort().join(",");
}

function normalizeTime(value) {
    const input = String(value || "").trim();
    const single = input.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (single) return `${single[1]}:${single[2]}`;
    const range = input.match(/^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/);
    if (range) return `${range[1]}:${range[2]}-${range[3]}:${range[4]}`;
    throw new Error("Heure invalide : utilisez HH:MM ou HH:MM-HH:MM.");
}

function normalizeTimezone(value) {
    const timezone = String(value || "Europe/Paris").trim();
    try { new Intl.DateTimeFormat("fr-FR", { timeZone: timezone }).format(); }
    catch { throw new Error("Fuseau horaire invalide (exemple : Europe/Paris)."); }
    return timezone;
}

function zonedParts(date, timezone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short"
    });
    const values = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(values.weekday);
    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}`,
        weekday
    };
}

function matchesCalendar(rule, date) {
    if (rule === "always") return true;
    if (rule.startsWith("date:")) return date === rule.slice(5);
    if (rule.startsWith("annual:")) return date.slice(5) === rule.slice(7);
    if (rule.startsWith("range:")) {
        const [, start, end] = rule.split(":");
        return date >= start && date <= end;
    }
    return false;
}

function matchesWeekday(rule, weekday) {
    return rule === "*" || rule.split(",").map(Number).includes(weekday);
}

function matchesTime(rule, time) {
    if (!rule.includes("-")) return time === rule;
    const [start, end] = rule.split("-");
    return start <= end ? time >= start && time <= end : time >= start || time <= end;
}

module.exports = { normalizeSchedule, matchSchedule };
