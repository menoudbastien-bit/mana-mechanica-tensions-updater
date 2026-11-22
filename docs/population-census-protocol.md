# Population — sources et mise à jour

Règle actuelle du 22 novembre 2026 pour l’article public `forever-population-cross-analysis`.

## Conserver les apports utiles

| Fournisseur | Usage conservé |
| --- | --- |
| Blizzard | Source directe prioritaire pour les indicateurs effectivement collectés et validés. Le recensement direct reste à qualifier ; le collecteur de prix ne le remplace pas. |
| Classic Armory | Archives datées et distributions classes/niveaux/factions non couvertes par un relevé direct frais. |
| WoWStats | Archives et métiers manquants dans la couverture directe ; ne lire que la page Métiers pour cette collecte complémentaire. |
| aotc | Archives, historiques et activité documentée. Aucun nouvel indicateur n’est déclaré collecté sans extracteur et date source vérifiés. |

Une origine Blizzard commune ne prouve pas des échantillons identiques. Elle ne crée pas non plus plusieurs confirmations indépendantes. Garder chaque source, région, mode, unité, dénominateur et date séparés.

Dans la synthèse actuelle, choisir un fournisseur par indicateur et marché : Blizzard direct frais d’abord, puis le complément utile. Ne pas recalculer une moyenne à partir de copies ou de données qui se recouvrent. Les autres relevés restent consultables dans l’historique.

## Une exécution quotidienne, ciblée

La tâche Population existante reste à **02:00 Europe/Zurich**. Il n’existe pas de workflow GitHub Population et il ne faut en ajouter aucun. Les deux workflows GitHub actifs concernent les prix Blizzard et le carnet Sombrelune, pas les populations.

1. Lire `GET https://mana-mechanica.com/api/population/history`. N’utiliser que ses cibles autorisées et les indicateurs réellement manquants.
2. Vérifier dates source et couverture avant d’appeler un complément. Ignorer WoWStats si son instantané n’a pas changé ou reste ancien. Ne pas lancer aveuglément toutes les cibles et ne pas répéter un relevé identique pour chacun des onglets.
3. Utiliser le script Sites `scripts/refresh-population.mjs` avec JSON stdin protégé `{projectId,ownerToken,targets?}`. La liste optionnelle doit être un sous-ensemble sans doublons des cibles autorisées. Le collecteur WoWStats ne demande que les métiers ; le collecteur aotc classes/factions redondant n’est pas sélectionné.
4. Inspecter chaque réponse avant le POST suivant. `status:error` est un échec même avec HTTP200 ; `unchanged` et `already_claimed` ne sont pas de nouvelles collectes. Sur HTTP401/403 du Site ou de la source, arrêter les rafraîchissements. Respecter HTTP429 et Retry-After ; aucun contournement.
5. Si Classic Armory est nécessaire et refuse le collecteur avec 403, faire une seule lecture ordinaire de l’interface autorisée dans la même exécution : à 02:03 si le refus est antérieur, immédiatement sinon. Si l’interface bloque aussi, arrêter. Ne créer aucune tâche de secours séparée.
6. Publier les seuls relevés vérifiés par le service existant. Le service Classic Armory exige les huit marchés et contrôle les détails réellement fournis ; garder ses validations, son authentification, son refus des contradictions et sa relecture. Ne pas inventer de distributions manquantes.
7. Relire les archives et l’article public : chiffres, dates, attribution et séparation région/mode. Les anciennes observations doivent rester intactes, y compris celles qui sont exclues de la synthèse actuelle.

L’accès de service courant provient de `get_site`. Les dérivations et en-têtes sont implémentés dans le script et documentés dans `docs/population-daily.md` du projet Sites `appgprj_6adf82cdbe1081919f3e44ce1525cd98`. Aucun secret dans GitHub, les arguments, les sorties, les captures ou les fichiers. Les jetons Sites vont exclusivement à mana-mechanica.com ; les accès Blizzard restent côté serveur.

## Qualité et publication

La publication automatique des données vérifiées reste autorisée. Distinguer date source, consultation et archivage. Pour les comparaisons actuelles, fraîcheur maximale 48 heures ; une consultation récente ne rajeunit pas l’instantané. Une date inconnue reste inconnue, une donnée manquante reste absente, et un échec ne remplace pas le dernier relevé valide.

Les moyennes entre sources exigent au moins deux observations originales, fraîches et compatibles ; une copie ne compte pas comme deuxième observation. Sinon afficher les valeurs disponibles avec leur provenance. Une statistique interne fournie par un échantillon est distincte d’une moyenne entre sites. Ne jamais additionner les recensements qui se chevauchent.

À chaque mise à jour, préciser le changement de teneur/couverture, de fraîcheur ou la correction d’exactitude réellement établie. Les personnages recensés ne sont ni des comptes uniques ni des connexions simultanées. Préserver les versions FR/EN/ES et toutes les archives.

Le bilan distingue : nouvelles observations persistées, inchangés, données anciennes ou indisponibles, erreurs, cibles non traitées et publication réellement vérifiée. Aucun succès déduit du seul calendrier.

## Nettoyage des commandes GitHub

L’ancien exécutable AHledger `scripts/observatory/update-tensions.mjs`, son client et son test associé sont retirés de ce dépôt. Leur historique reste dans Git ; aucune donnée n’est supprimée. Le workflow de prix utilise déjà `scripts/blizzard/update-watchlist.mjs --stdin`. Les vrais échecs restent visibles ; ne pas masquer les erreurs ou désactiver les notifications globales pour faire disparaître un diagnostic.

Voir [le contrôle des anciens échecs](automation-cleanup-20261122.md) et [la collecte de prix actuelle](blizzard-hourly-protocol.md).

## Consultation et export de toutes les archives · 22 novembre 2026

L'exclusion de sources tierces de la synthèse actuelle ne doit pas cacher leurs données historiques. Les sept onglets Population FR/EN/ES gardent un explorateur région/mode/source/jour ; il présente les enregistrements initiaux, embarqués, serveur et les rapports synthétiques. L'export conserve `{baseline,history}` complet, sans réduction aux derniers enregistrements.120 observations serveur étaient présentes au diagnostic ;48 consultations réutilisent le même scan WoWStats, elles ne deviennent pas des échantillons indépendants. Les rapports sans distributions restent des résumés : aucun histogramme n'est reconstruit. Garder séparées date source, consultation et collecte. Voir [le protocole de conservation](history-preservation-20261122.md).

