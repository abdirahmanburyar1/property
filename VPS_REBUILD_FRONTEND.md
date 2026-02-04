# Rebuild frontend on VPS (Docker)

When you update the frontend code (e.g. create property page), the VPS still runs the **old image** until you rebuild and restart.

Run these on the **VPS** (where Docker runs), from the project root (e.g. `/home/cloud-user/property`):

## 1. Get latest code

```bash
git pull origin master
```

(Or however you sync: if you push to the VPS bare repo, run `git pull` in the working copy that Docker uses.)

## 2. Rebuild the frontend image (no cache)

Docker reuses cached layers; to pick up new source you must rebuild without cache:

```bash
docker compose -f docker-compose.prod.yml build --no-cache frontend
```

## 3. Restart the frontend container

```bash
docker compose -f docker-compose.prod.yml up -d frontend
```

## One-liner

From project root on VPS:

```bash
git pull origin master && docker compose -f docker-compose.prod.yml build --no-cache frontend && docker compose -f docker-compose.prod.yml up -d frontend
```

After this, the production site will serve the new create property page (no coordinates, no region/city on create).
