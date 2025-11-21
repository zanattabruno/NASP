APP_DIR := nasp
POETRY := cd $(APP_DIR) && poetry

.PHONY: run install shell clean

# Install project dependencies via Poetry
install:
	$(POETRY) install

# Run the NASP Flask app in debug mode
run:
	$(POETRY) run flask run --debug

# Drop into a Poetry shell for ad-hoc commands
shell:
	$(POETRY) shell

# Remove Poetry artifacts
clean:
	$(POETRY) env remove --all 2>/dev/null || true
