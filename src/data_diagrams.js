/* Inline SVG diagrams for the cheat sheets. Colors come from page CSS (classes), so both themes work. */
(function (P) {
  const AH = (id) => `<defs><marker id="${id}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" class="ah"/></marker></defs>`;

  P.diagrams.gil = {
    cap: "Cu GIL, threadurile execută bytecode pe rând; cât un thread așteaptă I/O, GIL-ul trece la altul. Procesele rulează în paralel, fiecare pe core-ul lui.",
    svg: `<svg class="dg" viewBox="0 0 340 240" role="img" aria-label="Cu GIL, un singur thread execută bytecode la un moment dat, iar în timpul I/O GIL-ul trece la alt thread; procesele rulează în paralel pe core-uri diferite.">
<text x="0" y="14" class="t-strong">Threads în CPython (cu GIL)</text>
<text x="0" y="40" class="t-mono">T1</text>
<rect x="40" y="29" width="50" height="14" rx="2" class="run"/>
<rect x="90.6" y="29.6" width="69" height="13" rx="2" class="io"/>
<rect x="180" y="29" width="45" height="14" rx="2" class="run"/>
<text x="0" y="62" class="t-mono">T2</text>
<rect x="90" y="51" width="45" height="14" rx="2" class="run"/>
<rect x="135.6" y="51.6" width="79" height="13" rx="2" class="io"/>
<rect x="225" y="51" width="45" height="14" rx="2" class="run"/>
<text x="0" y="84" class="t-mono">T3</text>
<rect x="135" y="73" width="45" height="14" rx="2" class="run"/>
<rect x="180.6" y="73.6" width="79" height="13" rx="2" class="io"/>
<rect x="270" y="73" width="45" height="14" rx="2" class="run"/>
<text x="40" y="106" class="t-mute">o singură bară plină în orice moment</text>
<text x="330" y="106" text-anchor="end" class="t-mute">timp →</text>
<text x="0" y="136" class="t-strong">Procese (CPU-bound)</text>
<text x="0" y="158" class="t-mono">P1</text>
<rect x="40" y="147" width="275" height="14" rx="2" class="run"/>
<text x="309" y="158" text-anchor="end" class="t-on">core 1</text>
<text x="0" y="180" class="t-mono">P2</text>
<rect x="40" y="169" width="275" height="14" rx="2" class="run"/>
<text x="309" y="180" text-anchor="end" class="t-on">core 2</text>
<text x="0" y="202" class="t-mono">P3</text>
<rect x="40" y="191" width="275" height="14" rx="2" class="run"/>
<text x="309" y="202" text-anchor="end" class="t-on">core 3</text>
<rect x="0" y="219" width="14" height="10" rx="2" class="run"/>
<text x="20" y="228" class="t-mute">execută bytecode</text>
<rect x="150.6" y="219.6" width="13" height="9" rx="2" class="io"/>
<text x="170" y="228" class="t-mute">așteaptă I/O (GIL liber)</text>
</svg>`
  };

  P.diagrams.asgi = {
    cap: "Gunicorn ține procesele în viață; fiecare worker rulează propriul event loop Uvicorn. Un apel blocant într-un async def oprește tot loop-ul workerului respectiv.",
    svg: `<svg class="dg" viewBox="0 0 340 292" role="img" aria-label="Client, apoi Nginx sau load balancer, apoi un master Gunicorn care pornește trei procese worker, fiecare cu propriul event loop Uvicorn.">
${AH("ah-asgi")}
<rect x="120" y="4" width="100" height="26" rx="6" class="bx"/>
<text x="170" y="21" text-anchor="middle" class="t-strong">Client</text>
<line x1="170" y1="30" x2="170" y2="50" class="ln" marker-end="url(#ah-asgi)"/>
<text x="178" y="44" class="t-mute">HTTPS</text>
<rect x="60" y="52" width="220" height="40" rx="6" class="bx"/>
<text x="170" y="68" text-anchor="middle" class="t-strong">Nginx / load balancer</text>
<text x="170" y="83" text-anchor="middle" class="t-mute">TLS · fișiere statice · buffering</text>
<line x1="170" y1="92" x2="170" y2="112" class="ln" marker-end="url(#ah-asgi)"/>
<text x="178" y="106" class="t-mute">HTTP</text>
<rect x="10" y="114" width="320" height="170" rx="8" class="bx-mute"/>
<text x="22" y="132" class="t-strong">Gunicorn · master (pre-fork)</text>
<text x="22" y="147" class="t-mute">pornește, monitorizează, repornește workerii</text>
<rect x="22" y="158" width="92" height="116" rx="6" class="bx"/>
<text x="68" y="175" text-anchor="middle" class="t-strong">Worker 1</text>
<text x="68" y="189" text-anchor="middle" class="t-mute">proces separat</text>
<rect x="30" y="197" width="76" height="26" rx="5" class="bx-acc"/>
<text x="68" y="214" text-anchor="middle">event loop</text>
<text x="68" y="243" text-anchor="middle" class="t-tiny">async def→loop</text>
<text x="68" y="257" text-anchor="middle" class="t-tiny">def→threadpool</text>
<rect x="124" y="158" width="92" height="116" rx="6" class="bx"/>
<text x="170" y="175" text-anchor="middle" class="t-strong">Worker 2</text>
<text x="170" y="189" text-anchor="middle" class="t-mute">proces separat</text>
<rect x="132" y="197" width="76" height="26" rx="5" class="bx-acc"/>
<text x="170" y="214" text-anchor="middle">event loop</text>
<text x="170" y="243" text-anchor="middle" class="t-tiny">async def→loop</text>
<text x="170" y="257" text-anchor="middle" class="t-tiny">def→threadpool</text>
<rect x="226" y="158" width="92" height="116" rx="6" class="bx"/>
<text x="272" y="175" text-anchor="middle" class="t-strong">Worker 3</text>
<text x="272" y="189" text-anchor="middle" class="t-mute">proces separat</text>
<rect x="234" y="197" width="76" height="26" rx="5" class="bx-acc"/>
<text x="272" y="214" text-anchor="middle">event loop</text>
<text x="272" y="243" text-anchor="middle" class="t-tiny">async def→loop</text>
<text x="272" y="257" text-anchor="middle" class="t-tiny">def→threadpool</text>
</svg>`
  };

  P.diagrams.celery = {
    cap: "Request-ul doar publică; brokerul păstrează munca până o confirmă un worker. Cu acks_late, ack-ul vine după execuție, deci un task poate rula de două ori: efectul trebuie să fie idempotent.",
    svg: `<svg class="dg" viewBox="0 0 340 330" role="img" aria-label="API-ul și Celery Beat publică task-uri în broker; brokerul le livrează workerilor, care confirmă după execuție, scriu în PostgreSQL și raportează statusul în result backend.">
${AH("ah-cel")}
<rect x="10" y="6" width="150" height="40" rx="6" class="bx"/>
<text x="85" y="22" text-anchor="middle" class="t-strong">API</text>
<text x="85" y="37" text-anchor="middle" class="t-mute">răspunde 202 + job_id</text>
<rect x="180" y="6" width="150" height="40" rx="6" class="bx"/>
<text x="255" y="22" text-anchor="middle" class="t-strong">Celery Beat</text>
<text x="255" y="37" text-anchor="middle" class="t-mute">un singur proces</text>
<line x1="85" y1="46" x2="85" y2="84" class="ln" marker-end="url(#ah-cel)"/>
<text x="92" y="69" class="t-mute">publică (JSON)</text>
<line x1="255" y1="46" x2="255" y2="84" class="ln" marker-end="url(#ah-cel)"/>
<text x="262" y="69" class="t-mute">programează</text>
<rect x="10" y="86" width="320" height="66" rx="8" class="bx-acc"/>
<text x="22" y="104" class="t-strong">Broker · RabbitMQ</text>
<rect x="22" y="114" width="140" height="28" rx="14" class="bx"/>
<text x="92" y="132" text-anchor="middle" class="t-mono">coada default</text>
<rect x="178" y="114" width="140" height="28" rx="14" class="bx"/>
<text x="248" y="132" text-anchor="middle" class="t-mono">coada heavy</text>
<line x1="230" y1="152" x2="230" y2="190" class="ln" marker-end="url(#ah-cel)"/>
<text x="237" y="175" class="t-mute">livrează</text>
<line x1="110" y1="190" x2="110" y2="154" class="ln-dash" marker-end="url(#ah-cel)"/>
<text x="117" y="175" class="t-mute">ack după execuție</text>
<rect x="10" y="192" width="320" height="64" rx="8" class="bx"/>
<text x="22" y="210" class="t-strong">Workeri Celery · pool prefork</text>
<rect x="22" y="220" width="92" height="26" rx="5" class="bx-mute"/>
<text x="68" y="237" text-anchor="middle" class="t-mono">proces 1</text>
<rect x="124" y="220" width="92" height="26" rx="5" class="bx-mute"/>
<text x="170" y="237" text-anchor="middle" class="t-mono">proces 2</text>
<rect x="226" y="220" width="92" height="26" rx="5" class="bx-mute"/>
<text x="272" y="237" text-anchor="middle" class="t-mono">proces 3</text>
<line x1="85" y1="256" x2="85" y2="288" class="ln" marker-end="url(#ah-cel)"/>
<text x="92" y="276" class="t-mute">scrie idempotent</text>
<line x1="255" y1="256" x2="255" y2="288" class="ln" marker-end="url(#ah-cel)"/>
<text x="249" y="276" text-anchor="end" class="t-mute">status</text>
<rect x="10" y="290" width="150" height="34" rx="6" class="bx"/>
<text x="85" y="311" text-anchor="middle" class="t-strong">PostgreSQL</text>
<rect x="180" y="290" width="150" height="34" rx="6" class="bx"/>
<text x="255" y="311" text-anchor="middle" class="t-strong">Result backend</text>
</svg>`
  };

  P.diagrams.sqlalchemy = {
    cap: "Ciclul de viață al unui obiect ORM. Commit-ul expiră atributele; după închiderea sesiunii obiectul e detached, iar o relație lazy nu se mai poate încărca.",
    svg: `<svg class="dg" viewBox="0 0 340 280" role="img" aria-label="Stările unui obiect SQLAlchemy: transient, pending după session.add, persistent după flush sau commit, detached după închiderea sesiunii; ramura delete duce la deleted.">
${AH("ah-sqa")}
<rect x="10" y="6" width="150" height="44" rx="6" class="bx"/>
<text x="85" y="24" text-anchor="middle" class="t-strong">Transient</text>
<text x="85" y="39" text-anchor="middle" class="t-mute">obiect nou, fără sesiune</text>
<line x1="85" y1="50" x2="85" y2="78" class="ln" marker-end="url(#ah-sqa)"/>
<text x="95" y="68" class="t-mono">session.add(obj)</text>
<rect x="10" y="80" width="150" height="44" rx="6" class="bx"/>
<text x="85" y="98" text-anchor="middle" class="t-strong">Pending</text>
<text x="85" y="113" text-anchor="middle" class="t-mute">în sesiune, încă fără SQL</text>
<line x1="85" y1="124" x2="85" y2="152" class="ln" marker-end="url(#ah-sqa)"/>
<text x="95" y="142" class="t-mono">flush() / commit()</text>
<rect x="10" y="154" width="150" height="44" rx="6" class="bx-acc"/>
<text x="85" y="172" text-anchor="middle" class="t-strong">Persistent</text>
<text x="85" y="187" text-anchor="middle" class="t-mute">rând în DB · identity map</text>
<line x1="85" y1="198" x2="85" y2="226" class="ln" marker-end="url(#ah-sqa)"/>
<text x="95" y="216" class="t-mono">session.close()</text>
<rect x="10" y="228" width="150" height="44" rx="6" class="bx"/>
<text x="85" y="246" text-anchor="middle" class="t-strong">Detached</text>
<text x="85" y="261" text-anchor="middle" class="t-mute">lazy load → eroare</text>
<rect x="200" y="150" width="130" height="50" rx="6" class="bx-mute"/>
<text x="212" y="167" class="t-mono">commit()</text>
<text x="212" y="181" class="t-mute">= flush + COMMIT</text>
<text x="212" y="194" class="t-mute">+ expiră atributele</text>
<line x1="160" y1="192" x2="262" y2="226" class="ln-dash" marker-end="url(#ah-sqa)"/>
<rect x="200" y="228" width="130" height="44" rx="6" class="bx"/>
<text x="265" y="246" text-anchor="middle" class="t-strong">Deleted</text>
<text x="265" y="261" text-anchor="middle" class="t-mono">delete() + flush</text>
</svg>`
  };

  P.diagrams.rabbitmq = {
    cap: "Mesajul cu cheia sap.prd.security ajunge în cozile ale căror pattern-uri se potrivesc (* = exact un cuvânt, # = zero sau mai multe). Un mesaj respins ajunge, prin dead letter exchange-ul cozii, într-o coadă separată.",
    svg: `<svg class="dg" viewBox="0 0 340 312" role="img" aria-label="Un producer publică cu cheia sap.prd.security într-un topic exchange; mesajul ajunge în cozile cu pattern-urile sap.*.security și sap.prd.#, nu și în coada cu #.audit; un mesaj respins ajunge în dead-letter.">
${AH("ah-rmq")}
<rect x="95" y="6" width="150" height="40" rx="6" class="bx"/>
<text x="170" y="22" text-anchor="middle" class="t-strong">Producer</text>
<text x="170" y="38" text-anchor="middle" class="t-mono">sap.prd.security</text>
<line x1="170" y1="46" x2="170" y2="68" class="ln" marker-end="url(#ah-rmq)"/>
<text x="178" y="61" class="t-mute">publish</text>
<rect x="70" y="70" width="200" height="40" rx="6" class="bx-acc"/>
<text x="170" y="87" text-anchor="middle" class="t-strong">Exchange · topic</text>
<text x="170" y="102" text-anchor="middle" class="t-mute">compară cheia cu bindings</text>
<line x1="140" y1="110" x2="58" y2="166" class="ln" marker-end="url(#ah-rmq)"/>
<line x1="170" y1="110" x2="170" y2="166" class="ln" marker-end="url(#ah-rmq)"/>
<line x1="200" y1="110" x2="282" y2="166" class="ln-dash"/>
<rect x="4" y="168" width="104" height="44" rx="6" class="bx"/>
<text x="56" y="186" text-anchor="middle" class="t-mono">security-detect</text>
<text x="56" y="203" text-anchor="middle" class="t-tiny">✓ sap.*.security</text>
<rect x="118" y="168" width="104" height="44" rx="6" class="bx"/>
<text x="170" y="186" text-anchor="middle" class="t-mono">prod-archive</text>
<text x="170" y="203" text-anchor="middle" class="t-tiny">✓ sap.prd.#</text>
<rect x="232" y="168" width="104" height="44" rx="6" class="bx-mute"/>
<text x="284" y="186" text-anchor="middle" class="t-mono">audit</text>
<text x="284" y="203" text-anchor="middle" class="t-tiny">✗ #.audit</text>
<text x="284" y="230" text-anchor="middle" class="t-mute">nu primește</text>
<line x1="56" y1="212" x2="56" y2="236" class="ln" marker-end="url(#ah-rmq)"/>
<text x="62" y="228" class="t-mute">ack</text>
<rect x="4" y="238" width="104" height="28" rx="6" class="bx"/>
<text x="56" y="256" text-anchor="middle">consumer A</text>
<line x1="170" y1="212" x2="170" y2="236" class="ln" marker-end="url(#ah-rmq)"/>
<text x="176" y="228" class="t-mute">ack</text>
<rect x="118" y="238" width="104" height="28" rx="6" class="bx"/>
<text x="170" y="256" text-anchor="middle">consumer B</text>
<line x1="56" y1="266" x2="56" y2="282" class="ln-dash" marker-end="url(#ah-rmq)"/>
<text x="62" y="279" class="t-mute">reject</text>
<rect x="4" y="284" width="104" height="24" rx="6" class="bx-mute"/>
<text x="56" y="300" text-anchor="middle" class="t-mono">dead-letter</text>
</svg>`
  };

  P.diagrams.design = {
    cap: "Fluxul de la colectori la alertă. Cozile decuplează etapele, starea ferestrelor stă în Redis, iar arhiva brută din S3 permite replay când apare o regulă nouă.",
    svg: `<svg class="dg" viewBox="0 0 340 490" role="img" aria-label="Pipeline de detecție: colectori, API de ingestie cu arhivă în S3, coadă de evenimente brute cu DLQ, normalizare, coadă rutată după system_id, detecție cu stare în Redis, alerte în PostgreSQL, apoi SIEM și consolă.">
${AH("ah-des")}
<rect x="10" y="6" width="200" height="40" rx="6" class="bx"/>
<text x="110" y="22" text-anchor="middle" class="t-strong">Colectori la client</text>
<text x="110" y="37" text-anchor="middle" class="t-mute">audit log · gateway · ICM</text>
<line x1="110" y1="46" x2="110" y2="68" class="ln" marker-end="url(#ah-des)"/>
<text x="118" y="61" class="t-mute">loturi, TLS</text>
<rect x="10" y="70" width="200" height="40" rx="6" class="bx"/>
<text x="110" y="86" text-anchor="middle" class="t-strong">API de ingestie</text>
<text x="110" y="101" text-anchor="middle" class="t-mute">validează · 202 · idempotent</text>
<line x1="210" y1="90" x2="228" y2="90" class="ln" marker-end="url(#ah-des)"/>
<rect x="230" y="70" width="100" height="40" rx="6" class="bx-mute"/>
<text x="280" y="86" text-anchor="middle" class="t-strong">S3</text>
<text x="280" y="101" text-anchor="middle" class="t-mute">arhivă, replay</text>
<line x1="110" y1="110" x2="110" y2="132" class="ln" marker-end="url(#ah-des)"/>
<text x="118" y="125" class="t-mute">publish</text>
<rect x="10" y="134" width="200" height="36" rx="18" class="bx-mute"/>
<text x="110" y="156" text-anchor="middle" class="t-mono">RabbitMQ · events.raw</text>
<line x1="210" y1="152" x2="228" y2="152" class="ln-dash" marker-end="url(#ah-des)"/>
<rect x="230" y="134" width="100" height="36" rx="6" class="bx-mute"/>
<text x="280" y="149" text-anchor="middle" class="t-strong">DLQ</text>
<text x="280" y="163" text-anchor="middle" class="t-mute">mesaje eșuate</text>
<line x1="110" y1="170" x2="110" y2="192" class="ln" marker-end="url(#ah-des)"/>
<text x="118" y="185" class="t-mute">consumă</text>
<rect x="10" y="194" width="200" height="40" rx="6" class="bx"/>
<text x="110" y="210" text-anchor="middle" class="t-strong">Normalizare · workeri</text>
<text x="110" y="225" text-anchor="middle" class="t-mute">schemă comună + îmbogățire</text>
<line x1="110" y1="234" x2="110" y2="256" class="ln" marker-end="url(#ah-des)"/>
<text x="118" y="249" class="t-mute">routing: system_id</text>
<rect x="10" y="258" width="200" height="36" rx="18" class="bx-mute"/>
<text x="110" y="280" text-anchor="middle" class="t-mono">RabbitMQ · events.norm</text>
<line x1="110" y1="294" x2="110" y2="316" class="ln" marker-end="url(#ah-des)"/>
<text x="118" y="309" class="t-mute">consumă</text>
<rect x="10" y="318" width="200" height="40" rx="6" class="bx-acc"/>
<text x="110" y="334" text-anchor="middle" class="t-strong">Detecție · workeri</text>
<text x="110" y="349" text-anchor="middle" class="t-mute">reguli ca module testate</text>
<line x1="212" y1="338" x2="228" y2="338" class="ln" marker-start="url(#ah-des)" marker-end="url(#ah-des)"/>
<rect x="230" y="318" width="100" height="40" rx="6" class="bx-mute"/>
<text x="280" y="334" text-anchor="middle" class="t-strong">Redis</text>
<text x="280" y="349" text-anchor="middle" class="t-mute">ferestre, dedupe</text>
<line x1="110" y1="358" x2="110" y2="380" class="ln" marker-end="url(#ah-des)"/>
<text x="118" y="373" class="t-mute">alertă</text>
<rect x="10" y="382" width="200" height="40" rx="6" class="bx"/>
<text x="110" y="398" text-anchor="middle" class="t-strong">Alerte · PostgreSQL</text>
<text x="110" y="413" text-anchor="middle" class="t-mute">partiționat · scriere idempotentă</text>
<line x1="100" y1="422" x2="62" y2="446" class="ln" marker-end="url(#ah-des)"/>
<line x1="120" y1="422" x2="158" y2="446" class="ln" marker-end="url(#ah-des)"/>
<rect x="10" y="448" width="95" height="36" rx="6" class="bx"/>
<text x="57" y="470" text-anchor="middle">SIEM client</text>
<rect x="115" y="448" width="95" height="36" rx="6" class="bx"/>
<text x="162" y="470" text-anchor="middle">Consolă GraphQL</text>
</svg>`
  };
})(window.PREP);
