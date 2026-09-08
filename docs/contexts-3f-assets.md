# Phase 3F — Assets × Contexts

## Modèle et cutover

Le modèle historique stockait les biens dans `ContinuityAssetsV2` et leurs transferts dans `ContinuityAssetTransfersV2`, avec une propriété fondée sur une Continuity globale. Aucun rebuild n’est nécessaire : ces tables deviennent des archives et sources de migration en lecture seule.

L’ancien `AssetRepository` est conservé temporairement comme dépôt legacy dormant. Le sweep 3F confirme qu’aucun caller runtime ne l’importe : `AssetV2Manager` dépend exclusivement de `InstallationAssetRepository`.

`AssetTypesV2` reste une configuration Guild-wide, sans `context_id`. Les seules autorités runtime sont désormais `InstallationAssetsV2` et `InstallationAssetTransfersV2`. Un bien appartient à une Installation précise et porte la Guild et le Context dérivés de celle-ci. Des triggers empêchent les incohérences entre ces valeurs, le type et les Installations.

## Migration et historique

Un bien legacy est copié seulement lorsque `(guild_id, continuity_id)` résout exactement une Installation. Un transfert legacy est copié seulement si son bien possède un mapping runtime et si les Installations source et cible existent dans la même Guild et le même Context. Les lignes non déterminables restent exclusivement legacy ; aucun Context par défaut et aucune Installation artificielle ne sont utilisés.

Les champs narratifs, images, auteurs, notes et dates sont conservés. Les références uniques `legacy_asset_id` et `legacy_transfer_id` rendent le bootstrap idempotent. Les lectures historiques legacy sont explicitement séparées des listes runtime.

## Création, mutations et transferts

Une création valide l’Installation approved, le Context actif et le type non archivé de la bonne Guild. Les listes et compteurs partent de l’Installation courante. Les mutations par ID rechargent le bien et contrôlent Guild et Context avant effet.

Un transfert ne peut viser qu’une Installation de la même Guild et du même Context. Il change uniquement `installation_id` : `guild_id` et `context_id` restent immuables. La mise à jour conditionnelle sur l’Installation attendue protège contre les interfaces périmées ; mise à jour du propriétaire et insertion de l’historique sont atomiques.

Les transferts affichent les noms et Continuities dérivés par jointure, ainsi que leur Context, date, acteur et note. La suppression conserve la politique historique : le bien et son historique runtime lié sont supprimés ensemble, mais un ID forgé hors scope est refusé avant l’effet.

## Player, Staff et permissions

Les surfaces Player propagent l’Installation courante jusque dans le formulaire de création et limitent le sélecteur de transfert au Context courant. Un même Character installé dans plusieurs Contexts possède des inventaires indépendants. Ni le Context parent ni un changement de Context par défaut ne déplacent ou n’exposent les biens.

Les types et les statistiques Staff restent Guild-wide, mais les statistiques comptent uniquement le runtime afin d’éviter tout double comptage. Les permissions existantes `assets/read`, `assets/write`, owner et Administrator restent inchangées. Aucun droit ManageGuild, Validation Bridge, wildcard ou permission Context n’est ajouté.

Un bien historique reste lisible dans un Context inactif, tandis que création, modification, transfert et suppression runtime y sont refusés.

## Rollback et domaines différés

Le cutover étant additif et le legacy intact, un rollback technique 3F vers 3E peut être code-only : les nouvelles tables restent ignorées. Les écritures créées uniquement dans le runtime 3F ne sont cependant pas synchronisées vers le legacy et deviendraient donc temporairement inaccessibles après ce rollback. Le rollback ne promet aucune conservation fonctionnelle de ces nouvelles écritures. Le rollback complet Phase 3 vers Phase 2 demeure coordonné code/base à cause des lots antérieurs.

Bank/Economy, States, Entities, Automations et les transferts inter-Context restent hors 3F.
