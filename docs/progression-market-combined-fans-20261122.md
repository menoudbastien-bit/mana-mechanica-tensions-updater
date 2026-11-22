# Éventails et historique agrégé · 22 novembre 2026

Demande explicite : agréger les données précédemment récupérées auprès d’AHledger pour les projections de `forever-market-progression`. Point de restauration public : version 152, commit `5ed4b56f4972b9e21f84ce5a11376629e89d15e7`. Aucun historique brut n’est supprimé ou renommé.

## Construction

Les observations restent identifiées par marché, objet, fournisseur, type et heure source. Le lecteur conserve tous les relevés et les affiche avec leur provenance. Le modèle choisit un fournisseur par journée locale fiable : au moins deux heures source distinctes, dernière observation la plus récente et Blizzard en cas d’égalité. Les prix de fournisseurs différents ne sont pas moyennés. Les données absentes, futures ou connues seulement après la journée historique ne sont pas utilisées dans cette calibration.

Les erreurs rétrospectives sont calculées par fournisseur : origine, ajustement et prix à l’horizon appartiennent à la même source. Le changement de fournisseur ne produit donc aucun rendement artificiel. Un éventail exige huit journées fiables au minimum, six erreurs historiques admissibles pour l’horizon et six pour chaque étape intermédiaire. Les origines peuvent se recouvrir : elles ne constituent pas des essais indépendants ni une probabilité de réussite.

Le scénario agrégé part de la médiane quotidienne de la source courante. Quand cette source n’a pas quatre journées fiables, le centre reste constant ; l’éventail applique les écarts relatifs historiques mesurés au sein des sources. Avec assez de recul courant, une dérive robuste peut être retenue si son erreur historique est inférieure de 10 % à celle du centre constant. Les bornes reprennent les déciles empiriques des erreurs ; aucune probabilité de couverture n’est garantie.

Cette transposition suppose une continuité du marché malgré la migration. Elle est présentée comme un **scénario de continuité avec historique agrégé**, pas comme une prévision Blizzard validée seule. Le point de départ, sa source, la période de calibration et ses fournisseurs sont affichés dans les trois langues et dans les tableaux. Les courbes AHledger et Blizzard restent distinctes ; leurs stocks ne sont pas additionnés.

Dès que la source courante possède six erreurs rétrospectives pour toutes les étapes, le modèle préfère sa calibration propre. Les archives AHledger restent visibles et exportables. Un scénario agrégé ne suffit pas à qualifier un signal haussier étayé. Les analyses de population, mesures de ventes, comparaisons de stock et mécanismes de tensions sont inchangés.

## Vérification

`tests/progression-market-combined-fan.mjs` contrôle : reprise des deux horizons à partir de l’historique, point de départ récent, exclusion d’un saut artificiel de niveau entre fournisseurs, absence de double comptage, dates futures ou tardivement connues, minimum de validations, retour à la calibration courante quand elle suffit et cas réel Rosecap. Les tests de recherche originaux et d’intégrité des archives restent applicables. Les ressources locales conservent leurs empreintes. La collecte horaire et les règles de rétention ne changent pas.
