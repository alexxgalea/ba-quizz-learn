# Referința de schelet pentru modulul ops: logging structurat (JSON + extra).
# Fiecare secțiune „=== s-… ===” ajunge în aplicație (build.mjs); testele sunt în test_skel_ops_logging.py.

# === s-ops-json-log ===
import json
import logging

# atributele standard ale unui LogRecord
STD = set(vars(logging.makeLogRecord({})))
STD |= {"message", "asctime"}


class JsonFormatter(logging.Formatter):
    def format(self, record):
        d = {
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        # ce a venit prin extra={...}
        for k, v in vars(record).items():
            if k not in STD:
                d[k] = v
        if record.exc_info:
            fe = self.formatException
            d["exc"] = fe(record.exc_info)
        return json.dumps(d, default=str)


handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
log = logging.getLogger("app")
log.addHandler(handler)
log.setLevel(logging.INFO)
# === end ===
