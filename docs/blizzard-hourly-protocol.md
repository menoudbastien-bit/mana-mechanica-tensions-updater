# Surveillance horaire Blizzard — Mana Mechanica

## Périmètre et rupture de source

La collecte courante utilise les annonces de l’API Blizzard Forever, sans reprendre les prix AHledger sous une nouvelle attribution. Le panier est découvert dans le catalogue publié : AHL446-v6, 446 ID lors de la migration du 22 novembre 2026. Les noms éditoriaux, cohortes, panels clos et dates d’entrée restent conservés.

Le registre lib/blizzard/markets.mjs contient 54 périmètres explicites : 36 maisons candidates interrogeables (EU12, US12, KR6, TW6), dont 12 Blackwater, et 18 périmètres indisponibles. Ces derniers comprennent la Chine (client régional distinct requis) et les anciens périmètres RP/RP-PvP coréens non exposés. Les anciennes données AHledger « kr » regroupaient aussi Taïwan ; les nouvelles séries KR et TW sont indépendantes. Aucun prix d’une autre région ne remplace un marché indisponible.

L’identité physique est fournisseur + région + ID de maison. La règle 2 de l’URL est une règle technique de requête ; elle ne prouve pas l’identité Normal du flux. Les correspondances publiées par le producteur https://auctionhouse.tk.gg/data/ restent attribuées extérieurement et, pour plusieurs groupes, inférées. Le site affiche cette incertitude. Les maisons sont collectées une fois, même si plusieurs index de règles répètent les mêmes liens. Blackwater reste séparé d’Alliance et Horde ; ses commissions ne sont pas assimilées automatiquement à celles des maisons de faction.

## Exécution et cadence

Le runner Node scripts/blizzard/update-watchlist.mjs lit les accès par stdin masqué. GitHub Actions utilise son secret applicatif existant MM_TENSIONS_APPLICATION_TOKEN ; les secrets BLIZZARD_CLIENT_ID et BLIZZARD_CLIENT_SECRET restent exclusivement dans Sites. Le broker /api/blizzard/access ne délivre le jeton éphémère qu’au writer authentifié, avec no-store. Le jeton est conservé en mémoire et n’apparaît ni dans les arguments, fichiers, rapports, logs ou code client.

Compatibilité d’hébergement : le broker Cloudflare utilise redirect=manual et rejette explicitement tous les statuts 3xx, sans suivre Location ni transmettre le Basic vers une autre destination. Workers ne prend pas en charge redirect=error ; le premier contrôle réel a exposé cette incompatibilité, corrigée avant activation du nouveau workflow. Les requêtes du runner Node peuvent conserver redirect=error. Référence : https://developers.cloudflare.com/workers/runtime-apis/request/.

Les opérateurs Forever rapportent un snapshot environ chaque heure, sans garantie officielle de minute fixe. Le contrôleur vérifie les passages planifiés toutes les cinq minutes ; il n’interroge Blizzard que pour les maisons arrivées à échéance. L’échéance suit la dernière date source + une heure + une minute, avec au moins cinq minutes entre vérifications et quinze minutes lorsque la source est ancienne de plus de deux heures. Le premier passage sans donnée est immédiatement éligible. Le planificateur peut être retardé par GitHub ; ne pas annoncer une heure d’exécution garantie.

Les vérifications conditionnelles utilisent ETag/If-None-Match si disponible, sinon Last-Modified/If-Modified-Since. Cache-Control et Retry-After restent enregistrés et respectés. max-age=86400 est une durée de cache, pas une interdiction de vérifier avant 24 heures ni la fréquence de génération. Une revalidation peut recevoir une réponse inchangée d’un intermédiaire. Aucun paramètre aléatoire n’est ajouté pour contourner un cache.

Un 304 réutilise les valeurs réellement enregistrées du même flux ; sans cache reconstructible, il est rejeté. Un conflit entre les deux flux ne peut pas être reconstruit depuis le panier fusionné : le runner demande alors deux documents 200 complets. Un 200 inchangé n’est pas un scan indépendant. Les corrections à date source égale sont versionnées sans ajouter de confirmation temporelle.

## Unités, contrôles et stockage

Le runner traite une maison et un flux à la fois pour ne pas charger les gros tableaux dans les 128 Mo du Worker. Il lit annonces et commodities, vérifie hôte régional, namespace, schéma, identité du document, maison, dates lisibles et absence de régression ou futur supérieur à cinq minutes. Les tableaux auctions facultatifs d’une maison vide ne sont acceptés qu’après validation de son identité.

Commodities : unit_price est déjà un prix unitaire. Enchères ordinaires : buyout avec quantity=1 est chiffrable ; un buyout multi-unité reste non chiffré tant que sa définition Forever n’est pas confirmée. Les offres sans buyout ne sont pas des prix nuls. Les quantités fournies, inconnues et nulles sont distinctes. Un objet absent n’est pas transformé en stock 0. Les variantes d’un même ID sont comptées ; les doublons d’annonces identiques sont dédupliqués et les contradictions sont rejetées.

Minimum, médiane pondérée par les unités et moyenne pondérée sont calculés sur les seules unités chiffrables. La médiane peut valoir un demi-cuivre et la moyenne une fraction de cuivre. Quantité totale proposée et quantité effectivement chiffrée restent distinctes. Une présence ambiguë dans les deux flux est indiquée indisponible, jamais additionnée à l’aveugle. Chaque objet conserve la date source de son flux ; deux flux de dates différentes ne deviennent pas artificiellement un snapshot commun.

Le writer /api/blizzard/ingest reçoit exactement un enregistrement par ID du panier, avec valeurs manquantes explicites. Il valide tout le lot avant écriture, conserve empreintes, métadonnées de flux, état de collecte et versions. Les nouvelles tables blizzard_* sont isolées des anciennes tension_* AHledger. Les lignes de prix, snapshots et journaux Blizzard expirent selon une fenêtre de 30 jours ; les anciennes archives AHledger ne sont ni supprimées ni transformées. Les erreurs techniques sont enregistrées sans écraser la dernière observation réussie.

Les lecteurs publics utilisent /api/observatory et les archives locales. source=ahledger sélectionne explicitement l’historique AHledger en lecture seule. Les calculs de variation et graphiques ne traversent pas une rupture de fournisseur. Aucun relevé antérieur manqué n’est inventé. Les snapshots sont des annonces et quantités proposées, pas des ventes prouvées. Les estimations de ventes AHledger ne sont pas réutilisées comme ventes Blizzard.

Le calcul spécialisé Sombrelune de profondeur de carnet TK reste une couche tierce distincte et créditée ; un minimum ou une médiane Blizzard ne remplace pas le coût réel d’achat de plusieurs unités. Les articles distinguent ce cas, les anciens historiques et les nouvelles observations.

## Vérification et publication

Après déploiement, lancer le writer par son accès prévu, puis relire chaque marché : fournisseur, région/maison, 446 ID distincts du panier courant, dates source/récupération, valeurs manquantes, répétitions et conservation des données précédentes. Les nouvelles lignes ne sont annoncées qu’après lecture persistée. Les totaux de disponibilité doivent être mesurés, jamais déduits de la taille du panier.

Les pages Observatoire, Rythmes, bloc courant du bulletin, Faveurs marchandes, ateliers couture et outils Sombrelune utilisent les lecteurs adaptés. Les copies courantes FR/EN/ES précisent la méthode et la rupture de source. Les éditions closes gardent leurs sources et conclusions datées. La mise à jour CMS conserve une sauvegarde de la ligne précédente, le statut public/privé et tout brouillon distinct, avec contrôle de révision concurrente.

Tests : tests/blizzard-collector.mjs, blizzard-listing-metrics.mjs, blizzard-store.mjs, blizzard-access.mjs, blizzard-editorial.mjs et tests des lecteurs et interfaces concernés. Un passage ordinaire écrit les données sans reconstruire ou republier le site.

Sources : https://auctionhouse.tk.gg/data/ ; https://blizzard.pinta.land/forever/auctions/ ; https://blizzard.pinta.land/forever/basics/ ; https://www.rfc-editor.org/rfc/rfc9111.html ; conditions API Blizzard. La cadence de chaque maison doit rester mesurée dans notre propre journal ; les observations de tiers ne sont pas une garantie de service.


## Bascule vérifiée le 22 novembre 2026

La première collecte directe a été écrite puis relue sur 36 maisons physiques candidates, dans quatre régions : EU 12, US 12, KR 6 et TW 6. Le panier reste AHL446-v6, 446 ID uniques par maison. À 17:44 UTC, 13 252 prix étaient disponibles sur 16 056 paires marché/objet ; 2 804 absences restent explicites. Les 12 maisons neutres Blackwater ont 3 244 prix sur 5 352 paires ; Normal EU neutre : 423/446, Normal EU Alliance : 442/446. Dix-huit portées restent indisponibles, dont la Chine ; aucun marché de remplacement n’est employé. Les étiquettes de règles de jeu gardent leur niveau de preuve externe ou déduit.

Le workflow GitHub du commit 934fd354379cf4b4bb39c6a40b3c75fcf3301dc1 a réussi (run 45050953052, 21 tests, 36 maisons déjà fraîches relues comme non échues). Un contrôle conditionnel réel de Normal EU Alliance a ensuite obtenu deux HTTP 304 : 442 prix préservés, zéro nouveau snapshot et zéro scan nouveau. La collecte manuelle initiale avait confirmé l’écriture puis la lecture des 36 maisons. GitHub Actions peut retarder le lancement ; la proximité de la mise à jour fournisseur est une cible mesurée, pas un délai garanti.

L’ancienne tâche horaire Google Sheets AHledger est suspendue ; le classeur et les anciennes tables restent des archives séparées. Le bulletin hebdomadaire privé conserve sa cadence et ses conditions de publication, avec consignes adaptées à Blizzard. Les articles concernés ont été adaptés en FR/EN/ES, sans publier de brouillons privés : 21 variantes publiées relues, plus neuf variantes restant privées/absentes du CMS. La révision de suivi de Merchant Favors a été relue dans les trois langues, sans ancien paragraphe contradictoire ni note dupliquée.

Le relevé de validation détaillé est dans [blizzard-migration-validation-20261122.json](blizzard-migration-validation-20261122.json). Il contient uniquement des métadonnées de contrôle, pas les prix ou annonces brutes, ni des identifiants secrets.
