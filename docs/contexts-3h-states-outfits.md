# Phase 3H — States et Outfits par Context

## States

`StateTypes` reste une configuration de Guild, sans `context_id`. Le runtime moderne est
`InstallationStatesV2` : chaque état porte l'Installation, la Guild et le Context exacts.
La base impose la cohérence Installation/Guild/Context/StateType, l'immuabilité du scope
et au plus un même StateType actif par Installation.

La migration relie le StateType historique à sa Guild, puis ne migre que si la Continuity
possède exactement une Installation dans cette Guild. Les autres lignes restent visibles
par l'API legacy explicite et ne sont jamais mélangées au runtime.

Les lectures historiques restent possibles lorsque le Context devient inactif. Create et
update sont refusés. `end` reste autorisé au propriétaire afin de fermer un état pour la
maintenance du lore ; delete conserve le contrat propriétaire historique, avec scope exact.

## Outfits

Le runtime moderne est `InstallationOutfitsV2`. La tenue courante est unique par
Installation grâce à un index partiel et les transitions sont atomiques. Create et
`setCurrent` ne désactivent que la tenue courante de cette Installation. Supprimer la tenue
courante ne promeut aucune tenue antérieure, conformément au comportement historique.

Une tenue legacy n'est migrée que si sa Continuity possède exactement une Installation au
total. Une Continuity sans Installation, multi-installation, ou avec plusieurs tenues
legacy marquées courantes reste legacy-only. Images, BLOB, nom de fichier, content-type,
URL et présentation sont préservés. Les uploads différés doivent conserver
`installationId`, `guildId` et `contextId`; ils ne recalculent jamais le Context par défaut.

## Frontières communes

Les mutations rechargent l'objet et revalident Installation, Guild, Context et propriétaire.
Un identifiant direct d'un autre scope est refusé avant écriture. Les Contexts parents et
enfants n'héritent d'aucun State ou Outfit. Un changement de Context par défaut ne déplace
aucune donnée. Les tables `ContinuityStatesV2` et `ContinuityOutfitsV2` sont des archives
legacy en lecture seule dès que les runtimes 3H existent. Aucune nouvelle permission n'est
introduite : l'ownership naturel et les contrats Phase 2 sont conservés.

Les FK vers l'Installation utilisent `ON DELETE RESTRICT`, comme les lots Phase 3 qui
préservent le lore : une suppression physique doit d'abord traiter explicitement l'historique.

## Rollback 3H vers 3G

Le schéma est additif et un rollback code-only reste techniquement possible. Toutefois,
aucun double-write n'est effectué : les States et Outfits créés après 3H seront invisibles
à l'ancien runtime 3G. Les tables 3H doivent être conservées pour éviter toute perte.
