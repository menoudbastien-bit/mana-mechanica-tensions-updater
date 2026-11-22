# Nettoyage des commandes et contrôle des échecs · 22 novembre 2026

Les courriels GitHub contrôlés concernent le workflow de prix « Update Mana Mechanica tensions », pas une tâche de population.

- [Exécution du 19 novembre](https://github.com/menoudbastien-bit/mana-mechanica-tensions-updater/actions/runs/44432753658) : 24 marchés vérifiés sur 32, huit échecs, notamment HTTP400 sur les anciens marchés KR RP/RP-PvP.
- [Ancienne exécution du 22 novembre](https://github.com/menoudbastien-bit/mana-mechanica-tensions-updater/actions/runs/45049109385) : appels à l’ancien writer `/api/tensions/refresh`, réponses HTTP410 après son retrait ; échec réel du job.
- [Nouveau collecteur Blizzard, 22 novembre à 18:25 UTC](https://github.com/menoudbastien-bit/mana-mechanica-tensions-updater/actions/runs/45054942368) : succès, douze maisons dues et vérifiées, zéro échec ; les autres maisons ne sont pas toutes dues à ce passage.

Le workflow actuel utilise déjà le nouveau runner. Son calendrier et ses validations restent conservés. Le carnet Sombrelune est un second workflow distinct et utile. Aucun workflow Population n’est présent.

Nettoyage : suppression de l’ancien runner AHledger, de son client et du test devenu sans appelant ; README et protocole Population simplifiés. Les diagnostics de migration et les audits datés sont conservés. Les anciens codes restent dans Git ; aucune donnée, archive ou édition n’est effacée.

Les erreurs ne sont pas converties artificiellement en succès et les notifications globales ne sont pas désactivées. Une exécution réussie observée ne garantit pas l’absence de tout futur incident ; les futures alertes doivent être reliées à leur exécution précise.
