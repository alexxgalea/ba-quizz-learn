# 06: Mut și Vorbește

**Parent:** `.scratch/lectie-live/spec.md`

**What to build:** butonul Mut închide microfonul pentru Jarvis: fereastra de ascultare dispare, iar bucățile curg una după alta fără pauze. Singura excepție e butonul Vorbește, ținut apăsat: cât e apăsat, redarea se oprește ca la o întrebare, microfonul se deschide, iar la eliberare serverul detectează sfârșitul turei, Jarvis răspunde și revine la lecție. Mut-ul se ține minte între sesiuni, cu setările Jarvis din stocarea locală, nu în starea de progres. Pe Mut, Jarvis nu mai spune „poți să mă oprești oricând”. Poarta microfonului stă în modulul de apel, lângă logica existentă pentru „Întrerupere doar cu căști”.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] Pe Mut, microfonul nu trimite sunet decât cât e ținut apăsat Vorbește (teste pentru apel și pentru Jarvis).
- [ ] Pe Mut nu se deschide fereastra de ascultare și nu se redă sunetul ei; bucățile se înlănțuie.
- [ ] Apăsarea pe Vorbește oprește redarea și deschide microfonul; eliberarea trimite sfârșitul turei și lecția revine după răspuns.
- [ ] Setarea Mut se păstrează între sesiuni, în stocarea setărilor Jarvis, și nu apare în starea de progres, în export sau în brief.
- [ ] Pauza, Repetă, Sari și Gata merg la fel pe Mut.
- [ ] Instrucțiunile de sistem pe Mut nu mai menționează că poate fi oprit prin voce.
- [ ] Butoanele Mut și Vorbește sunt mari și ușor de atins cu o mână, la 360 px, în light și dark.
