# Referința de schelet pentru modulul celery: chain și group.
# Secțiunea „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_celery.py.

# === s-celery-canvas ===
from celery import Celery, chain, group

app = Celery("app")


@app.task
def fetch(url):
    return {"url": url, "n": len(url)}


@app.task
def parse(page):
    return page["n"]


@app.task
def store(n, url):
    # rezultatul anterior vine primul
    return (url, n)


def one(url):
    return chain(
        fetch.s(url),
        parse.s(),
        store.s(url),
    )


def many(urls):
    # lanțuri independente, în paralel
    return group(one(u) for u in urls)
# === end ===
