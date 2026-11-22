# Protocole de recensement des populations — API Blizzard

Version du 22 novembre 2026 — Mana Mechanica — article public `forever-population-cross-analysis`.

## Source retenue et état réel

Blizzard Battle.net est la source directe retenue. L’accès aux profils de personnages connus et aux listes de membres de guildes permet de construire un échantillon ; il ne fournit pas de recensement exhaustif ni de nombre de joueurs connectés. **Échantillon direct : en attente de qualification (`pending_validation`). Aucun nouveau comptage direct n’est revendiqué.** Le fonctionnement de la collecte Blizzard des hôtels des ventes ne valide pas la couverture des personnages.

WoWStats, Classic Armory et aotc sont retirés des futures collectes et publications à la demande du propriétaire. Leurs données proviennent de profils Blizzard mais les échantillons ne sont pas nécessairement identiques. Ne plus utiliser ces intermédiaires comme confirmations indépendantes ; ne plus exécuter leur lecture organique de secours. Conserver les archives, chiffres, dates, URL et attributions existantes. Ne jamais les rebaptiser « Blizzard direct ».

Ce protocole remplace les anciennes procédures de collecte tierce et de publication Classic Armory. Leur historique demeure dans Git. Le code du site réside dans le projet Sites appgprj_6adf82cdbe1081919f3e44ce1525cd98, pas dans ce dépôt de protocole.

## Une seule tâche de population

La tâche quotidienne existante à 02:00 Europe/Zurich reste la seule planification de population. Aucun nouveau cron, workflow, rattrapage ni tâche à 02:03. Les workflows de prix et leur cadence restent indépendants.

Lire `GET /api/population/history` : `sourcePolicy` décrit la transition et `targets` est la liste autorisée. Après retrait des sources tierces, cette liste est vide tant qu’aucun collecteur direct n’est validé. Dans cet état, contrôler la lisibilité et la conservation des archives ; rapporter « aucune collecte, échantillon direct à valider ». Ne pas compter ce contrôle comme une collecte réussie.

Les anciennes cibles et le service d’écriture Classic Armory répondent `source_retired` (HTTP410) avant une collecte ou écriture. Les lecteurs d’archives restent disponibles.

## Qualification de l’accès direct

1. Réutiliser l’application Blizzard déjà autorisée. Vérifier l’accès aux profils et guild rosters Forever sur les hôtes régionaux et namespaces `profile-forever-{region}`. Les routes rapportées sont `/profile/wow/character/{first}-{surname}` et `/data/wow/guild/{guildSlug}/roster`. Ce sont des observations de développeurs à vérifier avec notre application, pas une garantie de stabilité officielle.
2. Constituer et documenter un registre de personnages et guildes connus, avec l’origine de chaque entrée. L’API rapportée ne propose pas d’index exhaustif de personnages ; ne pas inventer de couverture ni sonder des listes de noms devinés. Les personnages hors des guildes suivies restent une limite de sélection.
3. Vérifier la région et le ruleset réellement fournis ; conserver KR et TW séparés. Garder le périmètre de l’article : personnages de niveau 10 à 60. Les listes de guildes peuvent inclure des niveaux plus bas ; ne pas les mélanger au dénominateur 10–60.
4. Dédupliquer par région et identifiant stable de personnage Blizzard entre guildes, profils et tous les autres chemins. Le ruleset est un attribut à vérifier, pas un motif pour compter deux fois un personnage transféré. Garder une seule observation courante par personnage.
5. Pour chaque indicateur, conserver le nombre de profils éligibles, le nombre de réponses exploitables et les champs manquants. Contrôler identifiants, types, niveaux, sommes des classes/niveaux/factions et arrondis. Un profil inaccessible n’est ni un personnage absent du jeu ni une observation zéro.
6. Distinguer date de modification du profil et date de consultation. Un nouveau téléchargement ne rajeunit pas le profil. Une modification ou déconnexion ne démontre pas une connexion le jour du recensement. Ne pas remplacer une date inconnue par l’heure du script.
7. Avant activation, vérifier les conditions Blizzard applicables à la conservation des profils bruts et aux agrégats, puis valider le stockage et la relecture. Les règles de conservation des prix ne s’appliquent pas automatiquement aux profils. Seules des observations réellement persistées peuvent être annoncées.
8. Activer ensuite un collecteur et un ingest hébergés bornés, avec leurs cibles autorisées, en réutilisant la tâche quotidienne. Aucun collecteur direct de population n’est activé par la simple rédaction de ce protocole.

## Accès, erreurs et confidentialité

Les secrets restent côté serveur et en mémoire. Ne jamais les afficher, archiver, committer, passer en arguments ou inclure dans des captures publiques. Ne jamais envoyer le jeton Sites à Blizzard ni le jeton Blizzard aux anciens recensements.

Le mécanisme de service Sites reste documenté dans `scripts/refresh-population.mjs` et `docs/population-daily.md`. Il reçoit `{projectId,ownerToken}` par stdin protégé et dérive SHA256 UTF-8 de `mana-mechanica:population:v1:` + projectId + `:` + ownerToken. Les en-têtes Authorization et OAI-Sites-Authorization vont exclusivement à https://mana-mechanica.com, sans redirection de secrets. Lire get_site pour l’accès courant sans afficher sa valeur.

| Réponse | Traitement |
| --- | --- |
| status:success et relecture concordante | Succès persisté seulement après vérification. |
| HTTP200 avec status:error | Échec. |
| unchanged:true / already_claimed | Déjà traité ; aucune nouvelle collecte. |
| Site HTTP401/403 ou source401/403 | Arrêt immédiat ; signaler sans contournement ni changement de permissions. |
| HTTP429 | Respecter Retry-After et suspendre la source ; aucun recours de contournement au navigateur. |
| HTTP404 de profil | Profil indisponible ; vérifier prudemment nom, région, niveau et confidentialité, sans conclure à la disparition du personnage. |
| HTTP410 source_retired | Source abandonnée ; aucune relance. |
| Format, somme ou date incohérents | Rejet ; conserver le relevé précédent et sa date. |
| Réponse perdue | Relire avant toute relance susceptible de doubler une écriture. |

Un réglage Battle.net de partage avec les sites communautaires peut rendre un profil indisponible tout en laissant apparaître le personnage dans l’armurerie ou une guilde. Ne pas modifier les préférences d’un joueur ni chercher une route pour contourner son choix.

## Publication et interprétation

La publication automatique des nouvelles observations directes vérifiées est autorisée, sans demande répétée au propriétaire. Le chemin direct de population devra être validé avant toute publication numérique. La page décrit actuellement la source et ses limites en FR, EN et ES ; elle marque les tiers comme archives et les exclut des comparaisons actuelles.

Chaque publication indique ce qui a changé : teneur/couverture de l’échantillon, date et fraîcheur, ou correction d’exactitude établie avec justification. Une différence de chiffres ne prouve pas une amélioration d’exactitude. Présenter « personnages observés via l’API Blizzard », pas « population totale » ni « joueurs uniques/connectés ».

Les moyennes entre sources exigent au moins deux observations originales, fraîches (48 heures au plus), de même indicateur et périmètre. Copies, transports différents et réutilisations de profils Blizzard ne deviennent pas des confirmations indépendantes. Sinon afficher la valeur disponible, sa source et sa date. Les statistiques internes d’un échantillon restent explicitement distinctes d’une moyenne entre sites. Aucune somme de recensements qui se chevauchent.

Préserver les archives et leurs anciennes conclusions datées. Ne pas fabriquer de série rétrospective ni fusionner les anciens échantillons avec le futur corpus direct. Après une écriture autorisée, relire la sauvegarde et l’article FR/EN/ES ; vérifier dates, chiffres, région, ruleset et attribution.

## Bilan d’exécution

Rapporter brièvement : état du collecteur direct, cibles autorisées et tentées, nouvelles observations persistées, inchangés, indisponibilités, erreurs et cibles non traitées, préservation des archives et publication effectivement réalisée. Une liste de cibles vide en phase de qualification n’est pas une collecte réussie.

## Références et portée des preuves

- [Portail développeurs Blizzard](https://develop.battle.net/) : fournisseur de l’API.
- [Tests Forever de leur auteur](https://mhuijskens.com/WoWForever/Api/) : observations datées du 5 novembre 2026, à revalider.
- [Discussion technique Forever](https://us.forums.blizzard.com/en/blizzard/t/wow-forever-api-what-works-so-far-plus-a-ts-client/60334) : retour de développeur, pas documentation garantie par Blizzard.
- [Diagnostic de confidentialité résolu le 21 novembre](https://us.forums.blizzard.com/en/blizzard/t/wow-forever-api-character-profile-returns-http-404/60709).

Revue documentaire le 22 novembre 2026 ; aucune validation de recensement direct n’est présumée à partir de ces lectures.


## Consultation et export de toutes les archives · 22 novembre 2026

L'exclusion de sources tierces de la synthèse actuelle ne doit pas cacher leurs données historiques. Les sept onglets Population FR/EN/ES gardent un explorateur région/mode/source/jour ; il présente les enregistrements initiaux, embarqués, serveur et les rapports synthétiques. L'export conserve `{baseline,history}` complet, sans réduction aux derniers enregistrements.120 observations serveur étaient présentes au diagnostic ;48 consultations réutilisent le même scan WoWStats, elles ne deviennent pas des échantillons indépendants. Les rapports sans distributions restent des résumés : aucun histogramme n'est reconstruit. Garder séparées date source, consultation et collecte. Voir [le protocole de conservation](history-preservation-20261122.md).
