# Verificarea structurală a referinței `.gitlab-ci.yml` (modulul ops). Nu rulează pipeline-ul (n-avem GitLab):
# parsează YAML-ul și aplică regulile din punctele esențiale. Variantele stricate trebuie respinse.
import pathlib
import re

import pytest

yaml = pytest.importorskip("yaml")

HERE = pathlib.Path(__file__).resolve().parent
RESERVED = {"stages", "default", "variables", "workflow", "include", "cache", "image", "services", "before_script", "after_script"}
# variabilele predefinite folosite în referință, verificate în docs.gitlab.com/ci/variables/predefined_variables/
PREDEFINED = {"CI_PROJECT_DIR", "CI_COMMIT_SHORT_SHA", "CI_COMMIT_BRANCH", "CI_DEFAULT_BRANCH", "CI_REGISTRY_IMAGE"}


def section(fname, sid):
    src = (HERE / fname).read_text(encoding="utf8")
    m = re.search(r"^# === %s ===\n(.*?)^# === end ===" % re.escape(sid), src, re.S | re.M)
    assert m, "lipsește secțiunea %s din %s" % (sid, fname)
    return m.group(1)


def pinned(image):
    return ":" in image and not image.endswith(":latest")


def ci_problems(text):
    problems = []
    doc = yaml.safe_load(text)
    if not isinstance(doc, dict):
        return ["nu e un mapping YAML"]
    stg = doc.get("stages")
    if not isinstance(stg, list) or not stg:
        return ["lipsește stages"]
    jobs = {k: v for k, v in doc.items() if k not in RESERVED and not k.startswith(".")}
    for name, job in jobs.items():
        if job.get("stage") not in stg:
            problems.append("jobul %s are stage necunoscut: %r" % (name, job.get("stage")))
        sc = job.get("script")
        if not isinstance(sc, list) or not sc or not all(isinstance(x, str) for x in sc):
            problems.append("jobul %s: script trebuie să fie o listă de comenzi" % name)
    if "test" not in jobs or "build" not in jobs:
        problems.append("trebuie un job test și un job build")
        return problems
    t_stage, b_stage = jobs["test"].get("stage"), jobs["build"].get("stage")
    if t_stage in stg and b_stage in stg and stg.index(t_stage) >= stg.index(b_stage):
        problems.append("testele trebuie să ruleze înaintea build-ului")
    if not any("pytest" in c for c in jobs["test"].get("script", [])):
        problems.append("jobul test nu rulează pytest")
    # imaginile fixate (nu :latest)
    images = []
    if "image" in (doc.get("default") or {}):
        images.append(doc["default"]["image"])
    for job in jobs.values():
        if "image" in job:
            images.append(job["image"])
        images += [s["name"] if isinstance(s, dict) else s for s in job.get("services", [])]
    for i in images:
        if not pinned(str(i)):
            problems.append("imagine nefixată: %s" % i)
    if not images:
        problems.append("nicio imagine")
    # cache-ul: cheie din requirements, căi în interiorul proiectului (GitLab nu cache-uiește în afara lui)
    test = jobs["test"]
    cache = test.get("cache") or {}
    if "requirements.txt" not in ((cache.get("key") or {}).get("files") or []):
        problems.append("cache fără key:files pe requirements.txt")
    pip_dir = str((test.get("variables") or {}).get("PIP_CACHE_DIR", ""))
    if not pip_dir.startswith("$CI_PROJECT_DIR/"):
        problems.append("PIP_CACHE_DIR trebuie să fie în $CI_PROJECT_DIR")
    paths = cache.get("paths") or []
    if not paths:
        problems.append("cache fără paths")
    for p in paths:
        if str(p).startswith(("/", "~", "..")):
            problems.append("calea de cache iese din proiect: %s" % p)
    if paths and pip_dir.startswith("$CI_PROJECT_DIR/") and pip_dir[len("$CI_PROJECT_DIR/"):].rstrip("/") not in [str(p).rstrip("/") for p in paths]:
        problems.append("cache:paths nu conține directorul din PIP_CACHE_DIR")
    # build: tag cu SHA-ul commit-ului (nu latest), doar pe ramura implicită, dind cu TLS
    build = jobs["build"]
    bvars = build.get("variables") or {}
    # $TAG din script se înlocuiește cu valoarea din variables (ca la runner)
    cmds = re.sub(r"\$(\w+)", lambda m: str(bvars.get(m.group(1), m.group(0))), " ".join(build.get("script", [])))
    if "docker build" not in cmds:
        problems.append("jobul build nu rulează docker build")
    if "$CI_COMMIT_SHORT_SHA" not in cmds:
        problems.append("imaginea nu e etichetată cu $CI_COMMIT_SHORT_SHA")
    if re.search(r":latest\b", cmds):
        problems.append("imaginea e etichetată :latest")
    rules = build.get("rules") or []
    if not any("$CI_DEFAULT_BRANCH" in str(r.get("if", "")) for r in rules):
        problems.append("build fără rules pe ramura implicită")
    svc = [s["name"] if isinstance(s, dict) else s for s in build.get("services", [])]
    if not any("dind" in str(s) for s in svc):
        problems.append("build fără serviciul docker:dind")
    if "DOCKER_TLS_CERTDIR" not in (build.get("variables") or {}):
        problems.append("build fără DOCKER_TLS_CERTDIR")
    # orice $CI_* folosit trebuie să fie o variabilă predefinită cunoscută (greșeli de scris)
    for var in set(re.findall(r"\$\{?(CI_[A-Z_]+)", text)):
        if var not in PREDEFINED:
            problems.append("variabilă necunoscută: $%s" % var)
    return problems


CI = section("skel_ops_gitlab_ci.yml", "s-ops-gitlab-ci")


def test_ci_referinta_e_valida():
    assert ci_problems(CI) == []


@pytest.mark.parametrize(
    "stricat, vechi, nou, ar_trebui",
    [
        ("stage necunoscut", "stage: build", "stage: deploy", "stage necunoscut"),
        ("fără pytest", "pytest -q", "echo ok", "pytest"),
        ("imagine latest", "python:3.12-slim", "python:latest", "nefixată"),
        ("imagine fără tag", "python:3.12-slim", "python", "nefixată"),
        ("cache fără cheie", "      files: [requirements.txt]\n", "      files: []\n", "key:files"),
        ("PIP_CACHE_DIR în afara proiectului", "$CI_PROJECT_DIR/.pip", "/root/.pip", "PIP_CACHE_DIR"),
        ("cale de cache absolută", "paths: [.pip]", "paths: [/root/.pip]", "iese din proiect"),
        ("cache pe alt director", "paths: [.pip]", "paths: [.altul]", "nu conține"),
        ("tag latest", "TAG: app:$CI_COMMIT_SHORT_SHA", "TAG: app:latest", "CI_COMMIT_SHORT_SHA"),
        ("fără rules", "  rules:\n    - if: >-\n        $CI_COMMIT_BRANCH ==\n        $CI_DEFAULT_BRANCH\n", "", "rules"),
        ("fără dind", "services: [docker:29-dind]", "services: []", "dind"),
        ("fără TLS", "    DOCKER_TLS_CERTDIR: /certs\n", "", "DOCKER_TLS_CERTDIR"),
        ("variabilă cu typo", "$CI_COMMIT_SHORT_SHA", "$CI_COMMIT_SHORTSHA", "necunoscută"),
        ("script ca șir", "  script:\n    - pip install -r requirements.txt\n    - pytest -q\n", "  script: pytest -q\n", "listă"),
    ],
)
def test_ci_stricat_e_respins(stricat, vechi, nou, ar_trebui):
    assert vechi in CI, "variantă stricată netestabilă: %r lipsește din referință" % vechi
    probleme = ci_problems(CI.replace(vechi, nou, 1))
    assert any(ar_trebui in p for p in probleme), (stricat, probleme)


def test_ci_testele_rulau_dupa_build():
    inversat = CI.replace("stages: [test, build]", "stages: [build, test]")
    assert any("înaintea build-ului" in p for p in ci_problems(inversat))
