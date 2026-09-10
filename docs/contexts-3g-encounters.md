# Phase 3G — Encounters × Contexts

`ContinuityEncountersV2` ne porte historiquement ni Guild, ni Context, ni Installation. Elle reste intacte comme source de migration et archive legacy en lecture seule. Son ancien repository est dormant et ses méthodes d’écriture échouent explicitement ; une lecture dédiée expose les externes non migrées sans les injecter dans le runtime. Le runtime moderne utilise `InstallationEncountersV2` : une rencontre appartient à l’Installation A exacte et conserve définitivement sa Guild et son Context.

Une rencontre interne référence une Installation B différente, dans la même Guild et le même Context, sans nom externe. Une rencontre externe ne référence aucune Installation B et conserve un nom libre non vide ; elle ne crée aucun personnage, Continuity, Installation ou Entity. Le lieu reste du texte libre : 3G n’introduit aucune dépendance Geography ni aucun Location ID. La date conserve la validation calendrier `YYYY-MM-DD`.

La migration interne construit tous les couples A/B partageant exactement une Guild et un Context et ne copie que lorsqu’un seul couple existe. La migration externe exige exactement une Installation A. Zéro ou plusieurs candidats laissent le legacy inchangé : aucun défaut, ordre ancien, lieu, date ou auteur ne sert à deviner le scope. `legacy_encounter_id` rend le bootstrap idempotent.

Les parcours Player restent owner-only. Aucune permission Staff Encounter n’existe ni n’est ajoutée. Les sélecteurs ne proposent que les Installations approuvées, jouables et non archivées du Context courant ; le backend recharge et revérifie l’Installation, la Guild et le Context pour chaque ID direct. Un Context inactif reste lisible historiquement, mais interdit création et modification. Les changements de défaut et la hiérarchie Parent/Child ne déplacent ni ne partagent les rencontres.

Rollback 3G vers 3F : le code peut revenir en arrière puisque la table legacy reste intacte, mais les rencontres créées uniquement après 3G seraient invisibles à l’ancien runtime. Un rollback global Phase 3 vers Phase 2 présente la même limite et exige une stratégie explicite de réconciliation avant tout basculement réel.
