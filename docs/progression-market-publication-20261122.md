# Article public sur les paliers · 22 novembre 2026

Article Mana Mechanica : https://mana-mechanica.com/?lang=fr&page=forever-market-progression (FR/EN/ES). L’original Refonte version 20 reste intact. Les 406 ID du catalogue font déjà partie du panier courant de 446 ID ; aucune nouvelle tâche ni modification des secrets ou des droits.

Le lecteur /api/progression-market?resource=history&market=<id> relit les observations enregistrées par la collecte Blizzard horaire et les archives AHledger. Il ne collecte ni n’écrit. L’article conserve les 5 727 lignes du classeur, les 32 archives de marchés, les recensements et les preuves historiques ; la source publique en conserve les empreintes. Un export par objet garde les dates, sources, prix, stocks et absences.

L’identité d’un point comprend marché, objet, fournisseur, type et heure source. Pas de double confirmation pour une relecture ; aucune addition de stocks ni moyenne entre fournisseurs. Chaque comparaison de créneaux, projection et suivi utilise un seul fournisseur. Les anciennes estimations de débit AHledger ne sont pas transformées en ventes Blizzard. La rétention Blizzard de 30 jours reste applicable ; les archives AHledger sont séparées.

Les comparaisons originales utilisent des fenêtres de 72 h et les mêmes créneaux locaux de trois heures à J−7 ou J−3 (au moins trois créneaux sur deux dates par objet). Les projections 72 h/7 j demandent le recul et la validation chronologique prévus dans le code. En début de série Blizzard, afficher l’insuffisance de recul ; une date antérieure permet de consulter les analyses historiques. Aucun scénario ne prouve une vente ou un profit.

Les recensements originaux sont enrichis par /api/population/history, sans fusion de populations recouvrantes. Une distribution partielle reste partielle. Aucun recensement Blizzard n’est annoncé sans échantillon validé ; les prix de l’AH ne mesurent pas les niveaux. Les jours connus, dates source et dates de récupération sont distincts.

Tests du dépôt Site : progression-market-live.mjs (empreintes, fusion, marchés, nulls et zéros, rupture de fournisseur, recensements), progression-market-research.mjs (méthode originale), progression-market-publication.mjs (D1, langues, sauvegardes, idempotence et brouillons), cms.mjs et codex-navigation.mjs. Le déploiement du lecteur n’altère ni le calendrier horaire ni les anciennes tables. Les passages ordinaires restent silencieux.


## Correctif de visibilité des archives

Une série Blizzard encore courte ne doit pas rendre invisible la comparaison importée. Le lecteur garde les variations courantes strictes et, lorsqu’elles sont absentes, présente un panneau historique séparé calculé seulement sur les fichiers repris de la refonte, à leur date propre. Pour EU Normal Alliance : référence 20 novembre 2026 14:16:44.980 UTC, 29 805 points pour 396 objets des paliers, 97 objets aux prix comparables et 73 aux débits estimés comparables. Les 6 objets hors paliers restent dans le catalogue. Les autres marchés et dates utilisent leurs propres archives, sans substitution.

La fiche d’objet et sa courbe sont directement visibles, avec choix parmi les 406 références, dernier prix, stock, heure source, fournisseur et export. Le dernier relevé reste séparé de la comparaison historique ; aucune variation ou projection ne traverse les fournisseurs. Les trois langues décrivent cette distinction. Tests progression-market-live.mjs : cas de bascule Blizzard, résultats historiques préservés, absence de données futures ou de réattribution. Aucune modification du workflow, de la fréquence, des droits ou des notifications.


Les ressources locales du catalogue et du classeur sont des copies intégrales des originaux. La comparaison importée se charge indépendamment des lectures plus lentes de l’historique courant et des sources complémentaires. Un statut indique l’attente des observations récentes ; une erreur ultérieure ne retire pas les archives déjà affichées. Les réponses tardives d’un ancien marché ou filtre sont ignorées. Cette amélioration d’affichage n’ajoute aucune collecte ni notification.


## Éventails et historique agrégé · demande du 22 novembre 2026

L’article réutilise l’historique AHledger et les observations Blizzard pour un scénario de continuité autour de la médiane quotidienne récente. Une journée d’entraînement utilise un seul fournisseur et deux dates source distinctes au minimum. Chaque erreur rétrospective, son ajustement et sa cible restent dans un même fournisseur ; le changement de source n’est jamais traité comme un rendement. Six validations sont requises pour l’horizon et pour chaque étape. En début de série courante, le centre reste constant, avec les écarts historiques. Le modèle préfère la calibration propre de la source courante dès qu’elle suffit. Les légendes, tableaux et notes FR/EN/ES montrent les deux provenances, le point de départ et la période de calibration. Les archives brutes et les graphiques conservent leurs dates ; aucune collecte, fréquence, notification ou rétention n’est changée. Le scénario agrégé n’est pas une prévision Blizzard validée seule et ne suffit pas à qualifier un signal haussier étayé. Voir [le protocole des éventails agrégés](progression-market-combined-fans-20261122.md).
