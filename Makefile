.PHONY: folio.run folio.check folio.build folio.preview

folio.run folio.check folio.build folio.preview:
	@node scripts/local-workflow.mjs $(patsubst folio.%,%,$@)
