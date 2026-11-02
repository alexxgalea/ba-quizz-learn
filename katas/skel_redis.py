# Referințele de schelet pentru modulul redis.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_redis.py.

# === s-redis-cache ===
import json


def get_user(r, uid, load, ttl=60):
    key = f"user:{uid}"
    raw = r.get(key)
    if raw is not None:      # nil = lipsă
        return json.loads(raw)
    user = load(uid)         # miss: sursa
    # valoare + TTL, într-o comandă
    r.set(key, json.dumps(user), ex=ttl)
    return user


def save_user(r, uid, user, save):
    save(uid, user)          # întâi sursa
    # apoi invalidează cheia
    r.delete(f"user:{uid}")
# === end ===

# === s-redis-lock ===
import uuid

# șterge doar dacă lock-ul e încă al meu
RELEASE = """
if redis.call("get", KEYS[1]) == ARGV[1]
then return redis.call("del", KEYS[1])
end
return 0
"""


def acquire(r, name, ttl_ms=5000):
    token = uuid.uuid4().hex
    # o comandă: atomic, cu TTL
    ok = r.set(
        name, token, nx=True, px=ttl_ms)
    return token if ok else None


def release(r, name, token):
    out = r.eval(RELEASE, 1, name, token)
    return bool(out)
# === end ===

# === s-redis-ratelimit ===
import time


def allow(r, user, limit=5, window=60):
    slot = int(time.time()) // window
    key = f"rl:{user}:{slot}"
    pipe = r.pipeline()      # MULTI/EXEC
    pipe.incr(key)           # atomic
    pipe.expire(key, window)
    count, _ = pipe.execute()
    # defect: până la 2x limita la graniță
    return count <= limit
# === end ===
