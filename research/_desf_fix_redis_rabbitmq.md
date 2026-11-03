## Corecturi după review: `redis` și `rabbitmq` (tichetul 17; verificat 3 noiembrie 2026)

De adăugat la secțiunea 34 (`rabbitmq`):

- ✅ **`global` la `basic.qos`** (https://www.rabbitmq.com/docs/consumer-prefetch): „Global (per-channel) QoS prefetch is deprecated and disabled by default starting with RabbitMQ 4.3. Use per-consumer prefetch instead.” Pagina nu pomenește quorum queues. Desfășurarea 4 nu mai vorbește despre `global`; spune doar că limita se aplică fiecărui consumator.
- ⚠️ **Prefetch mare**: „o valoare mare poate crește debitul, dar lasă mai multe mesaje să aștepte la consumator” rămâne un raționament (formulat cu „poate”), nu un citat din documentație.
- ⚠️ **`delivery-limit` în exemplul 7**: simularea (limita 3, ieșire după a treia încercare) e ilustrativă; nu s-a rulat un broker, deci numărătoarea exactă (de câte ori e „redelivered” față de limită) nu e afirmată.
- ✅ **DLX prin policy**: documentația recomandă policy; argumentele `x-dead-letter-exchange` din cod merg, dar nu se pot schimba fără redeploy (secțiunea 13 și https://www.rabbitmq.com/docs/dlx). Desfășurarea spune acum „se recomandă policy”.
- **Fără C++ la `rabbitmq`** (comparația `std::queue` + `std::mutex` + `std::condition_variable` de la punctul 1 a fost scoasă: o coadă în proces nu are exchange, routing, ack sau persistență). Secțiunea 34, ultima intrare („C++ (punctul 1)”), se șterge. `rabbitmq` rămâne fără C++, iar `redis` doar cu punctul 1.

De adăugat la secțiunea 33 (`redis`): niciun fapt nou. Rezultatele din blocurile `text` (punctele 2, 3, 9) sunt ieșirea reală a `redis-cli` (7.0.15); cursorul 5 de la `SCAN` e ilustrativ (depinde de tabela de hash).
