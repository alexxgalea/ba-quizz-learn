.PHONY: install test deploy secret run smoke

install:
	python3 -m pip install -r requirements-dev.txt

test:
	python3 -m pytest -q

# Un secret nou, de 43 de caractere. Se arată o singură dată; nu îl pune în repo.
secret:
	@python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Lansare cu o comandă: BA_SECRET=... make deploy
deploy:
	bash ./deploy.sh

# Rulare locală pe depozit în memorie: APP_SECRET=... make run
run:
	python3 -m uvicorn --factory --port 8080 ba_server.local:make_app

# Test de fum pe adresa lansată: URL=https://....lambda-url...on.aws BA_SECRET=... make smoke
smoke:
	@curl -fsS "$$URL/health" && echo
	@curl -sS -o /dev/null -w "fără secret: %{http_code} (așteptat 401)\n" "$$URL/events"
	@curl -fsS -H "Authorization: Bearer $$BA_SECRET" "$$URL/events?limit=1" && echo
