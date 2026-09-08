function exists(db,name){return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));}
function initialize(db){db.exec(`
 CREATE TABLE IF NOT EXISTS InstallationAssetsV2(
  id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,context_id TEXT NOT NULL,installation_id INTEGER NOT NULL,
  asset_type_id INTEGER NOT NULL,name TEXT NOT NULL,description TEXT,details TEXT,image_url TEXT,
  created_by TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,legacy_asset_id INTEGER UNIQUE,
  FOREIGN KEY(guild_id) REFERENCES Guilds(id),FOREIGN KEY(context_id) REFERENCES Contexts(id),
  FOREIGN KEY(installation_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
  FOREIGN KEY(asset_type_id) REFERENCES AssetTypesV2(id) ON DELETE RESTRICT,
  FOREIGN KEY(legacy_asset_id) REFERENCES ContinuityAssetsV2(id) ON DELETE SET NULL);
 CREATE TABLE IF NOT EXISTS InstallationAssetTransfersV2(
  id INTEGER PRIMARY KEY AUTOINCREMENT,asset_id INTEGER NOT NULL,guild_id TEXT NOT NULL,context_id TEXT NOT NULL,
  from_installation_id INTEGER NOT NULL,to_installation_id INTEGER NOT NULL,transferred_by TEXT NOT NULL,note TEXT,created_at TEXT NOT NULL,
  legacy_transfer_id INTEGER UNIQUE,FOREIGN KEY(asset_id) REFERENCES InstallationAssetsV2(id) ON DELETE CASCADE,
  FOREIGN KEY(guild_id) REFERENCES Guilds(id),FOREIGN KEY(context_id) REFERENCES Contexts(id),
  FOREIGN KEY(from_installation_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
  FOREIGN KEY(to_installation_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
  FOREIGN KEY(legacy_transfer_id) REFERENCES ContinuityAssetTransfersV2(id) ON DELETE SET NULL);
 CREATE INDEX IF NOT EXISTS idx_installation_assets_scope ON InstallationAssetsV2(guild_id,context_id,asset_type_id);
 CREATE INDEX IF NOT EXISTS idx_installation_assets_owner ON InstallationAssetsV2(installation_id);
 CREATE INDEX IF NOT EXISTS idx_installation_asset_transfers_asset ON InstallationAssetTransfersV2(asset_id,created_at DESC);
 CREATE INDEX IF NOT EXISTS idx_installation_asset_transfers_context ON InstallationAssetTransfersV2(guild_id,context_id);
 CREATE TRIGGER IF NOT EXISTS trg_installation_asset_scope_insert BEFORE INSERT ON InstallationAssetsV2 WHEN NOT EXISTS(
  SELECT 1 FROM CharacterGuildInstallationsV2 i JOIN Contexts c ON c.id=NEW.context_id AND c.guild_id=NEW.guild_id
  JOIN AssetTypesV2 t ON t.id=NEW.asset_type_id AND t.guild_id=NEW.guild_id
  WHERE i.id=NEW.installation_id AND i.guild_id=NEW.guild_id AND i.context_id=NEW.context_id)
  BEGIN SELECT RAISE(ABORT,'Installation asset scope mismatch');END;
 CREATE TRIGGER IF NOT EXISTS trg_installation_asset_scope_update BEFORE UPDATE OF guild_id,context_id,installation_id,asset_type_id ON InstallationAssetsV2 WHEN NOT EXISTS(
  SELECT 1 FROM CharacterGuildInstallationsV2 i JOIN Contexts c ON c.id=NEW.context_id AND c.guild_id=NEW.guild_id
  JOIN AssetTypesV2 t ON t.id=NEW.asset_type_id AND t.guild_id=NEW.guild_id
  WHERE i.id=NEW.installation_id AND i.guild_id=NEW.guild_id AND i.context_id=NEW.context_id
  AND NEW.guild_id=OLD.guild_id AND NEW.context_id=OLD.context_id AND NEW.asset_type_id=OLD.asset_type_id)
  BEGIN SELECT RAISE(ABORT,'Installation asset scope mismatch');END;
 CREATE TRIGGER IF NOT EXISTS trg_installation_asset_transfer_scope BEFORE INSERT ON InstallationAssetTransfersV2 WHEN NOT EXISTS(
  SELECT 1 FROM InstallationAssetsV2 a JOIN CharacterGuildInstallationsV2 f ON f.id=NEW.from_installation_id
  JOIN CharacterGuildInstallationsV2 t ON t.id=NEW.to_installation_id WHERE a.id=NEW.asset_id
  AND a.guild_id=NEW.guild_id AND a.context_id=NEW.context_id AND f.guild_id=NEW.guild_id AND t.guild_id=NEW.guild_id
  AND f.context_id=NEW.context_id AND t.context_id=NEW.context_id)
  BEGIN SELECT RAISE(ABORT,'Installation asset transfer scope mismatch');END;`);}
function candidate(db,guild,continuity){const rows=db.prepare("SELECT id,context_id FROM CharacterGuildInstallationsV2 WHERE guild_id=? AND continuity_id=? ORDER BY id").all(String(guild),continuity);return rows.length===1?rows[0]:null;}
function migrate(db){if(!exists(db,'Guilds')||!exists(db,'Contexts')||!exists(db,'ContinuityAssetsV2')||!exists(db,'CharacterGuildInstallationsV2'))return;const insert=db.prepare(`INSERT OR IGNORE INTO InstallationAssetsV2(guild_id,context_id,installation_id,asset_type_id,name,description,details,image_url,created_by,created_at,updated_at,legacy_asset_id)VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);for(const a of db.prepare("SELECT * FROM ContinuityAssetsV2 ORDER BY id").all()){const i=candidate(db,a.guild_id,a.continuity_id);if(i)insert.run(String(a.guild_id),i.context_id,i.id,a.asset_type_id,a.name,a.description,a.details,a.image_url,a.created_by,a.created_at,a.updated_at,a.id);}if(!exists(db,'ContinuityAssetTransfersV2'))return;const transfer=db.prepare(`INSERT OR IGNORE INTO InstallationAssetTransfersV2(asset_id,guild_id,context_id,from_installation_id,to_installation_id,transferred_by,note,created_at,legacy_transfer_id)VALUES(?,?,?,?,?,?,?,?,?)`);for(const t of db.prepare("SELECT * FROM ContinuityAssetTransfersV2 ORDER BY id").all()){const runtime=db.prepare("SELECT id FROM InstallationAssetsV2 WHERE legacy_asset_id=?").get(t.asset_id),from=candidate(db,t.guild_id,t.from_continuity_id),to=candidate(db,t.guild_id,t.to_continuity_id);if(runtime&&from&&to&&from.context_id===to.context_id)transfer.run(runtime.id,String(t.guild_id),from.context_id,from.id,to.id,t.transferred_by,t.note,t.created_at,t.id);}}
module.exports=function(db){initialize(db);db.transaction(()=>migrate(db))();};
