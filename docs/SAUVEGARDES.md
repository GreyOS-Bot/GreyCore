# Sauvegardes de GreyCore

GreyCore crée une sauvegarde SQLite sûre après son démarrage, puis toutes les six heures. Elles sont enregistrées dans `data/backups/` sous la forme `greycore-AAAA-MM-JJ_HH-mm-ss-SSS.sqlite`.

Les quatorze sauvegardes automatiques les plus récentes sont conservées. Les plus anciennes sauvegardes automatiques sont supprimées ; les fichiers créés manuellement avec un autre nom ne sont jamais touchés.

Tu peux adapter ces valeurs dans le fichier `.env` avant de démarrer le bot :

```env
GREYCORE_BACKUP_INTERVAL_HOURS=6
GREYCORE_BACKUP_MAX_FILES=14
```

Pour restaurer une sauvegarde, arrête le bot, mets de côté `data/greycore.sqlite`, puis remplace-le par la copie souhaitée. Redémarre ensuite GreyCore : la structure de la base sera vérifiée automatiquement.

Avant une mise à jour importante, conserve aussi une copie manuelle de `data/greycore.sqlite` en dehors du dossier `data/backups/`.

Pour recevoir les incidents techniques dans Discord pendant la bêta, un administrateur peut aussi configurer un salon privé avec `/config journaux salon:#nom-du-salon`.
