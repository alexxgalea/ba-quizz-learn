# Lecția e o sesiune Gemini Live, nu audio generat dinainte

Lecția, ascultată mai ales în metrou, rulează ca sesiune Jarvis pe Gemini Live, care explică fișa bucată cu bucată în timp real. Nu e un fișier audio generat dinainte și salvat offline. Am ales-o ca Alex să poată întreba „de ce?” și să dea comenzi („repetă”, „mai simplu”) în mijlocul lecției, iar codul să refolosească sesiunea, vocea și persona Jarvis care există deja.

## Considered Options

- **Audio generat dinainte** (Gemini scrie lecția, apoi TTS, apoi salvare în service worker): merge și în tunel, fără semnal, dar fără întrebări și comenzi vocale, și cu o conductă nouă de generare și stocare.

## Consequences

- În tunel, fără semnal, lecția se oprește. Se reconectează singură (reîncercări până la ~60 s) și reia bucata întreruptă. Dacă proba din metrou arată că semnalul pică prea des, varianta offline revine pe masă.
- Fiecare lecție consumă din limita zilnică a nivelului gratuit Live, care nu e publicată.
