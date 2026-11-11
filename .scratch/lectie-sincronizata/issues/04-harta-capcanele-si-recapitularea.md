# 04: Harta, capcanele și recapitularea au cartonaș

**Parent:** `.scratch/lectie-sincronizata/spec.md`

**What to build:** deschiderea și încheierea lecției devin secvențe cu cartonaș. La prima bucată, cartonașul `harta` arată problema modulului și grupurile de puncte cât timp Jarvis le spune. La final, `capcane` arată formulările de evitat, apoi `recap` arată grupurile din hartă (fără hartă, ideea principală), din care Jarvis recapitulează. La reluarea dintr-o poziție, propoziția de recapitulare are cartonașul punctului amintit.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Ecranul nu mai arată „Jarvis începe lecția…” cât timp Jarvis spune harta.
- [ ] `recap` e o secvență separată de `capcane`, cu text scris de noi; modelul nu mai alcătuiește singur recapitularea.
- [ ] Lecția se încheie tot din aplicație, după ce `recap` s-a auzit până la capăt; „Sari” pe capcane se poartă ca azi.
- [ ] `tools/test_lesson.py` verifică `#jv-chunk` la hartă, capcane și recapitulare.

## Comments
