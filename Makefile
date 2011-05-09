SHELL = /bin/sh
PROJECT_FOLDER = pagerank-client@koeniglich.ch

all: xpi

xpi:
	@echo "Creating XPI file..."
	@cd $(PROJECT_FOLDER) && zip -r ../$(PROJECT_FOLDER).xpi install.rdf chrome.manifest chrome/* defaults/preferences/* -x "*/.*"
	@echo "done"
	
clean:
	rm $(PROJECT_FOLDER).xpi
