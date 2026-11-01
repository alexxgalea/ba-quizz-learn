# Testele referințelor de schelet pentru modulul linux.
# Un proces copil rulează serve(); testul îi trimite SIGTERM, ca `docker stop`
# sau `kill`, și verifică oprirea curată: cod 0, unitatea curentă terminată,
# cleanup făcut.
import os
import pathlib
import signal
import subprocess
import sys
import textwrap

import pytest

HERE = pathlib.Path(__file__).resolve().parent

pytestmark = pytest.mark.skipif(
    not hasattr(signal, "SIGTERM") or sys.platform == "win32",
    reason="SIGTERM real există doar pe Linux / macOS")

CHILD = textwrap.dedent("""
    import sys, time
    from skel_linux import serve

    def step():
        print("start", flush=True)
        time.sleep(0.05)             # unitate de lucru
        print("end", flush=True)

    def cleanup():
        print("cleanup", flush=True)

    print("ready", flush=True)
    serve(step, cleanup)
    print("exit", flush=True)
""")


def spawn(code=CHILD):
    env = dict(os.environ, PYTHONPATH=str(HERE), PYTHONUNBUFFERED="1")
    return subprocess.Popen(
        [sys.executable, "-c", code], stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, text=True, env=env)


def wait_ready(proc):
    line = proc.stdout.readline().strip()
    if line != "ready":
        proc.kill()
        pytest.fail("copilul nu a pornit: %r %s" % (
            line, proc.stderr.read()))
    # lasă bucla să facă câteva unități de lucru
    assert proc.stdout.readline().strip() == "start"


def finish(proc, sig):
    proc.send_signal(sig)
    try:
        out, err = proc.communicate(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        out, err = proc.communicate()
        pytest.fail("copilul nu s-a oprit la semnal: " + out)
    return out.split(), err


@pytest.mark.parametrize("sig", [signal.SIGTERM, signal.SIGINT])
def test_semnalul_opreste_curat(sig):
    proc = spawn()
    wait_ready(proc)
    words, err = finish(proc, sig)
    assert proc.returncode == 0, err
    assert "Traceback" not in err, err
    assert words[-2:] == ["cleanup", "exit"], words
    assert words.count("cleanup") == 1


def test_unitatea_curenta_se_termina():
    # SIGTERM poate veni în mijlocul unei unități: bucla nu o taie.
    # wait_ready a citit primul "start", deci urmează end (start end)*
    proc = spawn()
    wait_ready(proc)
    words, _ = finish(proc, signal.SIGTERM)
    body = words[:words.index("cleanup")]
    assert body, words
    for i, w in enumerate(body):
        assert w == ("end" if i % 2 == 0 else "start"), words
    assert body[-1] == "end", "bucla a fost tăiată în mijlocul unității"


def test_cleanup_ruleaza_si_cand_step_ridica():
    code = CHILD.replace(
        'print("end", flush=True)',
        'print("end", flush=True)\n    raise RuntimeError("boom")')
    proc = spawn(code)
    out, err = proc.communicate(timeout=5)
    assert proc.returncode != 0
    assert "cleanup" in out.split(), "cleanup trebuie în finally"
    assert "boom" in err
