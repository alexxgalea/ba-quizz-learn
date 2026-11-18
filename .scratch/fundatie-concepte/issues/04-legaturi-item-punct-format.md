# 04: Legăturile item–punct: formatul, utilitarul și validarea, pe asyncio

**Parent:** `.scratch/fundatie-concepte/spec.md` (Legături item–punct)

**What to build:** câmpurile `pt` (grile, schelete, kata-uri) și `kp` (carduri orale), `tools/tagpoints.mjs <modul>` (propuneri cu `relRank`), regulile din `validate.mjs` și raportul de acoperire. Primul modul etichetat cap-coadă: `asyncio`. Evenimentele `answer` poartă `points`.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] `asyncio`: toate grilele, cardurile și scheletele au `pt` / `kp`, confirmate citind fiecare item.
- [ ] `validate.mjs`: eroare la index inexistent; avertisment la item fără câmp; raport pe modul (puncte fără grilă, puncte fără formă de producție).
- [ ] `updQ` / `updO` / `updX` / `updS` scriu `points` în eveniment.
- [ ] README: numărul corect de grile și de întrebări deschise; formatul nou documentat.
