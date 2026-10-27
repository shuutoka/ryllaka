# Checklist organisateur — Ryllaka Halloween Giveaway 2026

## Éléments obligatoires à clarifier et à insérer dans les pages juridiques

- [ ] Identité réelle de l'organisateur/responsable du traitement et statut (personne physique, association ou professionnel).
- [ ] Moyen de contact effectif pour le concours et les demandes RGPD.
- [ ] Mentions d'hébergement et informations légales correspondant au statut de l'éditeur.
- [ ] Date du stream, heure et fuseau de début et fin du concours.
- [ ] Âge minimum, zone géographique précise, conditions de participation, éventuelles restrictions et nombre d'entrées par personne.
- [ ] Moyen exact d'inscription au tirage (commande dans le chat, inscription via bot, etc.).
- [ ] Règle sur la possibilité de gagner plusieurs lots, gestion des absents/participants non éligibles et modalités d'un nouveau tirage.
- [ ] Valeur indicative, nombre exact, ordre des trois lots, tailles réellement disponibles.
- [ ] Délai de réclamation et solution si un gagnant ne répond pas.
- [ ] Confirmation que tous les frais de fabrication/expédition et, si applicable, les taxes sont pris en charge ; confirmation Printful pour les destinations éligibles.
- [ ] Autorisation d'utiliser les visuels des créations sur les produits et le site.
- [ ] Vérification des règles de Twitch et des conditions de l'événement.
- [ ] Politique RGPD avec base juridique effective, garanties de transfert de données, prestataires, conservation et exercice des droits.
- [ ] Décision sur les limitations de participation selon le statut juridique de l'organisateur (consulter un professionnel si nécessaire).

## Sécurité et déroulement

- [ ] Domaine HTTPS opérationnel.
- [ ] Secret ADMIN_TOKEN complexe, non partagé et conservé hors du dépôt.
- [ ] Worker URL configurée dans `site/assets/config.js` ; CORS limité à `https://ryllaka.lotaku.fr`.
- [ ] Base D1 configurée, migrations exécutées, aucun secret dans GitHub.
- [ ] Vérification de l'accès administrateur et refus avec un secret erroné.
- [ ] Code invalide refusé ; code valide -> formulaire du bon produit ; code utilisé refusé.
- [ ] Taille T-shirt vérifiée et produits Printful correctement identifiés.
- [ ] Adresse en France et DROM vérifiée chez Printful selon le produit.
- [ ] Tirage au sort répété avec plusieurs pseudos ; « Retirer le gagnant » testé.
- [ ] Livraison test sans données personnelles réelles ; suppression des essais.
- [ ] Contrôle des conditions et tarifs réels d'hébergement GitHub/Cloudflare/Printful.

## Conformité et périmètre

La CNIL préconise une information accessible au moment de la collecte (identité, finalités, base juridique, destinataires, conservation et droits). La DGCCRF distingue loteries interdites et opérations promotionnelles autorisées sous conditions. Un jeu gratuit peut avoir des obligations supplémentaires selon le statut de l'organisateur et le déroulement. Les pages fournies ne constituent pas un avis juridique.

Sources officielles :
- <https://www.cnil.fr/fr/passer-laction/rgpd-les-premieres-etapes>
- <https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/loterie-des-pratiques-commerciales-reglementees>
- <https://www.legifrance.gouv.fr/codes/id/LEGISCTA000032227242/>

## Ajouts version 2 : variantes, codes multiples et envoi e-mail

- [ ] Confirmé : trois codes par produit = neuf cadeaux réels, ou bien codes de réserve (préciser clairement dans le règlement ; seuls les codes réellement attribués doivent être transmis).
- [ ] Vérifier dans Printful la disponibilité S à 5XL en Noir / Charbon / Bleu marine pour le T-shirt précis (une taille affichée sur le site ne garantit pas son stock).
- [ ] Vérifier les deux tapis : Nuit et Aurore, ainsi que leurs références Printful.
- [ ] Le fichier **privé** des neuf codes reste HORS de GitHub et de toute archive publique.
- [ ] Migration `0002_variants_email_and_multiple_codes.sql` exécutée en D1 sur un backup de test ou après sauvegarde.
- [ ] Vérification DNS du domaine expéditeur chez Resend terminée (SPF/DKIM).
- [ ] Secret `RESEND_API_KEY` défini uniquement dans le Worker.
- [ ] Réception d'un **e-mail réel** sur `postmaster@lotaku.fr` vérifiée (et non simple réponse 200 du prestataire).
- [ ] En cas d'échec, test du bouton « Renvoyer l'e-mail » de l'administration.
- [ ] E-mail gagnant obligatoire, téléphone facultatif, champ couleur visible seulement selon le lot.
- [ ] Informer les gagnants du prestataire d'envoi e-mail et de la boîte de destination.
- [ ] Prévoir aussi la suppression des courriels reçus et la durée de rétention côté fournisseur, en plus de la purge Cloudflare D1.
