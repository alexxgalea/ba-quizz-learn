"""Rulează un bloc Python din desfășurări (codul vine pe stdin) și scrie pe stdout, ca JSON, ce a afișat și cum s-a oprit.

Comentarii citite din cod (cu tokenize, deci nu din șiruri):
  # → text     rezultatul așteptat al liniei (print sau expresie simplă, ca în REPL: se afișează repr-ul)
  # ! Tip      blocul trebuie să se oprească cu excepția Tip, pe instrucțiunea acestei linii
Apelat de tools/desf_examples.mjs cu `python3 -I -X utf8`, într-un director gol.
"""
import ast, contextlib, io, json, re, sys, tokenize, traceback

ARROW = re.compile(r"#\s*→\s?(.*)$")
BANG = re.compile(r"#\s*!\s*([A-Za-z_][\w.]*)\s*$")


class Shown(ast.NodeTransformer):
    """O expresie simplă cu `# → …` devine print(repr(expresie)); un print rămâne cum e."""

    def __init__(self, arrows):
        self.arrows = arrows

    def visit_Expr(self, node):
        v = node.value
        is_print = isinstance(v, ast.Call) and isinstance(v.func, ast.Name) and v.func.id == "print"
        if node.end_lineno in self.arrows and not is_print:
            call = ast.Call(ast.Name("print", ast.Load()), [ast.Call(ast.Name("repr", ast.Load()), [v], [])], [])
            return ast.fix_missing_locations(ast.copy_location(ast.Expr(call), node))
        return node


def main():
    code = sys.stdin.read()
    out = sys.__stdout__
    try:
        tree = ast.parse(code, "<ex>")
    except SyntaxError as e:
        out.write(json.dumps({"syntax": "%s (rândul %s)" % (e.msg, e.lineno)}))
        return
    arrows, marks = {}, {}
    for tok in tokenize.generate_tokens(io.StringIO(code).readline):
        if tok.type != tokenize.COMMENT:
            continue
        m = ARROW.match(tok.string)
        if m:
            arrows[tok.start[0]] = m.group(1).rstrip()
        m = BANG.match(tok.string)
        if m:
            marks[tok.start[0]] = m.group(1)
    res = {"expected": [[ln, arrows[ln]] for ln in sorted(arrows)], "marks": [[ln, marks[ln]] for ln in sorted(marks)], "stmts": [[s.lineno, s.end_lineno] for s in tree.body], "exc": None}
    tree = Shown(arrows).visit(tree)
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(tree, "<ex>", "exec"), {"__name__": "__main__"})
    except BaseException as e:  # noqa: BLE001: orice oprire contează, inclusiv SystemExit
        line = next((f.lineno for f in traceback.extract_tb(e.__traceback__) if f.filename == "<ex>"), None)
        res["exc"] = {"type": type(e).__name__, "line": line}
    res["output"] = buf.getvalue().splitlines()
    out.write(json.dumps(res))


main()
