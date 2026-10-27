# Ryllaka Halloween V3 — GitHub Pages + Formspree

## Installation sans Node.js

1. Crée un dépôt GitHub (public ou privé selon ton compte). Dépose **le contenu de ce dossier** à la racine du dépôt (index.html, reclamer.html, assets/, etc.).
2. Dans GitHub : Settings → Pages → Build and deployment → Source : Deploy from a branch → Branch : main / (root) → Save.
3. Dans Settings → Pages → Custom domain, saisis `ryllaka.lotaku.fr`. Chez OVH, crée un CNAME `ryllaka` vers `TON-PSEUDO.github.io` (remplace par ton vrai identifiant). Active HTTPS quand le certificat est prêt. Le fichier CNAME est déjà inclus.
4. Crée un compte sur https://formspree.io, crée un formulaire et configure le destinataire `postmaster@lotaku.fr`. Valide l'adresse destinataire selon les étapes demandées par Formspree.
5. Copie l'URL du formulaire `https://formspree.io/f/xxxxxxxx` dans `assets/formspree-config.js` à la place de `https://formspree.io/f/REMPLACER`, puis publie le fichier modifié sur GitHub.
6. Envoie un test avec de FAUSSES coordonnées depuis la page `reclamer.html`. Vérifie la réception et la disponibilité du message dans Formspree avant l'événement.
7. Termine les champs **À COMPLÉTER** des mentions légales, du règlement et de la confidentialité, notamment l'identité du responsable, dates et modalités, conservation et prestataires. Vérifie les tailles/couleurs réellement disponibles chez Printful.

## Sécurité et limites

- **Ne mets JAMAIS les vrais codes gagnants dans le dépôt**, ni dans du JavaScript. Garde-les dans ton fichier privé existant, et compare-les manuellement aux références reçues par Formspree et aux messages privés des gagnants.
- Il n'y a **pas de vérification automatique ni d'usage unique** : le formulaire n'est qu'une demande de réclamation. Seule ta vérification manuelle décide de la validité.
- Le formulaire envoie les coordonnées au prestataire Formspree ; elles ne sont pas enregistrées dans GitHub Pages. L'e-mail de notification ne remplace pas le tableau de bord Formspree.
- Ne publie pas la page ou le formulaire avant d'avoir terminé les informations RGPD. Les données d'adresse sont personnelles.
- La roue tourne localement dans le navigateur, et les pseudos sont sauvegardés localement sur l'appareil de l'organisateur. N'ouvre pas la roue avec une liste de participants sur un PC partagé.
- Le site ne passe aucune commande et ne facture rien.

## Test

Ouvre `index.html` localement pour visualiser le site ; le formulaire Formspree doit être configuré et servi en HTTPS pour un test complet.
