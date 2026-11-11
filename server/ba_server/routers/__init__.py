"""Ruterele serverului: câte un modul pe temă.

Cum adaugi unul (tichetele 06 `/ai`, 08 `/live-token`): un fișier nou în acest
director, cu un `router = APIRouter()`. `main.create_app` îl găsește singur și
îi pune secretul pe fiecare rută. Un ruter care trebuie să fie public (ca
`health`) declară `PUBLIC = True`. Codul evenimentelor nu se atinge.
"""
