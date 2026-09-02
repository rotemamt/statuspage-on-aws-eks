# PoC configuration for Status-Page — LOCAL DEMO ONLY, not production.
# Only the 4 required params from the install guide (ALLOWED_HOSTS, DATABASE, REDIS, SECRET_KEY).

ALLOWED_HOSTS = ['*']

DATABASE = {
    'NAME': 'statuspage',
    'USER': 'statuspage',
    'PASSWORD': 'statuspage',
    'HOST': 'db',          # the compose service name
    'PORT': '',
    'CONN_MAX_AGE': 300,
}

REDIS = {
    'tasks': {
        'HOST': 'redis',   # the compose service name
        'PORT': 6379,
        'PASSWORD': '',
        'DATABASE': 0,     # queue
        'SSL': False,
    },
    'caching': {
        'HOST': 'redis',
        'PORT': 6379,
        'PASSWORD': '',
        'DATABASE': 1,     # cache
        'SSL': False,
    },
}

# PoC key only — 50+ chars. Never reuse a hardcoded key in real environments.
SECRET_KEY = 'poc-only-do-not-use-in-prod-0123456789abcdefghijklmnop'
