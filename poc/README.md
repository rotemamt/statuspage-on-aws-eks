# Status-Page PoC — run the whole infra locally

Goal: see every component actually running and understand what each does.
This is a demo, not production (hardcoded passwords, no TLS, no nginx).

## Run it

From this folder:

```
docker compose up --build
```

First run builds the image (clones the app, installs deps) - a few minutes.
`init` runs migrations + creates the admin user, then exits. That is expected.

Open: http://localhost:8001/dashboard/  — login `admin` / `adminadmin`.

## What to look at (answer these for the mentor)

1. The processes. In another terminal:
   ```
   docker compose ps
   ```
   You should see: db, redis, web, worker, scheduler. Match each to a systemd
   unit from the install guide. Which one serves the page? Which does background work?

2. Redis two DBs. Poke it directly:
   ```
   docker compose exec redis redis-cli
   ```
   then inside: `SELECT 1` then `KEYS *` (the cache), and `SELECT 0` then `KEYS *`
   (the task queue). Watch DB0 while you trigger work.

3. The queue in action. In the UI create an incident/component. Watch the worker:
   ```
   docker compose logs -f worker
   ```
   See a job get picked up and run.

4. The scheduler. Watch what it enqueues over time:
   ```
   docker compose logs -f scheduler
   ```

5. Failure modes (this is what the mentor grades). Kill one process and observe:
   ```
   docker compose stop worker      # site still loads? background jobs stop?
   docker compose stop web         # site down? data safe?
   ```
   Bring them back with `docker compose start web worker`.

## Stop / clean

```
docker compose down          # stop
docker compose down -v        # stop + wipe the database volume
```

## Notes / things that may need a nudge

- Static files: gunicorn does not serve CSS by itself, so the dashboard may look
  unstyled. That is fine for seeing the processes. To view it styled, temporarily
  change the `web` command to:
  `python manage.py runserver 0.0.0.0:8001 --insecure`
- If `createsuperuser` failed (custom user model needs extra fields), create one
  manually: `docker compose run --rm web python manage.py createsuperuser`
