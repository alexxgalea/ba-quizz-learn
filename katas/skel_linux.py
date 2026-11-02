# Referințele de schelet pentru modulul linux.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_linux.py.

# === s-linux-sigterm ===
import signal
import threading


def serve(step, cleanup):
    stop = threading.Event()

    def on_signal(signum, frame):
        stop.set()  # doar un flag

    # doar din thread-ul principal
    sigs = (signal.SIGTERM, signal.SIGINT)
    for s in sigs:
        signal.signal(s, on_signal)
    try:
        while not stop.is_set():
            step()  # unitate întreagă
    finally:
        cleanup()  # flush, închide tot
# === end ===
