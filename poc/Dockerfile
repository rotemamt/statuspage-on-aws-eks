# PoC image for Status-Page v2.5.1 — builds the app from source so the 3 processes can run.
FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1

# System packages the install guide requires (Ubuntu list, adapted for slim).
RUN apt-get update && apt-get install -y --no-install-recommends \
        git build-essential \
        libxml2-dev libxslt1-dev libffi-dev libpq-dev libssl-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Pin the exact version (upstream is archived — never track a moving branch).
RUN git clone --depth 1 --branch v2.5.1 \
        https://github.com/Status-Page/Status-Page.git /opt/status-page

# Patch upstream settings.py: add WhiteNoise middleware + static storage backend.
RUN sed -i "s/'django.middleware.security.SecurityMiddleware',/'django.middleware.security.SecurityMiddleware',\n    'whitenoise.middleware.WhiteNoiseMiddleware',/" /opt/status-page/statuspage/statuspage/settings.py
RUN sed -i "s#STATIC_URL = f'/{BASE_PATH}static/'#STATIC_URL = f'/{BASE_PATH}static/'\nSTATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'#" /opt/status-page/statuspage/statuspage/settings.py

WORKDIR /opt/status-page
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir --upgrade whitenoise "Django==5.1.14" "pillow==12.1.1" "pymdown-extensions==11.0.1" "wheel==0.46.2" "jaraco.context==6.1.0"

# Drop in the PoC configuration.
COPY configuration.py /opt/status-page/statuspage/statuspage/configuration.py

# manage.py lives here.
WORKDIR /opt/status-page/statuspage

EXPOSE 8001

# Default process = web. worker/scheduler override this via K8s command/args.
CMD ["gunicorn", "--chdir", "/opt/status-page/statuspage", "--bind", "0.0.0.0:8001", "statuspage.wsgi"]