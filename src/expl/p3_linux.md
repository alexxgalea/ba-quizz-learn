<!-- Linux. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### lx-02
Pe scurt: Cu `ss -tlnp | grep 8000` sau `lsof -i :8000`: ambele listează socket-urile deschise și procesul care le deține.
Scop: „Address already in use” la pornirea unui serviciu e o situație banală, iar tu vrei să afli în câteva secunde cine ocupă portul.
Mecanism: Un proces care ascultă pe un port are deschis un socket TCP în starea LISTEN. `ss` citește tabela de socket-uri din kernel: `-t` (TCP), `-l` (doar cele în ascultare), `-n` (porturi numerice), `-p` (procesul). `lsof -i :8000` listează fișierele deschise de tip rețea pe portul respectiv, inclusiv PID-ul.
Pas cu pas:
```text
ss -tlnp | grep 8000
LISTEN ... 0.0.0.0:8000 ...
  users:(("gunicorn",pid=4242,fd=5))
-> gunicorn, PID 4242, ține portul
```
Aplicare: Cu PID-ul găsit, vezi comanda completă (`ps -fp 4242`) și decizi: oprești procesul vechi sau pornești serviciul pe alt port. Fără `sudo` nu vezi procesele altor useri.
Legătură: În Docker, portul poate fi ocupat de un container: `docker ps` arată ce porturi publică fiecare.
Limită: `netstat -tlnp` face același lucru, dar e învechit și lipsește din multe imagini minimale; `ss` e varianta modernă.
La interviu: „Folosesc `ss -tlnp` sau `lsof -i :8000`, care arată socket-urile în ascultare și procesul care le deține. `ps` nu știe nimic despre porturi.”
Verificare: `ss -tlnp` arată portul ocupat, dar coloana cu procesul e goală. De ce?
Răspuns verificare: Procesul aparține altui user, de exemplu lui root, iar fără `sudo` nu ai voie să-i vezi detaliile. Rulezi comanda cu `sudo`.
Varianta greșită B: `ps` listează procese, nu porturi: `grep 8000` ar găsi doar procesele care au „8000” în linia de comandă.
Varianta greșită C: `df` arată spațiul pe disc al sistemelor de fișiere, nu socket-uri sau porturi.
Varianta greșită D: `ping` folosește ICMP, care nu are porturi, și nu întoarce niciun PID.

### lx-03
Pe scurt: `awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -5`: extragi IP-urile, le sortezi ca să fie consecutive, le numeri, sortezi descrescător după număr și păstrezi primele 5.
Scop: La un incident (trafic suspect, un posibil atac) afli în câteva secunde cine generează cele mai multe request-uri.
Mecanism: `awk '{print $1}'` scoate prima coloană, adică IP-ul. `uniq -c` numără doar liniile identice consecutive, deci ai nevoie de un `sort` înainte, ca toate aparițiile unui IP să fie una lângă alta. `sort -rn` ordonează numeric, descrescător, după contor, iar `head -5` păstrează primele 5.
Pas cu pas:
```text
awk: 1.2.3.4, 5.6.7.8, 1.2.3.4
sort: 1.2.3.4, 1.2.3.4, 5.6.7.8
uniq -c: 2 1.2.3.4 / 1 5.6.7.8
sort -rn: cel mai mare contor primul
head -5: top 5
```
Aplicare: Aceeași rețetă merge pentru orice coloană: codurile de status (`$9` în formatul combined), URL-urile (`$7`), user agent-urile. Pentru loguri comprimate: `zcat access.log.gz | awk ...`.
Legătură: E echivalentul unui `SELECT ip, count(*) ... GROUP BY ip ORDER BY 2 DESC LIMIT 5`. Iar `uniq` are exact capcana lui `groupby` de la PY-10: grupează doar elementele consecutive.
Limită: Pentru fișiere de zeci de GB, `sort` folosește disc temporar și poate dura. Alternativ, numeri direct într-un dicționar: `awk '{c[$1]++} END {for (ip in c) print c[ip], ip}' access.log | sort -rn | head -5`.
La interviu: „`awk '{print $1}' | sort | uniq -c | sort -rn | head -5`: sortez înainte de `uniq -c`, pentru că numără doar liniile consecutive, apoi sortez numeric, descrescător, după contor.”
Verificare: Vrei top 5 coduri de status, nu IP-uri, dintr-un log în format combined. Ce schimbi?
Răspuns verificare: Doar coloana din `awk`: `awk '{print $9}'`, unde se află codul de status în formatul combined. Restul pipeline-ului rămâne la fel.
Varianta greșită B: Fără `sort` înainte, `uniq -c` numără doar aparițiile consecutive, deci același IP apare de mai multe ori, cu contoare parțiale.
Varianta greșită C: `sort -u` elimină duplicatele înainte de numărare, deci fiecare IP ar avea contorul 1.
Varianta greșită D: `sort -n` ordonează crescător: primele 5 ar fi IP-urile cele mai rare, nu cele mai frecvente.

### lx-04
Pe scurt: Procesul a atins limita de descriptori de fișiere: fie are un leak (fișiere sau conexiuni deschise și neînchise), fie limita (`ulimit -n`) e prea mică. Verifici cu `lsof -p PID`.
Scop: Eroarea apare de obicei după ore sau zile de funcționare, sub încărcare, și blochează orice conexiune nouă: HTTP, DB, fișiere.
Mecanism: În Linux, fiecare fișier deschis, socket sau conexiune ocupă un descriptor, iar fiecare proces are o limită (adesea 1024, implicit). Dacă codul creează un client HTTP sau o conexiune la fiecare request și nu le închide, descriptorii se adună până la limită, iar apoi orice `open()` sau `connect()` eșuează.
Pas cu pas:
```text
ls /proc/4242/fd | wc -l -> 1024 (plin)
lsof -p 4242 | awk '{print $5}'
  | sort | uniq -c -> ~1.000 × IPv4
-> conexiuni HTTP neînchise
```
Aplicare: Închizi resursele cu context managers (`with open(...)`, `with httpx.Client() as c`) și refolosești un singur client, cu un pool de conexiuni, în loc să creezi unul la fiecare request. Limita o crești (`ulimit -n`, `LimitNOFILE` în systemd, `--ulimit nofile` în Docker) doar dacă ai nevoie reală de multe conexiuni simultane.
Legătură: E PY-08 în practică: context managerul garantează închiderea resursei, chiar și la excepții.
Limită: Creșterea limitei doar amână problema dacă ai un leak: descriptorii tot se adună, doar că ajung mai târziu la noua limită. Întâi verifici dacă numărul lor crește continuu în timp.
La interviu: „„Too many open files” înseamnă că procesul a atins limita de descriptori. Verific cu `lsof -p PID` ce tip de descriptori se adună; cauza tipică sunt conexiunile neînchise. Repar cu context managers și pool-uri, iar limita o cresc doar dacă chiar am nevoie.”
Verificare: Numărul de descriptori ai procesului crește constant cu traficul și nu scade niciodată. Ce indică?
Răspuns verificare: Un leak: ceva se deschide la fiecare request și nu se mai închide. Cauți tipul descriptorului (fișier, socket) cu `lsof`, apoi locul din cod unde se creează.
Varianta greșită B: Un disc plin dă alte erori, de exemplu „No space left on device”. „Too many open files” ține de limita de descriptori a procesului.
Varianta greșită C: Threadurile nu consumă descriptori în sine. `top` arată CPU și memorie, nu fișiere deschise.
Varianta greșită D: Lipsa de RAM dă erori de memorie sau intervenția OOM killer-ului, nu „Too many open files”.

### lx-05
Pe scurt: `640`: owner-ul poate citi și scrie, grupul poate doar citi, iar ceilalți n-au niciun drept.
Scop: Fișierele de configurare cu secrete (parole, chei) trebuie citite doar de cine are nevoie; un `chmod` greșit le expune tuturor userilor de pe mașină.
Mecanism: Fiecare cifră octală e o sumă: 4 citire (r), 2 scriere (w), 1 execuție (x). Prima cifră e pentru owner, a doua pentru grup, a treia pentru ceilalți. 6 = 4 + 2 (rw), 4 = r, 0 = nimic.
Pas cu pas:
```text
chmod 640 config.yaml
  owner: 6 = r + w -> rw-
  grup:  4 = r     -> r--
  alții: 0         -> ---
ls -l -> -rw-r----- app app config.yaml
```
Aplicare: Pentru un fișier cu secrete: owner-ul e userul aplicației, grupul sunt cei care trebuie să-l citească, cu `640` sau chiar `600`. Pentru scripturi executabile: `750` sau `755`.
Legătură: Leagă-l de DK-06: aplicația rulează ca user non-root, iar fișierele ei trebuie să-i aparțină, cu drepturile minime necesare.
Limită: Root ignoră aceste permisiuni, iar la directoare „x” înseamnă dreptul de a intra în director, nu de a executa ceva. Iar `chmod 777` „ca să meargă” e aproape mereu o problemă de securitate.
La interviu: „`640` înseamnă rw pentru owner, r pentru grup și nimic pentru ceilalți: fiecare cifră e suma dintre 4 (citire), 2 (scriere) și 1 (execuție). Pentru fișiere cu secrete folosesc `600` sau `640`, cu owner-ul aplicației.”
Verificare: Ce permisiuni dă `chmod 755 deploy.sh`?
Răspuns verificare: Owner: rwx (7 = 4 + 2 + 1); grup și ceilalți: r-x (5 = 4 + 1). Toți pot citi și rula scriptul, dar doar owner-ul îl poate modifica.
Varianta greșită B: Citire și scriere pentru toți ar fi `666`. Aici a treia cifră e 0, deci ceilalți nu au niciun drept.
Varianta greșită C: Cifrele se citesc ca sume de 4 (r), 2 (w) și 1 (x): 6 înseamnă rw, nu execuție.
Varianta greșită D: Permisiunile privesc owner-ul și grupul fișierului, nu doar pe root, care oricum le ignoră.

### lx-06
Pe scurt: Pe namespaces, care izolează ce vede procesul (procese, rețea, fișiere, hostname), și pe cgroups, care limitează cât consumă (CPU, memorie, I/O).
Scop: Înțelegi de ce un container pornește în milisecunde, de ce împarte kernelul cu gazda și de unde vin limitele de memorie și CPU.
Mecanism: Un container e un proces obișnuit al gazdei, pornit în namespaces proprii: PID (își vede doar procesele, iar el e PID 1), net (are interfețele lui), mount (vede doar sistemul de fișiere al imaginii), uts (hostname propriu). Cgroups îi pun limite: dacă depășește memoria alocată, kernelul îl oprește (OOM).
Pas cu pas:
```text
docker run --memory=512m --cpus=1 app
  namespaces: PID, net, mount, uts
  cgroups: 512 MB memorie, 1 CPU
pe gazdă: ps aux -> procesul se vede
în container: ps aux -> doar procesele lui
```
Aplicare: Pui mereu limite de memorie și CPU containerelor (`--memory`, `--cpus`, `resources.limits` în Kubernetes), ca un serviciu cu probleme să nu consume toată mașina.
Legătură: Explică DK-04 (PID 1 în container) și LX-07 (codul de ieșire 137, când e depășită limita de memorie din cgroup).
Limită: Pentru că toate containerele împart kernelul gazdei, o vulnerabilitate de kernel poate permite evadarea dintr-un container. Pentru izolare mai puternică există sandbox-uri (gVisor) sau micro-VM-uri (Firecracker).
La interviu: „Containerele se bazează pe namespaces, pentru izolare (PID-uri, rețea, fișiere), și pe cgroups, pentru limite de CPU și memorie. Un container e un proces izolat care împarte kernelul cu gazda, de aceea pornește în milisecunde.”
Verificare: Pornești același container pe o gazdă cu alt kernel. Ce kernel folosește containerul?
Răspuns verificare: Kernelul gazdei: containerul nu are kernel propriu. Imaginea aduce doar fișierele (bibliotecile, aplicația).
Varianta greșită B: Mașinile virtuale au kernel propriu și pornesc în secunde sau minute. Containerele împart kernelul gazdei.
Varianta greșită C: chroot schimbă doar directorul rădăcină: nu izolează procesele sau rețeaua și nu limitează resursele.
Varianta greșită D: Pentru containere Linux pe o gazdă Linux, Docker nu folosește un hypervisor: totul se bazează pe mecanismele kernelului.

### lx-07
Pe scurt: Codul 137 înseamnă că procesul a primit SIGKILL (128 + 9), cel mai des de la OOM killer, pentru că a depășit limita de memorie.
Scop: Un container care repornește în buclă cu 137 are aproape sigur o problemă de memorie, nu un bug de pornire, iar asta îți schimbă direcția de investigație.
Mecanism: Când un proces e oprit de un semnal, codul de ieșire e 128 plus numărul semnalului: SIGKILL e 9, deci 137; SIGTERM e 15, deci 143. Când un container își depășește limita de memorie din cgroup, kernelul îl oprește cu SIGKILL, fără nicio șansă de cleanup.
Pas cu pas:
```text
limită: 512 MB
aplicația încarcă un fișier de 600 MB
kernel: OOM -> SIGKILL
cod de ieșire: 128 + 9 = 137
docker inspect -> "OOMKilled": true
```
Aplicare: Verifici `docker inspect <container>` (`State.OOMKilled`) sau `kubectl describe pod` (Reason: OOMKilled), apoi memoria procesului: un leak, un fișier încărcat integral în RAM (PF-05) sau prea mulți workeri în același container.
Legătură: E finalul tipic al scenariului de la PF-05: `.all()` pe 5M de rânduri se termină adesea exact așa, cu 137.
Limită: 137 poate veni și dintr-un `docker kill` sau de la SIGKILL-ul de după perioada de grație a unui `docker stop` (DK-04). De aceea verifici `OOMKilled` înainte să tragi concluzii.
La interviu: „137 înseamnă SIGKILL (128 + 9), de obicei de la OOM killer, când containerul își depășește limita de memorie. Verific `OOMKilled` în `docker inspect` sau în evenimentele Kubernetes, apoi caut leak-ul sau datele încărcate integral în RAM.”
Verificare: Un container se oprește cu codul 143. Ce înseamnă?
Răspuns verificare: A fost oprit prin SIGTERM (128 + 15), de obicei la un `docker stop` sau la un deploy, înainte să mai fie nevoie de SIGKILL.
Varianta greșită B: O eroare de sintaxă face Python să iasă cu codul 1, nu cu 137.
Varianta greșită C: Dacă imaginea lipsește, containerul nici nu pornește: primești o eroare la pull, nu un cod de ieșire 137.
Varianta greșită D: Un port ocupat împiedică pornirea containerului cu o eroare de bind, nu duce la codul 137.
