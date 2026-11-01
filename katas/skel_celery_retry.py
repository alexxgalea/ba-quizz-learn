# Referința de schelet pentru modulul celery: task cu retry.
# Secțiunea „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_celery.py.

# === s-celery-retry ===
from celery import Celery

app = Celery("app")
SENT = set()  # în prod.: Redis / DB


def deliver(to, body):
    ...  # apel de rețea, poate pica


@app.task(
    autoretry_for=(ConnectionError,),
    max_retries=5,
    retry_backoff=True,  # 1, 2, 4, 8 s
    retry_backoff_max=60,
    retry_jitter=True,
    acks_late=True,
)
def send_mail(key, to, body):
    if key in SENT:  # a mai rulat
        return "skipped"
    deliver(to, body)
    SENT.add(key)  # marcăm după efect
    return "sent"
# === end ===
