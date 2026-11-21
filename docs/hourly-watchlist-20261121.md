# Watchlist et collecte horaire · 21 novembre 2026

Point de restauration : publication 130, source `fc58c8589c582a0d6c6a4e69d3ee15a8ace6eff6`, et copie complète du classeur avant modification. Les publications et brouillons existants conservent leur statut.

## Catalogue

Le catalogue de l’article privé « Quel palier fait bouger le marché ? » et son Google Sheet comptent 406 ID distincts. Le site public en suivait 146, dont 106 appartiennent à ce catalogue. L’union conserve les 40 autres références et ajoute 300 objets : **446 ID**. Le panel de palier reste à 406 ; les 40 références conservées ne sont pas ajoutées artificiellement à ses décomptes par niveau. Version centrale : `AHL446-v6`.

`content/observatory/basket.json` reste la définition commune. Ses ID servent à l’Observatoire, aux états de tensions, aux sélecteurs des Rythmes et au bloc courant du bulletin. Les semaines closes conservent leur panel et leurs calculs. Le bloc courant est isolé par marché et sépare couverture des prix, fraîcheur et historique suffisant pour une tension. Les 300 ajouts ont une date d’entrée propre au site. Aucun signal n’est antidaté.

Les icônes sont dans la bibliothèque locale, avec provenance et SHA-256. Les noms et fiches d’objet existants sont réutilisés ; les fiches partielles signalent leurs limites. 70 noms espagnols et un nom français des ajouts restent dans la langue documentée de la source. Aucune statistique d’objet ni explication économique n’est inventée.

## Collectes

- GitHub : `.github/workflows/tensions.yml`, cron `7,22,37,52 * * * *`, UTC, sans agent de langage. Ces contrôles gardent un seul créneau de collecte par heure ; une reprise partielle reste possible. GitHub peut retarder un départ : vérifier le calcul enregistré plutôt que l’horaire prévu.
- Serveur : endpoint AHledger `tooltip/{market}?items=…`, 100 ID au maximum par requête, soit cinq appels pour 446 références. Le `observedAt` propre à chaque objet date l’observation ; la date globale d’une table ne s’y substitue jamais. La réponse doit contenir le même marché, des ID attendus et aucun doublon.
- 32 marchés Forever annoncés par AHledger, dont la Corée. Défaut Europe Normal Alliance, puis autres ID dans l’ordre. Les marchés sont traités séquentiellement, avec 20 secondes entre eux. Une absence de scan, notamment sur certains marchés, n’est pas une population d’offres nulle.
- Les données historiques nécessaires au détecteur viennent de l’archive existante, enrichie par 16 réponses `7d` par marché en rotation à chaque nouvelle collecte. Les lots fournissent les derniers scans. Chaque scan et agrégat reste daté et identifié séparément ; les corrections fournisseur ajoutent des versions sans effacer les précédentes. Les dates, épisodes, confirmations distinctes et anciens relevés restent conservés. La rotation évite de télécharger 446 historiques complets à chaque heure.
- Les délais de cache sont respectés. Une réponse 403/401 du fournisseur ou une limitation 429 arrête les autres lots de cette opération. Les erreurs restent enregistrées. Un scan qui régresse ne remplace pas la dernière observation valide. Un POST perdu exige une relecture avant une seule nouvelle tentative éventuelle.

Les fenêtres restent 6, 12, 24 et 48 heures. Les seuils provisoires (+15% et 5 cuivres, −25% et 10 unités, stock initial 20, prix médian 10 cuivres, couverture 75%) et la fraîcheur maximale de six heures sont conservés. La cadence horaire ne garantit ni un nouveau scan ni une confirmation.

## Classeur de recherche

Le même panier 446 est collecté pour `forever.normal.alliance.eu` uniquement. Les 40 références conservées du site entrent au relevé 80, sans prix rétroactif. Lignes du panier 7:452 ; réglages 456:482 ; dernières lignes de suivi 553:592. Les 79 dates prévues historiques ont été figées et comparées à la sauvegarde. Le relevé 80 reste prévu le 21 novembre à 03:00 Europe/Zurich ; les suivants sont horaires. Les dates des scans et de collecte restent en UTC.

La capacité du brut passe à 360000 lignes ; les formules du suivi utilisent la borne 360001. Le sélecteur graphique utilise des libellés nom+ID uniques pour éviter la confusion entre noms identiques. La tâche existante est réutilisée, sans doublon. Ses consignes demandent de consigner les bilans dans le classeur et de terminer sans message ni notification.

## Articles et données

Les trois versions de l’Observatoire décrivent la cadence et le nouveau panier. Les Rythmes réutilisent 446 ID et 70 890 points exacts archivés pour 402 objets Europe Normal Alliance, dont 1967 points supplémentaires vérifiés depuis le classeur. Les minima absents de cet extrait restent absents. Le comparatif lit désormais toutes les pages de 4000 observations de la période choisie, sans l’ancien plafond de 100000 lignes ; une page en échec est signalée comme source partielle. Les historiques individuels dépassent aussi l’ancien plafond de 8000 lignes. Les horizons et comparaisons manquant de couverture restent exploratoires.

Le bulletin ajoute une lecture courante de `/api/tensions` sous les filtres, avec recherche, dates source et calcul séparées, icônes et liens vers les deux autres outils. Ses éditions closes ne sont pas recalculées avec les offres actuelles.

## Limites et contrôles

La documentation annonce 300 appels par minute avant le 10 décembre 2026, puis 30 appels par minute sans clé. Le fonctionnement ordinaire reste espacé d’au moins 2,1 secondes ; la maintenance initiale respecte la limite en vigueur. Les lots rendent viable le parcours horaire de 32 marchés ; la collecte de l’unique marché du classeur reste bornée séparément. Le script historique de préparation du bulletin est limité à cinq requêtes simultanées et 2,1 secondes entre départs et ne demande plus `30 d` sans accès autorisé.

AHledger annonce une modification des droits de conservation à partir du 10 décembre 2026. Vérifier l’autorisation d’archivage avant cette échéance ; l’augmentation de cadence n’accorde aucun nouveau droit. Maintenir « Prices from AHledger » près des données. Sources : https://ahledger.com/developers.

Tests : union des ID, lots de 100 et cinq requêtes pour 446, données manquantes/zéros, isolation des marchés, régression temporelle, déduplication/épisodes, catalogue et médias locaux, toutes les périodes graphiques, bloc courant du bulletin et cohérence FR/EN/ES. Vérifier après publication les sauvegardes réelles de chaque marché et les nouveaux recensements, sans déduire un succès du seul cron.


## Vérification réelle après publication

Le 21 novembre 2026, la publication publique 132 est déployée. Exécution GitHub #55 (commit `9e3a1ffb46c7d3ddd1c804eb8aa5f216c0fb4af3`) du 21 novembre à 01:51–02:03 UTC : https://github.com/menoudbastien-bit/mana-mechanica-tensions-updater/actions/runs/44852571432.

- 32 marchés Forever tentés et 32 sauvegardes vérifiées ; 446 ID distincts dans chaque marché, soit 14 272 états. Aucune tentative inchangée, aucun échec HTTP/fournisseur, aucun marché ignoré.
- Relecture publique indépendante : les 32 marchés et `calculatedAt` correspondent au journal du script ; aucun mélange de marché ni ID supplémentaire.
- 5 606 couples marché–objet ont un prix récent ; 1 407 ont assez de données pour l'évaluation des tensions. Ces nombres mesurent des couvertures différentes. 4 782 observations sont absentes ; 22 marchés n'ont aucun objet admissible pour une tension. Les scans anciens et les quantités nulles réelles restent identifiables. Un calcul réussi ne crée pas une observation récente.
- Population : publication et relecture de huit recensements Classic Armory du 20 novembre 2026 à 23:47 UTC, avec classes, 51 niveaux et deux factions. Pour chacun, les trois sommes concordent avec l'effectif. Les 92 anciennes observations serveur sont conservées ; total public 100 après cet ajout. Les métiers, guildes et connexions non mesurés restent absents.
- 63 vérifications automatisées réussies. Contrôles publics FR/EN/ES, sept onglets Population, filtres du panier 406/446, nouveau cours et icône locale, quatre périodes des Rythmes, curseur et largeur utile 454 px ; changement EU/KR du bulletin sans substitution de marché. Les semaines clôturées restent inchangées.
- Classeur : panier 446, intervalle 1 h, sélecteur nom+ID, calendrier historique préservé et premier nouveau passage 80 à 03:00 Europe/Zurich vérifiés. L'exécution du passage 80 n'est pas déduite de son seul état « Planifié ».

## Rattrapage et corrections vérifiables · 21 novembre 2026

Le collecteur conserve un créneau UTC par heure et par marché. Le contrôle GitHub passe aux minutes 07, 22, 37 et 52. Un créneau déjà enregistré sans erreur est relu sans nouveau POST ni nouvelle requête de prix. Un passage partiel est repris. Ces vérifications réduisent les trous dus aux retards GitHub, sans garantir une heure de départ à la seconde.

Chaque collecte récupère aussi 16 historiques `7d`, en rotation sur les 446 ID de chaque marché. Le contrôle conserve séparément la date de tentative et la date de réussite par ID, afin qu'un objet indisponible ne bloque pas la rotation. Un rattrapage de maintenance parcourt des pages de 40 ID au plus via les paramètres bornés `historyOffset` et `historyLimit` du writer existant. Le serveur récupère lui-même la réponse AHledger et refuse les identités de marché, objet ou fenêtre incohérentes. Aucun prix fourni par un appelant n'est accepté.

Les historiques horaires sont enregistrés comme `kind=hour`. Le champ `latest.observedAt` de la réponse reste un scan exact, `kind=scan`. Un agrégat plus récent ne remplace pas le dernier scan exact et ne crée pas de confirmation indépendante. Le site expose le dernier agrégat, son origine et le décalage éventuel entre les deux sorties du fournisseur. Les graphiques lisent les points récupérés dans leur marché propre.

Une correction fournisseur à une date identique reçoit une nouvelle clé versionnée par empreinte SHA-256 des valeurs. Les réponses précédentes restent archivées. La lecture choisit la version récupérée la plus récemment pour le même objet, marché, type et instant. Les types scan et heure restent distincts, y compris au même instant. Si le fournisseur revient à une valeur déjà archivée après une correction, la première réception reste intacte et une métadonnée de dernière réception réactive cette version ; la répétition de la version courante reste sans effet. Les absences restent absentes ; un vrai stock nul reste zéro.

Les lots de prix réessaient une fois sur une erreur 5xx lorsque le délai Retry-After le permet. Les refus 401/403 et limitations 429 conservent leur statut et leur délai de reprise. Le bilan distingue sauvegarde des 32 marchés, erreurs de source, historiques récupérés, points ajoutés et données fraîches. `complete=true` exige aussi l'absence d'erreur source et de rattrapage.

Les anciennes lignes RAW du tableur restent des observations datées de leur réception effective. Un historique récupéré plus tard est une nouvelle entrée de l'archive du site, avec date source, date de récupération, URL et granularité. Il ne transforme aucun passage Manqué en collecte exécutée. Les éditions hebdomadaires closes conservent leurs panels et résultats datés.

Les consultations anonymes sont espacées de 2,1 secondes en fonctionnement ordinaire. Le rattrapage initial avant le 10 décembre utilise au plus cinq requêtes simultanées et des départs espacés d'au moins 250 ms, sous la limite annoncée de 300 requêtes/minute. Le traitement respecte les délais de cache et les refus du fournisseur. La conservation après le 10 décembre nécessite l'accord adapté décrit dans les conditions AHledger ; une clé gratuite ne remplace pas cet accord.

Contrôles requis avant clôture : tests de persistance SQLite et de versions corrigées, séparation scan/agrégat, marché/ID/fenêtre, quantités nulles et absentes, reprise idempotente, décompte des erreurs, conservation des épisodes et lecture publique des archives après publication. Consigner les ID effectivement vérifiés et les échecs restants du rattrapage réel.

Les textes de cadence de l’Observatoire et des tensions sont relus en FR/EN/ES : créneau horaire, contrôles aux minutes 07/22/37/52, retards GitHub visibles, agrégats distingués des scans. Les 75 fiches d’usage documentées restent séparées des 371 objets dont le contexte n’est pas encore étayé ; aucune hypothèse n’est inventée pour combler cet écart.
