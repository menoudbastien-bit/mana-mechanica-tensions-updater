# Protocole de mise à jour des recensements de population

Version du 20 novembre 2026 — Mana Mechanica.

## Objet et portée

Actualiser les observations de population de WoW Forever et documenter leur qualité pour l'article `forever-population-cross-analysis`. Mesurer des personnages recensés, pas des joueurs uniques ou simultanés.

Ce dépôt GitHub conserve le protocole. Le collecteur et les archives résident dans le projet Sites Mana Mechanica ; les références d'implémentation y sont `scripts/refresh-population.mjs` et `docs/population-daily.md`. Ces fichiers ne se trouvent pas dans ce dépôt GitHub.

La tâche quotidienne existante reste la seule planification de population, à 02:00 Europe/Zurich. Ne créer aucun second cron, workflow planifié ou rattrapage automatique. Le workflow GitHub des tensions de marché est indépendant et n'est pas modifié par ce protocole. Un protocole documenté n'est pas une nouvelle automatisation active.

L’article de population est public. Le propriétaire autorise la publication automatique des nouvelles données vérifiées dans cet article, sans demande de validation à chaque exécution. Utiliser les services hébergés de mise à jour et de publication. Préserver les archives privées et les contenus éditoriaux existants. Les collectes quotidiennes ne nécessitent aucun redéploiement du site. Ce dépôt étant public, n'y déposer ni archives privées, ni résultats détaillés privés, ni identifiants de connexion, ni captures d'administration.

## 1. Vérifier et valider avant d'exécuter

1. Relire les instructions de la tâche, la documentation et le script actuels du projet Sites. Vérifier les changements depuis la dernière exécution.
2. Identifier les sources autorisées, la version du jeu, la région, le ruleset, les bornes de niveau, les factions et les classes. Conserver chaque combinaison séparément.
3. Ne pas fixer le nombre de cibles à une valeur historique : obtenir la liste autorisée par `GET /api/population/history`. Un sous-ensemble explicitement demandé filtre cette liste sans inventer de cible ; par exemple une opération WoWStats/Armory exclut aotc.
4. Vérifier que le chemin d'exécution inspecte immédiatement chaque réponse, y compris son statut applicatif. Ne pas lancer aveuglément un ancien script qui ne s'arrêterait que sur le code HTTP.

Le script `scripts/refresh-population.mjs` du projet Sites inspecte les statuts applicatifs et arrête les POST de collecte sur HTTP401/403 du Site ainsi que source_http_401/403 dans un JSON HTTP200. Il distingue les réponses inchangées et les échantillons vides des nouvelles collectes. Vérifier la version du script avant de l’exécuter.

## 2. Collecter par le mécanisme hébergé

- Obtenir l'accès de service courant par `get_site` pour le projet désigné dans la configuration autorisée.
- Dériver en mémoire SHA256 UTF-8 de `mana-mechanica:population:v1:` + `project_id` + `:` + `siwc_bypass_bearer_token`.
- Envoyer uniquement à `https://mana-mechanica.com` : `Authorization: Bearer <valeur dérivée>` et `OAI-Sites-Authorization: Bearer <token Sites>`. Ne jamais transmettre ces en-têtes aux sites sources ni suivre une redirection qui les transmettrait ailleurs.
- Ne jamais afficher, archiver, committer ou passer ces secrets en arguments. Le script de référence reçoit le JSON stdin `{projectId,ownerToken}` par un canal protégé, sans journalisation. Ne pas copier le token propriétaire dans les secrets de ce dépôt pour installer une seconde collecte.
- Lire l'historique initial pour disposer d'un état de comparaison privé.
- Pour chaque cible retenue, appeler une fois `POST /api/population/refresh?target=<cible encodée>`, puis lire et classer la réponse avant tout autre POST.
- Réutiliser les validations, la déduplication et les temporisations du collecteur hébergé. Ne jamais modifier manuellement les tables ou les fichiers d'archives.

## 3. Classer les résultats et arrêter correctement

| Résultat | Traitement |
| --- | --- |
| HTTP autorisé, JSON `status:success` | Succès provisoire ; ne le déclarer persisté qu'après relecture des archives. |
| HTTP 200, JSON `status:error` | Échec ; conserver le code et une cause expurgée des secrets. |
| HTTP 401/403 du Site | Arrêter immédiatement tous les rafraîchissements. Ne pas tenter la relecture privée avec cet accès refusé. Signaler « accès Site bloqué ». |
| `source_http_401` / `source_http_403`, même avec HTTP 200 | Arrêter immédiatement tous les rafraîchissements. Lire les archives seulement si le Site reste autorisé. Déclencher la vérification organique de la source ci-dessous. |
| HTTP 429 / `source_rate_limited` | Respecter le délai indiqué et la suspension de la source prévue par le collecteur. Ne pas poursuivre ses cibles ni déplacer la collecte vers un navigateur pour contourner la limite. |
| `empty_sample` | Données indisponibles pour cette sélection. Conserver le code d’erreur pour la traçabilité, sans observation de population zéro ni remplacement du dernier relevé valide. |
| Format invalide ou nombres incohérents | Échec de validation. Examiner les données source et conserver le dernier relevé valide. |
| Timeout, réponse perdue ou illisible | Résultat indéterminé jusqu'à relecture ; ne pas relancer aveuglément un POST susceptible d'avoir été enregistré. |
| Statut inconnu, cible déjà traitée ou collecte ignorée | Rapporter séparément ; ce n'est pas un nouveau succès de collecte. |

Un 403 établit un refus d'accès pour la requête concernée, pas sa cause précise. Ne pas affirmer « anti-bot », « site en panne » ou « données absentes » sans preuve explicite.

## 4. Vérification « organique » obligatoire en cas de problème

« Organique » signifie lire normalement l'interface publique du site dans un navigateur : ouvrir sa page, choisir les filtres visibles et lire les chiffres affichés comme le ferait un visiteur. Cela ne signifie pas masquer l'automatisation ni contourner les protections.

Si Classic Armory renvoie un 403, y compris `source_http_403` dans une réponse HTTP 200, noter l’heure du refus. Dans la même exécution quotidienne, lire l’interface à **02 h 03 (Europe/Zurich)** si le refus a été constaté avant cette heure. À partir de 02 h 03, ouvrir l’interface **immédiatement après le constat du 403**. Noter l’heure du refus, l’heure prévue et l’heure effective de lecture. Si le contrôle est impossible, indiquer la raison et l’étape atteinte. Après l’arrêt de la collecte, suivre les étapes ci-dessous.

1. Vérifier la page publique pertinente de la source, si une visite ordinaire est autorisée. Pour Classic Armory, partir de [Forever Census](https://classicarmory.gg/forever/census). Pour les autres sources, utiliser la page documentée et vérifier qu'elle concerne bien WoW Forever.
2. Sélectionner explicitement la date, la région, le ruleset, les classes, factions et bornes de niveau correspondant à la cible. Attendre que le contenu affiché corresponde effectivement aux filtres ; ne pas relever les anciens chiffres pendant le chargement.
3. Noter la date/heure de consultation et son fuseau, la date/heure de photographie fournie par la source (ou « non indiquée »), l'URL publique, les filtres, l'unité, les dénominateurs et les limites annoncées.
4. Relever uniquement les données visibles et vérifiables : effectif, factions, classes, niveaux, activité ou guildes selon les indicateurs disponibles. Conserver la précision affichée. Un pourcentage arrondi ne permet pas de reconstruire un effectif exact.
5. Contrôler les seuils : une carte « niveau 30 ou plus » ne doit pas être interprétée comme « niveau 40 ou plus ». Une région indisponible n'a pas une population nulle.
6. Consigner l'un des résultats : interface accessible avec données pertinentes ; interface accessible mais donnée absente/non comparable ; interface bloquée ; vérification non effectuée faute de navigateur autorisé.
7. Si l'interface présente elle-même un refus d'accès, une protection anti-bot ou un CAPTCHA, arrêter la vérification automatique et signaler le besoin d'intervention. Ne pas changer d'IP/proxy, falsifier le client, sonder des API alternatives, contourner le cache, modifier des permissions ou utiliser les secrets du Site sur la source.

L'accès à l'interface peut fonctionner alors que le collecteur est refusé. Ce constat ne rétablit pas l'accès serveur et ne transforme pas son échec en succès. Si le contexte d'exécution ne permet pas une lecture de l'interface, inscrire « vérification organique à effectuer » dans le bilan ; ne jamais prétendre l'avoir faite.

## 5. Traiter le relevé manuel sans altérer les archives

- La publication automatique est autorisée par le propriétaire depuis le 19 novembre 2026, sans nouvelle validation. Utiliser le service dédié de Mana Mechanica et le script `scripts/publish-classic-armory-report.mjs` du projet Sites. Il ajoute un relevé structuré de Classic Armory à l’article public de population en FR, EN et ES. Vérifier les huit combinaisons région/mode, la date et le total avant l’envoi, puis relire l’article public après confirmation de la persistance. Le service déduplique par date d’instantané et refuse les divergences. La tâche quotidienne publie désormais les relevés vérifiés avec ce service.
- Conserver séparément la provenance `manual_ui` dans une note de recherche privée, avec les métadonnées ci-dessus. Ne pas ajouter ce relevé aux tables automatiques ni fabriquer un point de courbe.
- Comparer seulement des indicateurs de même définition et de même périmètre. Expliquer les décalages de dates et de couverture.
- Ne pas additionner les effectifs de sources susceptibles de recenser les mêmes personnages ; ne pas moyenner des médianes régionales.
- Distinguer personnages, comptes, activité sur sept jours et connexions simultanées. Une hausse du nombre recensé peut résulter d'un élargissement de l'échantillon.
- Les classes et niveaux peuvent suggérer des besoins économiques ; ils ne prouvent ni les métiers, ni la demande, ni les ventes, ni la rentabilité.
- Une collecte échouée ne change ni les chiffres ni les dates des observations précédentes.

## 6. Contrôler la persistance

Si l'accès au Site reste autorisé, relire `GET /api/population/history` après la boucle ou son arrêt.

Pour chaque succès annoncé, retrouver la tentative correspondante et l'observation attendue avec la même source, région et ruleset. Tenir compte d'une déduplication documentée : le nombre total d'observations ne doit pas forcément augmenter à chaque appel.

Comparer l'état initial et final : les anciennes observations restent présentes et inchangées ; les cibles échouées conservent leur dernier relevé valide et sa date. Vérifier les effectifs, champs obligatoires, cohérence des totaux et dates sans inventer de données manquantes. Une simple hausse du compteur global n'est pas une preuve suffisante.

Si une vérification manque ou échoue, indiquer « persistance non vérifiée » ou « anomalie d'archive », selon les faits. Ne pas annoncer une réussite complète et ne pas tenter de réparation manuelle.

## 7. Répercussion éditoriale et règles nouvelles

À chaque nouvelle règle : vérifier sa compatibilité, valider son périmètre, puis appliquer la modification aux protocoles concernés. Examiner ses conséquences sur l'article de population et les analyses économiques qui le citent.

Lorsqu'une mise à jour éditoriale est autorisée, relire l'article actuel et ses versions FR/EN/ES ; corriger uniquement les passages concernés, préserver son statut de publication et ses archives. Présenter un relevé d'interface comme un complément daté, séparé des séries automatiques. Vérifier que tableaux, graphiques, légendes, dates et sources restent cohérents. Ne pas annoncer de traduction ou de correction non réalisée.

L’accès de service couvre uniquement des relevés chiffrés de Classic Armory pour cet article. Les changements éditoriaux généraux continuent de passer par le CMS du propriétaire. Si le service dédié ne répond pas ou si les données sont incomplètes, conserver le relevé vérifié et indiquer son statut dans le bilan.

## 8. Bilan minimal de chaque exécution

Rapporter en français, sans secret ni données privées dans les logs publics :

- cibles sélectionnées ; succès persistés ; échecs ; cibles non traitées/ignorées ;
- causes établies par source, et incertitudes restantes ;
- résultat de la vérification organique, avec date et périmètre ;
- contrôle des archives : vérifié, partiel, non effectué ou anomalie ;
- mise à jour éditoriale effectivement enregistrée, seulement préparée ou bloquée.

Conserver le détail des résultats dans l'espace privé autorisé. Ne jamais annoncer qu'une lecture manuelle constitue une collecte automatique réussie.

## Fraîcheur et cohérence des données actuelles · 20 novembre 2026

Les comparaisons actuelles utilisent uniquement les observations ayant une date source vérifiable de moins de 48 heures (48 heures incluses). La date de consultation ne renouvelle pas l’instantané source. Pour les données WoWStats réunissant plusieurs pages, la date la plus ancienne contrôle l’éligibilité. Les données anciennes, futures ou sans date source vérifiable restent consultables dans Sources & relevés et dans les archives, et sont exclues des tableaux et graphiques actuels.

La validation intersources préalable à la publication compare des marchés, indicateurs et périmètres compatibles sur des données récentes. Les écarts sont jugés selon l’historique comparable et la précision des échantillons. Si un comparatif récent manque ou si les écarts restent inexpliqués, indiquer que le contrôle est incomplet et conserver la dernière publication. L’autorisation du propriétaire dispense d’approbation manuelle lorsque les conditions sont remplies. Le service de publication exige les huit marchés validés pour un instantané complet.

Le bilan distingue nouvelles observations archivées, collectes réussies, cibles déjà traitées (unchanged:true ou already_claimed), données indisponibles, autres erreurs et cibles non traitées. Un résultat déjà traité n’est jamais compté comme une nouvelle collecte. Les observations anciennes ne deviennent pas récentes à chaque archivage quotidien.
