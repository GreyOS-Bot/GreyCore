const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");
function reload(p) {
  delete require.cache[require.resolve(p)];
  return require(p);
}
function ctx(db, g, key, parent = null) {
  const R = reload("../src/v2/repositories/ContextRepository"),
    S = reload("../src/v2/services/contexts/ContextService");
  return new S(new R(db)).create({
    guildId: g,
    key,
    name: key,
    parentContextId: parent,
  });
}
function install(db, ch, co, g, c) {
  const used = db
    .prepare(
      "SELECT 1 FROM CharacterGuildInstallationsV2 WHERE continuity_id=? AND guild_id=?",
    )
    .get(co, g);
  const continuity = used ? `${co}b` : co;
  return Number(
    db
      .prepare(
        `INSERT INTO CharacterGuildInstallationsV2(character_id,continuity_id,guild_id,status,visibility,proxy_enabled,installed_at,updated_at,context_id)VALUES(?,?,?,'approved','public',1,'now','now',?)`,
      )
      .run(ch, continuity, g, c).lastInsertRowid,
  );
}
function seed(db) {
  db.prepare(
    "INSERT INTO Guilds(id,name,created_at)VALUES('g1','G1','now'),('g2','G2','now')",
  ).run();
  db.prepare(
    "INSERT INTO UsersV2(id,discord_user_id,created_at,updated_at)VALUES(1,'u1','now','now'),(2,'u2','now','now'),(3,'u3','now','now')",
  ).run();
  for (const n of [1, 2, 3]) {
    db.prepare(
      "INSERT INTO CharactersV2(id,owner_user_id,proxy_name,character_type,created_at,updated_at)VALUES(?,?,?,'personnage_joue','now','now')",
    ).run(`ch${n}`, n, `P${n}`);
    db.prepare(
      "INSERT INTO CharacterContinuitiesV2(id,character_id,name,created_at,updated_at)VALUES(?,?,?,'now','now')",
    ).run(`co${n}`, `ch${n}`, `C${n}`);
    db.prepare(
      "INSERT INTO CharacterContinuitiesV2(id,character_id,name,created_at,updated_at)VALUES(?,?,?,'now','now')",
    ).run(`co${n}b`, `ch${n}`, `C${n}b`);
  }
}
function manager() {
  reload("../src/v2/repositories/InstallationEncounterRepository");
  return reload("../src/v2/managers/EncounterV2Manager");
}

test("3G isole create, liste, détail, update et delete par Installation", () => {
  const h = createIsolatedDatabase({ initializeSchema: true });
  try {
    const db = h.database;
    seed(db);
    const a = ctx(db, "g1", "a"),
      b = ctx(db, "g1", "b"),
      child = ctx(db, "g1", "child", a.id),
      g2 = ctx(db, "g2", "a");
    const ia = install(db, "ch1", "co1", "g1", a.id),
      ib = install(db, "ch2", "co2", "g1", a.id),
      ia2 = install(db, "ch1", "co1", "g1", b.id),
      ib2 = install(db, "ch2", "co2", "g1", b.id),
      ic = install(db, "ch3", "co3", "g1", child.id),
      ig = install(db, "ch2", "co2", "g2", g2.id);
    const m = manager();
    const internal = m.create({
      guildId: "g1",
      contextId: a.id,
      installationAId: ia,
      installationBId: ib,
      location: "Bar",
      occurredAt: "2026-09-01",
      createdBy: "u1",
    });
    const repeatedInternal = m.create({
      guildId: "g1",
      contextId: a.id,
      installationAId: ia,
      installationBId: ib,
      occurredAt: "2026-09-02",
      createdBy: "u1",
    });
    const external = m.create({
      guildId: "g1",
      contextId: a.id,
      installationAId: ia,
      externalName: " PNJ ",
      createdBy: "u1",
    });
    assert.deepEqual(
      m.getForInstallationInContext(ia, "g1", a.id).map((x) => x.id),
      [external.id, repeatedInternal.id, internal.id],
    );
    assert.equal(db.prepare("SELECT COUNT(*) n FROM ContinuityEncountersV2").get().n,0);
    assert.throws(() => db.prepare(`INSERT INTO InstallationEncountersV2(guild_id,context_id,installation_a_id,installation_b_id,external_name,occurred_at,created_by,created_at,updated_at) VALUES(?,?,?,?,?,'2026-01-01','u','c','u')`).run("g1",a.id,ia,ib,"forbidden"),/CHECK/);
    assert.throws(() => db.prepare(`INSERT INTO InstallationEncountersV2(guild_id,context_id,installation_a_id,installation_b_id,external_name,occurred_at,created_by,created_at,updated_at) VALUES(?,?,?,?,?,'2026-01-01','u','c','u')`).run("g1",a.id,ia,null," "),/CHECK/);
    assert.equal(m.getForInstallationInContext(ia2, "g1", b.id).length, 0);
    assert.equal(m.getForInstallationInContext(ic, "g1", child.id).length, 0);
    assert.throws(
      () =>
        m.create({
          guildId: "g1",
          contextId: a.id,
          installationAId: ia,
          installationBId: ib2,
          createdBy: "u1",
        }),
      /hors contexte/,
    );
    assert.throws(
      () =>
        m.create({
          guildId: "g1",
          contextId: a.id,
          installationAId: ia,
          installationBId: ig,
          createdBy: "u1",
        }),
      /hors contexte/,
    );
    assert.throws(
      () =>
        m.requireScopedEncounter(internal.id, {
          installationId: ia2,
          guildId: "g1",
          contextId: b.id,
        }),
      /installation/,
    );
    assert.equal(
      m
        .getEligibleTargets(ia, "g1", a.id)
        .some((x) => x.installation_id === ib),
      true,
    );
    assert.equal(
      m
        .getEligibleTargets(ia, "g1", a.id)
        .some((x) => x.installation_id === ib2),
      false,
    );
    const updated = m.updateScoped(
      external.id,
      { installationId: ia, guildId: "g1", contextId: a.id, actorId: "u1" },
      { externalName: "Guide", location: "Quai" },
    );
    assert.equal(updated.external_name, "Guide");
    assert.throws(()=>m.updateScoped(external.id,{installationId:ia,guildId:"g1",contextId:a.id,actorId:"u1"},{installationBId:ib}),/immuables/);
    assert.throws(
      () =>
        m.updateScoped(
          internal.id,
          { installationId: ia, guildId: "g1", contextId: a.id, actorId: "u1" },
          { externalName: "bad" },
        ),
      /devenir externe/,
    );
    assert.throws(() => m.updateScoped(external.id,{installationId:ia,guildId:"g1",contextId:a.id,actorId:"u1"},{occurredAt:"2026-02-30"}),/date/);
    assert.throws(() => m.updateScoped(external.id,{installationId:ia,guildId:"g1",contextId:a.id,actorId:"u1"},{occurredAt:"02-03-2026"}),/format/);
    assert.throws(() => m.requireScopedEncounter(internal.id,{installationId:ia,guildId:"g2",contextId:a.id}),/installation/);
    db.transaction(() => {
      db.prepare("UPDATE Contexts SET is_default=0 WHERE guild_id='g1'").run();
      db.prepare("UPDATE Contexts SET is_default=1 WHERE id=?").run(b.id);
    })();
    assert.equal(m.getById(internal.id).context_id, a.id);
    db.prepare("UPDATE Contexts SET is_active=0,is_default=0 WHERE id=?").run(
      a.id,
    );
    assert.equal(m.getForInstallationInContext(ia, "g1", a.id).length, 3);
    assert.throws(
      () =>
        m.updateScoped(
          external.id,
          { installationId: ia, guildId: "g1", contextId: a.id, actorId: "u1" },
          { note: "x" },
        ),
      /inactif/,
    );
    assert.throws(
      () =>
        m.create({
          guildId: "g1",
          contextId: a.id,
          installationAId: ia,
          externalName: "x",
          createdBy: "u1",
        }),
      /contexte/,
    );
    m.deleteScoped(internal.id, {
      installationId: ia,
      guildId: "g1",
      contextId: a.id,
      actorId: "u1",
    });
    assert.equal(m.getById(internal.id), undefined);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM ContinuityEncountersV2").get().n,0);
    assert.equal(db.pragma("integrity_check", { simple: true }), "ok");
  } finally {
    h.cleanup();
  }
});

test("3G migre seulement les rencontres internes et externes déterministes", () => {
  const h = createIsolatedDatabase({ initializeSchema: true });
  try {
    const db = h.database;
    seed(db);
    const a = ctx(db, "g1", "a"),
      b = ctx(db, "g2", "b");
    install(db, "ch1", "co1", "g1", a.id);
    install(db, "ch2", "co2", "g1", a.id);
    install(db, "ch3", "co3", "g1", a.id);
    install(db, "ch3", "co3", "g2", b.id);
    db.prepare(
      `INSERT INTO ContinuityEncountersV2(id,continuity_a_id,continuity_b_id,external_name,location,note,occurred_at,created_by,created_at,updated_at)VALUES
 (11,'co1','co2',NULL,'Bar','N','2026-01-01','u1','c','u'),(12,'co1',NULL,'PNJ','Rue','E','2026-01-02','u1','c','u'),(13,'co3',NULL,'Ambigu',NULL,NULL,'2026-01-03','u3','c','u')`,
    ).run();
    const init = reload("../src/v2/repositories/InstallationEncounterSchema");
    init(db);
    assert.deepEqual(
      db
        .prepare(
          "SELECT legacy_encounter_id FROM InstallationEncountersV2 ORDER BY legacy_encounter_id",
        )
        .all()
        .map((x) => x.legacy_encounter_id),
      [11, 12],
    );
    assert.equal(
      db
        .prepare(
          "SELECT external_name FROM InstallationEncountersV2 WHERE legacy_encounter_id=12",
        )
        .get().external_name,
      "PNJ",
    );
    const migrated=db.prepare("SELECT * FROM InstallationEncountersV2 WHERE legacy_encounter_id=11").get();
    assert.deepEqual([migrated.location,migrated.note,migrated.occurred_at,migrated.created_by,migrated.created_at,migrated.updated_at],["Bar","N","2026-01-01","u1","c","u"]);
    assert.deepEqual(manager().getLegacyUnmigratedExternal().map(x=>x.id),[13]);
    const legacyRepository=reload("../src/v2/repositories/EncounterRepository");
    assert.throws(()=>legacyRepository.insert({}),/lecture seule/);
    assert.throws(()=>legacyRepository.update(11,{}),/lecture seule/);
    assert.throws(()=>legacyRepository.delete(11),/lecture seule/);
    init(db);
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM InstallationEncountersV2").get().n,
      2,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM ContinuityEncountersV2").get().n,
      3,
    );
    manager().deleteScoped(migrated.id,{installationId:migrated.installation_a_id,guildId:migrated.guild_id,contextId:migrated.context_id,actorId:"u1"});
    assert.equal(db.prepare("SELECT COUNT(*) n FROM ContinuityEncountersV2 WHERE id=11").get().n,1);
    assert.equal(db.pragma("integrity_check", { simple: true }), "ok");
  } finally {
    h.cleanup();
  }
});

test("3G refuse le legacy interne multi-Guild ambigu", () => {
  const h = createIsolatedDatabase({ initializeSchema: true });
  try {
    const db = h.database;
    seed(db);
    const a = ctx(db, "g1", "a"),
      b = ctx(db, "g2", "b");
    install(db, "ch1", "co1", "g1", a.id);
    install(db, "ch2", "co2", "g1", a.id);
    install(db, "ch1", "co1", "g2", b.id);
    install(db, "ch2", "co2", "g2", b.id);
    db.prepare(
      "INSERT INTO ContinuityEncountersV2(id,continuity_a_id,continuity_b_id,occurred_at,created_by,created_at,updated_at)VALUES(21,'co1','co2','2026-01-01','u1','c','u')",
    ).run();
    reload("../src/v2/repositories/InstallationEncounterSchema")(db);
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM InstallationEncountersV2").get().n,
      0,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM ContinuityEncountersV2").get().n,
      1,
    );
  } finally {
    h.cleanup();
  }
});

test("3G bootstrap historique x2, intégrité et indexes", () => {
  const h = createIsolatedDatabase({ copyExisting: true });
  try {
    const db = h.database,
      before = db
        .prepare("SELECT COUNT(*) n FROM ContinuityEncountersV2")
        .get().n,
      schema = reload("../src/database/schema"),
      log = console.log;
    console.log = () => {};
    let first;
    try {
      schema.initializeDatabase();
      first = db
        .prepare("SELECT COUNT(*) n FROM InstallationEncountersV2")
        .get().n;
      schema.initializeDatabase();
    } finally {
      console.log = log;
    }
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM InstallationEncountersV2").get().n,
      first,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM ContinuityEncountersV2").get().n,
      before,
    );
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) n FROM InstallationEncountersV2 GROUP BY legacy_encounter_id HAVING legacy_encounter_id IS NOT NULL AND COUNT(*)>1",
        )
        .get(),
      undefined,
    );
    const plan = (sql, args) =>
      db
        .prepare(`EXPLAIN QUERY PLAN ${sql}`)
        .all(...args)
        .map((x) => x.detail)
        .join(" ");
    assert.match(
      plan(
        "SELECT * FROM InstallationEncountersV2 WHERE installation_a_id=? ORDER BY occurred_at DESC,id DESC",
        [1],
      ),
      /idx_installation_encounters_a_date/,
    );
    assert.match(
      plan(
        "SELECT * FROM InstallationEncountersV2 WHERE guild_id=? AND context_id=?",
        ["g", "c"],
      ),
      /idx_installation_encounters_scope/,
    );
    assert.match(
      plan(
        "SELECT * FROM InstallationEncountersV2 WHERE installation_b_id=? AND context_id=?",
        [1, "c"],
      ),
      /idx_installation_encounters_b_context/,
    );
    assert.equal(db.pragma("integrity_check", { simple: true }), "ok");
  } finally {
    h.cleanup();
  }
});
