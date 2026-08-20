# GreyCore - checklist de beta fermee

Cette checklist sert a tester GreyCore dans de vraies conditions Discord avant
d'inviter davantage de joueurs. Elle se fait idealement avec trois personnes :

- **Staff** : configure le serveur et valide les demandes.
- **Joueur A** : cree et joue le premier personnage.
- **Joueur B** : cree et joue le second personnage.

Prevoir un deuxieme serveur Discord est recommande pour verifier les
installations multi-serveurs. La premiere seance prend environ une a deux heures.

## Avant la seance

Sur le VPS, verifier que GreyCore est en ligne :

```bash
pm2 status
```

Avant de modifier le bot ou de commencer une grosse seance de test, conserver
une copie de la base :

```bash
cd ~/apps/GreyCore
mkdir -p data/backups
cp data/greycore.sqlite data/backups/beta-$(date +%F-%H%M).sqlite
```

Sur le premier serveur de test, le staff effectue ensuite ces actions :

- [ ] Configurer le salon de validation avec `/config validation`.
- [ ] Configurer le salon d'erreurs avec `/config journaux`.
- [ ] Verifier que GreyCore envoie bien sa carte verte de confirmation dans le salon d'erreurs.
- [ ] Verifier que le staff peut ouvrir le salon de validation et que les joueurs ordinaires ne le peuvent pas.
- [ ] Ouvrir `/config modules` et activer les modules a tester : Relations, Etats, Telephone, Tenues et Biens.
- [ ] Installer les types de relations par defaut avec `/installer-relations`.
- [ ] Installer les types d'etats par defaut avec `/installer-etats`.

Pour tester les installations sur plusieurs serveurs, reproduire les quatre
premieres actions sur le deuxieme serveur avec son propre salon de validation.

## 1. Creation et validation d'un personnage

### Joueur A

- [ ] Ouvrir `/mes personnages` et commencer la creation d'un PJ.
- [ ] Renseigner l'identite, les informations, l'histoire et l'avatar.
- [ ] Choisir clairement le nom du proxy.
- [ ] Envoyer la demande au staff.
- [ ] Verifier que le personnage reste non jouable tant que le staff ne l'a pas valide.

### Staff

- [ ] Verifier que la carte de validation apparait dans le bon salon.
- [ ] Verifier que les etapes sont visuelles et que le pseudo du joueur est lisible.
- [ ] Refuser une premiere fois la demande avec un motif simple de test.

### Joueur A, puis staff

- [ ] Verifier que Joueur A voit le motif de refus et peut corriger sa fiche.
- [ ] Renvoyer la demande.
- [ ] Valider la demande avec le staff.
- [ ] Verifier que Joueur A recoit la notification et peut desormais utiliser son personnage.
- [ ] Ouvrir l'historique de validation depuis la carte staff et verifier les etapes : envoi, refus, correction, nouvelle soumission et validation.

## 2. Consultation et permissions

- [ ] Joueur B ouvre la fiche de Joueur A avec `Voir la fiche` sur son proxy GreyCore.
- [ ] Verifier que la fiche est lisible, mais qu'aucun bouton de modification, de suppression ou de gestion n'est disponible.
- [ ] Joueur A ouvre sa propre fiche et verifie que ses actions de gestion sont presentes.
- [ ] Joueur B essaie de fermer son interface personnelle : cela ne doit pas fermer celle de Joueur A.
- [ ] Creer, si souhaite, un PNJ puis un Random pour verifier leurs libelles et leurs regles de jeu.

## 3. Installation sur un autre serveur

Cette partie demande que le personnage de Joueur A soit deja valide sur le
premier serveur et que le deuxieme serveur soit configure.

- [ ] Depuis la fiche de Joueur A, ouvrir la Bibliotheque ou le bouton d'installation.
- [ ] Choisir le deuxieme serveur.
- [ ] Tester une installation de personnage complet.
- [ ] Verifier que l'avatar initial est conserve et que la demande arrive au staff du deuxieme serveur.
- [ ] Valider la demande sur le deuxieme serveur.
- [ ] Modifier ensuite l'avatar sur le deuxieme serveur et verifier que l'avatar du premier serveur ne change pas.
- [ ] Refaire le parcours avec une nouvelle continuite et verifier que ses donnees RP sont separees.
- [ ] Supprimer uniquement l'installation du deuxieme serveur et verifier que le personnage et le premier serveur restent intacts.

## 4. Relations, etats et rencontres

Preparer un personnage valide pour Joueur B avant cette partie.

- [ ] Depuis le personnage de Joueur A, ajouter une relation vers le personnage de Joueur B.
- [ ] Verifier que la recherche est alphabetique et permet de retrouver rapidement le personnage.
- [ ] Verifier que Joueur B recoit une demande, puis l'accepte.
- [ ] Verifier que les deux fiches affichent le bon libelle de relation.
- [ ] Creer une relation entre deux personnages appartenant a la meme personne : elle doit etre creee sans demande inutile.
- [ ] Modifier les details d'une relation : note et date facultative.
- [ ] Ajouter un etat, le modifier puis le supprimer.
- [ ] Creer une rencontre avec un personnage GreyCore, puis une rencontre avec un personnage externe.
- [ ] Verifier qu'un personnage non valide ne peut pas utiliser ces outils RP.

## 5. Telephone

- [ ] Ouvrir le Telephone depuis la fiche de Joueur A et verifier le numero attribue.
- [ ] Rechercher le personnage de Joueur B et ouvrir une conversation privee.
- [ ] Envoyer un SMS depuis un salon de test.
- [ ] Verifier que Joueur B recoit une notification avec le lien direct vers le salon et le message.
- [ ] Repondre depuis Joueur B et verifier l'historique des deux cotes.
- [ ] Creer une conversation de groupe avec au moins trois personnages.
- [ ] Envoyer un SMS de groupe puis un MMS avec image ou GIF et une legende facultative.
- [ ] Verifier que chaque autre proprietaire concerne recoit une notification.
- [ ] Lancer un appel, l'accepter, le laisser ouvert quelques minutes, puis le terminer.
- [ ] Verifier qu'il ne devient pas automatiquement un appel manque et que les deux interfaces se mettent a jour.
- [ ] Fermer une interface Telephone et verifier que la conversation de l'autre joueur existe toujours.

## 6. Tenues et biens

- [ ] Ajouter une tenue avec un titre, une description facultative et une image.
- [ ] Modifier la tenue et verifier que ses informations restent propres au serveur courant.
- [ ] Ajouter un bien avec une categorie, une description et une image facultative.
- [ ] Ouvrir le bien depuis la fiche de son proprietaire.
- [ ] Offrir ou transferer le bien au personnage de Joueur B.
- [ ] Verifier que Joueur B recoit une notification avec un lien vers le salon.
- [ ] Ouvrir l'historique du bien et verifier que le transfert mentionne les deux personnages et la personne ayant realise l'action.
- [ ] Verifier que Joueur A ne peut plus gerer le bien une fois le transfert effectue.

## 7. Fin de seance et suivi des anomalies

Pour chaque probleme, noter dans un salon staff :

- [ ] l'heure approximative ;
- [ ] le serveur concerne ;
- [ ] le personnage et le compte Discord utilises ;
- [ ] les clics effectues juste avant le probleme ;
- [ ] une capture d'ecran ;
- [ ] le contenu de la carte apparue dans le salon d'erreurs, si elle existe.

Classer le retour ainsi :

| Niveau | Signification |
| --- | --- |
| Bloquant | Le joueur ne peut plus avancer ou risque de perdre des donnees. |
| Important | Une fonction principale marche mal, mais un contournement existe. |
| Interface | Le parcours fonctionne mais le texte, un bouton ou la presentation est a ajuster. |
| Idee | Amelioration souhaitee, sans urgence pour la beta. |

Ne pas modifier la base manuellement pendant une seance. En cas de souci
bloquant, conserver la capture et les logs, puis restaurer la sauvegarde faite
avant la seance seulement si c'est necessaire.
