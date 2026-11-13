# Înghețe „azi” în browserul de test la 5 zile înaintea datei implicite a interviewului (P.cfg.interview din src/data_core.js).
# Planul zilnic (genPlan) e gol după data interviewului, deci testele care îl citesc nu trebuie să depindă de ziua în care rulează.
# Se schimbă doar Date (cronometrele merg normal). Dacă data din P.cfg se mută, „azi” se mută odată cu ea.
import datetime, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DAYS_BEFORE = 5

def pinned_time():
    src = (ROOT / "src" / "data_core.js").read_text(encoding="utf-8")
    m = re.search(r'interview:\s*"(\d{4})-(\d{2})-(\d{2})"', src)
    if not m: raise SystemExit("fixed_day: nu găsesc P.cfg.interview în src/data_core.js")
    d = datetime.date(int(m[1]), int(m[2]), int(m[3])) - datetime.timedelta(days=DAYS_BEFORE)
    return datetime.datetime(d.year, d.month, d.day, 12, 0, 0)

async def pin(ctx):
    """Cheamă-l imediat după `new_context`, înainte să încarci pagina."""
    await ctx.clock.set_fixed_time(pinned_time())
