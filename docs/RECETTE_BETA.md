# Recette de beta fermee GreyCore

Ce document sert a verifier GreyCore sur Discord avant d'inviter davantage de joueurs.
Il est preferable de faire les essais avec trois comptes : un membre du staff et deux joueurs sans permission particuliere.

## Avant de commencer

- Redeposer les commandes avec `npm run deploy`, puis redemarrer le bot.
- Prevoir un salon prive pour les validations et un salon prive pour les erreurs.
- Configurer le salon de validation avec `/config validation`.
- Configurer le salon d'erreurs avec `/config journaux` et verifier la carte verte de test.
- Conserver une copie recuperable de `data/greycore.sqlite` avant chaque seance de test.

## 1. Configuration et droits

| Essai | Resultat attendu |
| --- | --- |
| Creer ou choisir le salon de validation | Seuls le staff et le bot y accedent. |
| Ajouter un membre ayant acces a ce salon | Il peut utiliser les commandes staff pour les relations et les etats. |
| Essayer ces commandes avec un joueur ordinaire | L'acces est refuse clairement. |
| Provoquer une erreur de test non sensible | Le salon d'erreurs recoit une carte technique, sans information privee. |

## 2. Personnages et installations

| Essai | Resultat attendu |
| --- | --- |
| Creer un PJ avec avatar et envoyer la demande | Les etapes de la carte staff progressent et le PJ reste non jouable avant validation. |
| Refuser, corriger puis renvoyer | Le motif est lisible, les donnees actives ne sont pas ecrasees et l'historique est conserve. |
| Valider la demande | Le personnage devient jouable et son proprietaire est notifie. |
| Ouvrir la fiche d'un autre joueur | Elle est consultable, sans boutons de modification. |
| Installer le personnage sur un deuxieme serveur | Le guide est clair, la demande part au staff de ce serveur et la continuite est bien separee si elle est choisie. |
| Supprimer l'installation du deuxieme serveur | Le premier serveur et ses donnees restent intacts. |

## 3. Relations, etats et rencontres

| Essai | Resultat attendu |
| --- | --- |
| Chercher un personnage pour une relation | Les resultats sont alphabetiques et l'autocompletion evite les longues listes. |
| Lier deux personnages de joueurs differents | Le proprietaire cible recoit une demande et peut accepter ou refuser. |
| Lier deux personnages du meme joueur | La relation est creee directement, sans demande inutile. |
| Ajouter un etat et une rencontre | Les actions restent bloquees tant que le personnage n'est pas valide sur ce serveur. |

## 4. Telephone

| Essai | Resultat attendu |
| --- | --- |
| Envoyer un SMS prive | Chaque autre proprietaire recoit une notification contenant le lien direct vers le salon. |
| Creer une conversation de groupe puis envoyer un MMS | Tous les participants concernes sont notifies ; l'image et sa legende apparaissent dans l'historique. |
| Lancer un appel, le laisser ouvert longtemps, puis le terminer | Il ne devient pas automatiquement manque et les deux interfaces restent synchronisees. |
| Fermer une interface personnelle | L'interface de l'autre joueur et la conversation ne sont pas supprimees. |

## 5. Tenues et biens

| Essai | Resultat attendu |
| --- | --- |
| Creer puis modifier une tenue | Titre, description et image restent propres au serveur courant. |
| Ajouter un bien avec image | Le bien est visible sur la continuite choisie. |
| Offrir un bien a un autre joueur | Le destinataire est notifie avec un lien vers le salon et l'historique garde les deux personnages. |
| Consulter le bien d'un autre joueur | Lecture seule ; aucune action de gestion ne lui est proposee. |

## Fin de seance

- Noter toute erreur avec l'heure, le serveur, l'action et une capture d'ecran.
- Verifier que le salon d'erreurs a recu les erreurs techniques eventuelles.
- Sauvegarder `data/greycore.sqlite` avant de modifier le bot ou de tester une migration.
- Ajouter un test automatise pour chaque anomalie reproduite puis corrigee.
