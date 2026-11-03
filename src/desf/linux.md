<!-- Desfășurările fișei `linux` (8 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/_desf_facts_linux.md (secțiunea 37), man7.org și kernel.org. C++ doar la 1 (std::signal), 5 (RAII față de descriptori) și 7 (chmod, octal); la restul nu există un echivalent real. -->

### harta
Problema: Un serviciu Python pe Linux se oprește fără urmă, nu mai primește conexiuni sau nu poate citi un fișier, iar tu ai doar un terminal, adesea într-un container fără IDE. Fără comenzile potrivite ghicești. Modulul răspunde la patru întrebări: cum se oprește un proces și ce spune codul lui de ieșire, ce face mașina chiar acum, ce a scris serviciul și cine are voie să citească, și ce este de fapt un container.
Grupuri:
- 1–2: cum se oprește un proces (semnale) și ce înseamnă un cod de ieșire
- 3–5: ce se întâmplă acum: procese și resurse, rețea, descriptori de fișiere
- 6–7: ce a scris serviciul (loguri) și cine are voie să citească (permisiuni)
- 8: ce e un container: procese izolate cu namespaces și limitate cu cgroups

### 1
Greu: da
Problema: Un deploy oprește un worker în mijlocul unui job. După 10 secunde procesul dispare, codul de cleanup nu a rulat, iar jobul rămâne marcat „în curs” pentru totdeauna.
Ideea: SIGTERM (15) cere oprirea. Fără handler, termină procesul pe loc, fără `finally`; cu handler, închizi conexiunile și termini jobul curent. SIGKILL (9) nu poate fi prins, blocat sau ignorat. Orchestratorul trimite întâi SIGTERM, apoi SIGKILL după perioada de grație (10 s la `docker stop`). SIGINT (2) e Ctrl+C și devine `KeyboardInterrupt` în Python. SIGHUP (1) înseamnă „terminalul s-a închis”; mulți daemoni îl citesc ca „reîncarcă configurația”.
Exemplu:
```python
import os, signal
def h(n, f):
    print("curăț")  # → curăț
signal.signal(signal.SIGTERM, h)
os.kill(os.getpid(), 15)
signal.signal(9, h)  # ! OSError
```
În C++: `std::signal(SIGTERM, on_term)` din `<csignal>` instalează un handler. Acesta doar ridică un steag (`volatile std::sig_atomic_t`), iar bucla principală îl verifică și iese curat.
Unde nu ține: Un handler C++ întrerupe firul în orice punct, deci standardul îi interzice aproape orice apel de bibliotecă și `throw`. Handlerul Python rulează în thread-ul principal, între două instrucțiuni de bytecode, deci poți face în el aproape orice.
Legătură: LX-01 și DK-04 (`docker stop`); schelet: `s-linux-sigterm`.

### 2
Greu: da
Problema: Un container repornește în buclă cu „exit code 137”. În log nu e nicio excepție Python, nici măcar un traceback.
Ideea: Un proces oprit de semnalul N e raportat de shell ca 128 + N: SIGKILL dă 137, SIGTERM dă 143. 137 vine adesea de la OOM killer: procesul a trecut de limita de memorie a cgroup-ului, iar kernelul îl oprește cu SIGKILL, fără traceback și fără cleanup. Același cod apare și după `docker kill`. `docker inspect` arată dacă a fost `OOMKilled`. Python vede același eveniment ca `-9`, nu ca 137.
Exemplu:
```python
import subprocess as sp
p = ["sh", "-c", "kill -9 $$"]
a = sp.run(p)
a.returncode  # → -9
c = "sh -c 'kill -9 $$'; echo $?"
r = sp.check_output(c, shell=True)
r  # → b'137\n'
```
Legătură: LX-07. PF-05 descrie finalul tipic: `.all()` pe 5M de rânduri, apoi 137.

### 3
Problema: Alerta spune „disc 95%”, iar serverul răspunde greu. Nu știi dacă vina e discul, memoria sau un proces.
Ideea: Fiecare comandă răspunde la o întrebare. `ps aux` listează procesele cu %CPU și %MEM, iar `top` le arată live. `free -m` dă memoria în MiB; te uiți la `available`, nu la `free`, fiindcă cache-ul de disc e recuperabil. `df -h` arată cât e plin fiecare disc montat. `du -sh *` arată cât ocupă fiecare element din director.
Exemplu:
```text
$ free -m
        used   free  available
Mem:     669  14666      15421
$ du -sh *
8.0K    cache
2.9M    logs
```
Legătură: LX-07 (memoria din container); `py-spy top` (PF-07) e `top` pe funcții Python.

### 4
Problema: Serviciul „nu răspunde”. Poate nu rulează, poate ascultă pe alt port, poate DNS-ul dă altă adresă, poate un firewall blochează.
Ideea: O comandă pe întrebare. `ss -tlnp` arată ce ascultă local (`-t` TCP, `-l` doar în ascultare, `-n` numeric, `-p` procesul). `dig nume` arată ce IP dă DNS-ul. `nc -zv host port` deschide o conexiune TCP fără să trimită date. `curl -v` arată conexiunea, header-ele și răspunsul HTTP. „Connection refused” înseamnă că nimic nu ascultă pe port.
Exemplu:
```text
$ nc -zv 127.0.0.1 8000
... 8000 port [tcp/*] succeeded!
$ nc -zv 127.0.0.1 8001
nc: connect to 127.0.0.1 port 8001
(tcp) failed: Connection refused
```
Legătură: LX-02. În Docker, portul poate fi ținut de un container (`docker ps`).

### 5
Greu: da
Problema: Serviciul merge bine ore întregi, apoi orice conexiune nouă pică cu „Too many open files”, deși memoria și discul sunt libere.
Ideea: Un fișier, un socket sau o conexiune ocupă un descriptor. Fiecare proces are o limită (`ulimit -n`), iar peste ea `open()` și `socket()` eșuează cu EMFILE. `lsof -p PID` listează descriptorii unui proces, iar `lsof -i :8000` listează procesele care folosesc portul 8000. Un număr care crește mereu înseamnă leak; un număr stabil, dar aproape de limită, înseamnă că limita e mică. Creșterea limitei amână un leak, nu îl repară.
Exemplu:
```python
import resource as r
r.setrlimit(r.RLIMIT_NOFILE, (9, 9))
fs = []
try:
    while True:
        fs.append(open("/dev/null"))
except OSError as e:
    print(e.errno)  # → 24
```
În C++: `std::ifstream` și un `unique_ptr` cu deleter închid descriptorul în destructor (RAII), la fel ca `with open(...)`.
Unde nu ține: Destructorul C++ rulează deterministic la ieșirea din scope. În Python un fișier uitat se închide când ajunge la zero referințe (în CPython), deci un obiect ținut într-o listă sau într-un `dict` rămâne deschis.
Legătură: LX-04. `with` garantează închiderea (PY-08).

### 6
Greu: da
Problema: După un incident ai un `access.log` de 2 GB. Editorul nu îl deschide, iar tu cauți cine a lovit endpoint-ul de login.
Ideea: `tail -f` urmărește un fișier care crește; `journalctl -u serviciu -f` face asta pentru un serviciu systemd. `grep` filtrează: `-i` ignoră majusculele, `-v` păstrează liniile fără potrivire, `-E` folosește regex extins (`|`, `+`), `-r` caută recursiv. `awk '{print $1}'` extrage prima coloană. `uniq -c` numără doar liniile identice consecutive, deci pui `sort` înainte.
Exemplu:
```text
$ awk '{print $1}' access.log \
>   | sort | uniq -c | sort -rn
      3 10.0.0.1
      1 10.0.0.3
      1 10.0.0.2
```
Legătură: LX-03; `uniq` are capcana lui `groupby` (PY-10), grupează doar vecinii. Echivalent SQL: `GROUP BY ip ORDER BY 2 DESC`.

### 7
Problema: Fișierul `.env` poate fi citit de orice user de pe mașină. Un `chmod 777` „ca să meargă” l-ar face și scriibil de oricine.
Ideea: Cifrele octale sunt sume: 4 (r) + 2 (w) + 1 (x), în ordinea owner, grup, ceilalți. `640` înseamnă `rw-`, `r--`, `---`. Root ignoră aceste drepturi. `os.chmod("f", 640)` e o greșeală: 640 zecimal este `0o1200`.
Exemplu:
```python
import os, stat
open("f", "w").close()
os.chmod("f", 0o640)
m = os.stat("f").st_mode
stat.filemode(m)  # → '-rw-r-----'
oct(640)  # → '0o1200'
```
În C++: `chmod("f", 0640)` din `<sys/stat.h>` (POSIX) primește același număr, scris cu un 0 în față.
Unde nu ține: În Python 3, `0640` e `SyntaxError`; literalul octal e `0o640`.
Legătură: LX-05 și DK-06 (aplicația rulează ca user non-root).

### 8
Greu: da
Problema: Cineva spune că un container e „o mașină virtuală mică”. Dar pe gazdă `ps` îi arată procesul, iar `uname -r` dă același kernel ca în afară.
Ideea: Un container e un proces Linux obișnuit, pornit în namespaces proprii: PID, rețea, mount, hostname. Ele izolează ce vede procesul. Cgroups îi limitează cât consumă (CPU, memorie); la depășirea memoriei, kernelul îl oprește. Kernelul e al gazdei. Primul proces din namespace-ul PID e PID 1 și primește un semnal doar dacă are handler pentru el; SIGKILL vine de la gazdă oricum.
Exemplu:
```text
# unshare --pid --fork \
>   --mount-proc ps -eo pid,comm
    PID COMMAND
      1 ps
# unshare --uts sh -c \
>   'hostname demo; hostname'
demo
```
Legătură: LX-06 și LX-07 (limita de memorie din cgroup). DK-04: un PID 1 fără handler pentru SIGTERM e oprit abia de SIGKILL.
