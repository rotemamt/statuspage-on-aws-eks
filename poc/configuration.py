import os

ALLOWED_HOSTS = ['*']

DATABASE = {
    'NAME': os.environ['DB_NAME'],
    'USER': os.environ['DB_USER'],
    'PASSWORD': os.environ['DB_PASSWORD'],
    'HOST': os.environ['DB_HOST'],
    'PORT': os.environ.get('DB_PORT', ''),
    'CONN_MAX_AGE': 300,
}

REDIS = {
    'tasks': {
        'HOST': os.environ['REDIS_HOST'],
        'PORT': 6379,
        'PASSWORD': '',
        'DATABASE': 0,
        'SSL': True,
    },
    'caching': {
        'HOST': os.environ['REDIS_HOST'],
        'PORT': 6379,
        'PASSWORD': '',
        'DATABASE': 1,
        'SSL': True,
    },
}

SECRET_KEY = os.environ['SECRET_KEY']