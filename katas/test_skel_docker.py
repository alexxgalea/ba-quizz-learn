# Verificarea structurală a referințelor de schelet pentru modulul docker (Dockerfile și compose).
# Nu rulează containere (sandbox-ul n-are daemon): parsează fișierele și aplică regulile din punctele esențiale.
# Verificatorul își are propriile teste: variantele stricate trebuie respinse, altfel verificarea n-ar apăra nimic.
import json
import pathlib
import re
import shutil
import subprocess

import pytest

yaml = pytest.importorskip("yaml")

HERE = pathlib.Path(__file__).resolve().parent


def section(fname, sid):
    """Textul dintre marcajele „=== sid ===” și „=== end ===”: exact ce vede Alex în aplicație."""
    src = (HERE / fname).read_text(encoding="utf8")
    m = re.search(r"^# === %s ===\n(.*?)^# === end ===" % re.escape(sid), src, re.S | re.M)
    assert m, "lipsește secțiunea %s din %s" % (sid, fname)
    return m.group(1)


# ---------- Dockerfile ----------
def instructions(text):
    """[(INSTRUCȚIUNE, argumente)]: continuările cu `\\` unite, comentariile sărite."""
    out, buf = [], ""
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("#") or (not line and not buf):
            continue
        if line.endswith("\\"):
            buf += line[:-1] + " "
            continue
        buf += line
        name, _, args = buf.partition(" ")
        out.append((name.upper(), args.strip()))
        buf = ""
    return out


def stages(ins):
    """Etapele: [{'name', 'image', 'ins'}], după fiecare FROM."""
    out = []
    for name, args in ins:
        if name == "FROM":
            m = re.match(r"(\S+)(?:\s+AS\s+(\S+))?$", args, re.I)
            out.append({"image": m.group(1), "name": m.group(2), "ins": []})
        elif out:
            out[-1]["ins"].append((name, args))
    return out


def dockerfile_problems(text):
    ins = instructions(text)
    problems = []
    st = stages(ins)
    if not [i for i in ins if i[0] != "ARG"] or [i for i in ins if i[0] != "ARG"][0][0] != "FROM":
        problems.append("trebuie să înceapă cu FROM")
    if len(st) < 2:
        problems.append("nu e multi-stage (cel puțin două FROM)")
    names = [s["name"] for s in st]
    if any(n is None for n in names):
        problems.append("etapă fără nume (FROM … AS nume)")
    if len({n for n in names if n}) != len([n for n in names if n]):
        problems.append("nume de etapă duplicat")
    for s in st:
        img = s["image"]
        if img not in names and (":" not in img or img.endswith(":latest")):
            problems.append("imagine nefixată: " + img)
    # COPY --from trebuie să arate spre o etapă anterioară, după nume
    for i, s in enumerate(st):
        for name, args in s["ins"]:
            m = re.search(r"--from=(\S+)", args) if name == "COPY" else None
            if m and m.group(1) not in [x["name"] for x in st[:i]]:
                problems.append("COPY --from=%s nu arată spre o etapă anterioară numită" % m.group(1))
    if len(st) >= 2:
        last, build = st[-1], st[:-1]
        if not any(n == "COPY" and "--from=" in a for n, a in last["ins"]):
            problems.append("etapa finală nu copiază nimic din etapele de build")
        if any(n == "RUN" and "pip install" in a for n, a in last["ins"]):
            problems.append("etapa finală instalează dependențe (uneltele de build ajung în imagine)")
        if not any(n == "RUN" and "pip install" in a for s in build for n, a in s["ins"]):
            problems.append("dependențele nu se instalează într-o etapă de build")
    if st:
        last = st[-1]["ins"]
        users = [i for i, (n, _) in enumerate(last) if n == "USER"]
        if not users:
            problems.append("lipsește USER în etapa finală")
        else:
            who = last[users[-1]][1].split(":")[0]
            if who in ("root", "0"):
                problems.append("USER rămâne root")
            made = [a for n, a in last[: users[-1]] if n == "RUN" and re.search(r"\b(useradd|adduser)\b", a)]
            if not who.isdigit() and not any(re.search(r"\b%s\b" % re.escape(who), a) for a in made):
                problems.append("USER %s nu e creat înainte (useradd)" % who)
            cmds = [i for i, (n, _) in enumerate(last) if n in ("CMD", "ENTRYPOINT")]
            if cmds and cmds[-1] < users[-1]:
                problems.append("USER vine după CMD")
        cmds = [(n, a) for n, a in last if n in ("CMD", "ENTRYPOINT")]
        if not cmds:
            problems.append("lipsește CMD")
        for n, a in cmds:
            try:
                ok = isinstance(json.loads(a), list)
            except ValueError:
                ok = False
            if not ok:
                problems.append("%s în forma shell (SIGTERM nu ajunge la proces): folosește lista JSON" % n)
    # ordinea pentru cache: requirements înaintea codului, înaintea lui pip install
    for s in st:
        seq = s["ins"]
        inst = [i for i, (n, a) in enumerate(seq) if n == "RUN" and "pip install" in a]
        if inst:
            before = seq[: inst[0]]
            if not any(n == "COPY" and "requirements" in a for n, a in before):
                problems.append("requirements.txt nu e copiat înainte de pip install")
            if any(n == "COPY" and re.search(r"(^|\s)\.\s+\S+$", a) and "--from" not in a for n, a in before):
                problems.append("codul întreg e copiat înainte de pip install (cache stricat)")
    return problems


DOCKERFILE = section("skel_docker.Dockerfile", "s-docker-multistage")


def test_dockerfile_referinta_e_valida():
    assert dockerfile_problems(DOCKERFILE) == []


@pytest.mark.parametrize(
    "stricat, vechi, nou, ar_trebui",
    [
        ("etapă fără nume", "FROM python:3.12-slim AS runtime", "FROM python:3.12-slim", "etapă fără nume"),
        ("rămâne root", "USER app\n", "USER root\n", "root"),
        ("fără USER", "USER app\n", "", "lipsește USER"),
        ("USER fără useradd", "RUN useradd --create-home app\n", "", "nu e creat"),
        ("CMD în forma shell", 'CMD ["uvicorn", "main:app", \\\n     "--host", "0.0.0.0"]', "CMD uvicorn main:app", "shell"),
        ("imagine latest", "FROM python:3.12-slim AS build", "FROM python:latest AS build", "nefixată"),
        ("fără tag", "FROM python:3.12-slim AS build", "FROM python AS build", "nefixată"),
        ("fără COPY --from", "COPY --from=build /install /usr/local\n", "", "nu copiază nimic"),
        ("COPY --from spre etapă inexistentă", "--from=build", "--from=builder", "etapă anterioară"),
    ],
)
def test_dockerfile_stricat_e_respins(stricat, vechi, nou, ar_trebui):
    assert vechi in DOCKERFILE, "variantă stricată netestabilă: %r lipsește din referință" % vechi
    probleme = dockerfile_problems(DOCKERFILE.replace(vechi, nou, 1))
    assert any(ar_trebui in p for p in probleme), (stricat, probleme)


def test_dockerfile_cache_stricat_si_o_singura_etapa():
    cod_inainte = DOCKERFILE.replace("COPY requirements.txt .\n", "COPY . .\nCOPY requirements.txt .\n", 1)
    assert any("cache" in p for p in dockerfile_problems(cod_inainte))
    singura = "FROM python:3.12-slim\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nUSER root\nCMD [\"x\"]\n"
    assert any("multi-stage" in p for p in dockerfile_problems(singura))
    fara_req = DOCKERFILE.replace("COPY requirements.txt .\n", "", 1)
    assert any("requirements.txt nu e copiat" in p for p in dockerfile_problems(fara_req))


def test_dockerfile_continuarile_cu_backslash_se_unesc():
    ins = instructions("FROM a AS b\nRUN pip install \\\n    --no-cache-dir x\n# comentariu\nCMD [\"x\"]\n")
    assert [i[0] for i in ins] == ["FROM", "RUN", "CMD"]
    assert re.sub(r"\s+", " ", ins[1][1]) == "pip install --no-cache-dir x"


# ---------- compose ----------
COMPOSE = section("skel_docker_compose.yml", "s-docker-compose")


def compose_problems(text):
    problems = []
    doc = yaml.safe_load(text)
    if not isinstance(doc, dict) or not isinstance(doc.get("services"), dict):
        return ["lipsește services"]
    if "version" in doc:
        problems.append("cheia version e învechită în Compose Specification")
    svc = doc["services"]
    deps = {}
    for name, s in svc.items():
        dep = s.get("depends_on")
        if dep is None:
            continue
        if isinstance(dep, list):
            problems.append("%s: depends_on în forma scurtă nu așteaptă healthcheck-ul" % name)
            continue
        for target, cfg in dep.items():
            if target not in svc:
                problems.append("%s depinde de un serviciu inexistent: %s" % (name, target))
                continue
            deps[(name, target)] = cfg
            if (cfg or {}).get("condition") != "service_healthy":
                problems.append("%s→%s: lipsește condition: service_healthy" % (name, target))
            elif "healthcheck" not in svc[target]:
                problems.append("%s→%s: service_healthy fără healthcheck pe %s" % (name, target, target))
    if not deps:
        problems.append("niciun depends_on")
    for name, s in svc.items():
        hc = s.get("healthcheck")
        if hc is None:
            continue
        t = hc.get("test")
        if not (isinstance(t, str) or (isinstance(t, list) and t and t[0] in ("CMD", "CMD-SHELL", "NONE"))):
            problems.append("%s: healthcheck.test invalid: %r" % (name, t))
        for key in ("interval", "timeout", "retries"):
            if key not in hc:
                problems.append("%s: healthcheck fără %s" % (name, key))
    if not any("healthcheck" in s for s in svc.values()):
        problems.append("niciun healthcheck")
    # aplicația ajunge la bază după numele serviciului, nu prin localhost
    for name, s in svc.items():
        env = s.get("environment") or {}
        env = env if isinstance(env, dict) else dict(e.split("=", 1) for e in env)
        for k, v in env.items():
            if re.match(r"\w+://", str(v)):
                host = re.sub(r"^\w+://([^@/]*@)?([^:/]+).*$", r"\2", str(v))
                if host in ("localhost", "127.0.0.1"):
                    problems.append("%s: %s arată spre %s (în container e containerul însuși)" % (name, k, host))
                elif host not in svc:
                    problems.append("%s: %s arată spre %s, care nu e serviciu" % (name, k, host))
    # imagini cu tag fixat
    for name, s in svc.items():
        img = s.get("image")
        if img and (":" not in img or img.endswith(":latest")):
            problems.append("%s: imagine nefixată: %s" % (name, img))
    # porturile ca șiruri: un mapping ca 22:22 neghilimelat se citește în YAML 1.1 ca număr (sexagesimal)
    for name, s in svc.items():
        for p in s.get("ports", []):
            if not isinstance(p, str):
                problems.append("%s: portul %r trebuie scris între ghilimele" % (name, p))
    # volumele numite folosite trebuie declarate sus
    declared = set((doc.get("volumes") or {}).keys())
    for name, s in svc.items():
        for v in s.get("volumes", []):
            src = str(v).split(":")[0]
            if not src.startswith((".", "/", "~")) and src not in declared:
                problems.append("%s: volumul %s nu e declarat în volumes:" % (name, src))
    if not declared:
        problems.append("lipsește volumul numit pentru datele bazei")
    return problems


def test_compose_referinta_e_valida():
    assert compose_problems(COMPOSE) == []


@pytest.mark.parametrize(
    "stricat, vechi, nou, ar_trebui",
    [
        ("depends_on scurt", "    depends_on:\n      db:\n        condition: service_healthy\n", "    depends_on:\n      - db\n", "forma scurtă"),
        ("condition lipsă", "        condition: service_healthy\n", "        required: true\n", "condition"),
        ("fără healthcheck", "healthcheck:", "x-hc:", "healthcheck"),
        ("localhost", "@db", "@localhost", "localhost"),
        ("host inexistent", "@db", "@baza", "nu e serviciu"),
        ("volum nedeclarat", "volumes:\n  pgdata:", "volumes:\n  altul:", "nu e declarat"),
        ("imagine latest", "postgres:16", "postgres:latest", "nefixată"),
        ("port neghilimelat", '"8000:8000"', "22:22", "ghilimele"),
        ("version învechit", "services:", 'version: "3.9"\nservices:', "version"),
        ("healthcheck fără retries", "      retries: 5\n", "", "retries"),
    ],
)
def test_compose_stricat_e_respins(stricat, vechi, nou, ar_trebui):
    assert vechi in COMPOSE, "variantă stricată netestabilă: %r lipsește din referință" % vechi
    probleme = compose_problems(COMPOSE.replace(vechi, nou, 1))
    assert any(ar_trebui in p for p in probleme), (stricat, probleme)


def _compose_cli_disponibil():
    if not shutil.which("docker"):
        return False
    return subprocess.run(["docker", "compose", "version"], capture_output=True).returncode == 0


@pytest.mark.skipif(not _compose_cli_disponibil(), reason="docker compose lipsește")
def test_compose_trece_de_docker_compose_config(tmp_path):
    # `docker compose config` validează schema și interpolarea fără daemon
    (tmp_path / "compose.yaml").write_text(COMPOSE)
    r = subprocess.run(["docker", "compose", "-f", str(tmp_path / "compose.yaml"), "config", "-q"], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
