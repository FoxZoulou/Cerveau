# Second cerveau

Le deuxième cerveau partagé du foyer : tâches et corvées récurrentes, listes de courses, capture rapide, agenda, procédures (« comment nettoyer la machine à café »), documents de référence — organisés par domaines de vie et synchronisés entre tous les membres, sur mobile comme sur ordinateur.

## Fonctionnalités

- **Capture rapide** (bouton +) : un champ, un type, et le texte est compris — « poubelles chaque mardi 19h », « dentiste samedi 10h », « !! urgent ».
- **Aujourd'hui** : en retard / aujourd'hui / cette semaine, vue « pour moi » ou « tout le foyer ».
- **Inbox** : tout ce qui n'est pas encore classé ; on trie plus tard (domaine, projet, type).
- **Listes** cochables réutilisables (courses, valise…), ajout de plusieurs articles d'un coup.
- **Agenda** hebdomadaire : événements + tâches datées.
- **Procédures** : étapes pas à pas avec mode « exécution », liables à une tâche récurrente.
- **Documents** : champs libellé/valeur (secrets masqués, copie en un tap) + pièces jointes.
- **Domaines de vie** et **projets** pour tout regrouper.
- **Multi-utilisateurs** : comptes, foyer, invitation par lien ou code, temps réel (SSE).
- **PWA** installable, thème clair/sombre, **notifications push** de rappel.

## Déploiement (Docker)

```bash
cp .env.example .env        # renseignez ORIGIN (URL publique), APP_NAME, TZ, PORT
mkdir -p data && sudo chown 1000:1000 data   # le conteneur tourne en utilisateur non-root (uid 1000)
docker compose up -d --build
```

L'app écoute sur le port `PORT` du `.env` (3000 par défaut). Les données (`data/app.db`, `data/uploads/`, `data/vapid.json`) sont dans `./data` : **sauvegardez ce dossier**.

### Déploiement en place sur ce VPS

- Conteneur lié à `127.0.0.1:3010` (voir `compose.yml`) ; c'est nginx qui expose l'app en HTTPS.
- Vhost `/etc/nginx/sites-available/cerveau.foxzoulou.fr` : certificat d'origine Cloudflare `*.foxzoulou.fr`, IP réelle restaurée via `snippets/cloudflare-realip.conf`, puis **`allow <ip>; deny all;`** — ajoutez une ligne `allow` par IP autorisée et `sudo nginx -t && sudo systemctl reload nginx`.
- DNS : enregistrement `cerveau` (CNAME vers `foxzoulou.fr`, proxy Cloudflare activé) dans la zone Cloudflare.
- Si vous voulez ré-exposer un port Docker directement en le limitant à une IP, la règle va dans la chaîne `DOCKER-USER` (les ports publiés contournent `INPUT`) : `iptables -I DOCKER-USER -i ens3 -p tcp -m conntrack --ctorigdstport 3010 --ctdir ORIGINAL ! -s <ip> -j DROP`.

Les notifications push et l'installation PWA exigent **HTTPS** (sauf `localhost`). Placez un reverse proxy devant (Caddy, Traefik, Nginx Proxy Manager…) et mettez l'URL publique dans `ORIGIN`. Exemple Caddy :

```
cerveau.exemple.fr {
    reverse_proxy app:3000
}
```

Le premier compte créé fonde le foyer ; il invite les autres depuis **Plus → Foyer**.

## Développement

Avec Node 22 installé :

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # svelte-check
```

Sans Node (tout dans Docker) :

```bash
docker compose -f compose.dev.yml up
```

Après modification de `src/lib/server/db/schema.ts` : `npm run db:generate` (les migrations de `drizzle/` s'appliquent automatiquement au démarrage).

## Structure

```
src/lib/server/db/schema.ts   modèle (items unifiés + détails par type)
src/lib/server/items.ts       logique métier (création, complétion, récurrence, listes…)
src/lib/server/scheduler.ts   rappels push (cron chaque minute)
src/lib/quick-parse.ts        analyse du texte de capture (« demain 18h », « chaque lundi »)
src/routes/(app)/             écrans protégés : Aujourd'hui, Inbox, Listes, Agenda, Plus, items/[id]…
src/routes/(auth)/            connexion, inscription, invitation, onboarding
```
