import type { TranslationTree } from "../types";

export const de: TranslationTree = {
	common: {
		appName: "Canvas Bases",
		automatic: "Automatisch",
		cancel: "Abbrechen",
		close: "Schließen",
		card: {
			one: "{count} Karte",
			other: "{count} Karten"
		},
		group: {
			one: "{count} Gruppe",
			other: "{count} Gruppen"
		},
		languages: {
			en: "Englisch"
		},
		none: "Keine",
		note: {
			one: "{count} Notiz",
			other: "{count} Notizen"
		},
		off: "Aus",
		systemDefault: "Systemstandard"
	},
	commands: {
		createCanvasFromCurrentView: "Canvas aus aktueller Bases-Ansicht erstellen",
		createStarterFiles: "Startdateien erstellen",
		openLinkedCanvas: "Verknüpfte Canvas öffnen",
		updateLinkedCanvas: "Verknüpfte Canvas aktualisieren"
	},
	notices: {
		addedDependency: "Abhängigkeit hinzugefügt: {label}.",
		addedProjectRelationship: "Projektbeziehung hinzugefügt: {label}.",
		addedPropertyLink: "{property} hinzugefügt: {source} -> {target}.",
		activeGroupDisabled: "Zone entfernt: {label}.",
		activeGroupEnabled: "Zone aktiviert: {label}.",
		activeGroupReadOnly: "Diese Zone kann keine beschreibbare Notiz-Eigenschaft aktualisieren.",
		activeGroupTaskUpdateUnavailable: "TaskNotes kann diese Aufgaben-Eigenschaft nicht aus Canvas Bases aktualisieren.",
		activeGroupUpdated: "{property} auf {value} aktualisiert.",
		activeGroupActionRun: "Zonenaktion ausgeführt: {action}.",
		activeGroupActionNotTask: "Diese Zonenaktion funktioniert nur mit TaskNotes-Aufgaben.",
		activeGroupActionUnavailable: "Diese TaskNotes-Zonenaktion ist nicht verfügbar.",
		canvasBasesWaitingForBasesData: "Canvas Bases wartet auf Bases-Daten.",
		couldNotAddPropertyLink: "Eigenschafts-Link konnte nicht hinzugefügt werden: {message}",
		couldNotFind: "{path} konnte nicht gefunden werden.",
		couldNotRemovePropertyLink: "Eigenschafts-Link konnte nicht entfernt werden: {message}",
		couldNotUpdateActiveGroup: "Zonenwert konnte nicht aktualisiert werden: {message}",
		couldNotUpdateLink: "Link konnte nicht aktualisiert werden: {message}",
		languageChanged: "Sprache geändert zu {language}.",
		linkActionUnavailable: "Diese Link-Aktion ist für diese Notizen nicht verfügbar.",
		noLinkedCanvas: "{source} hat noch keine verknüpfte Canvas.",
		noVisibleLinkProperties: "Keine sichtbaren Notiz-Eigenschaften für Links verfügbar.",
		obsidianVersionRequired: "Canvas Bases erfordert Obsidian 1.10.2 oder neuer.",
		openCanvasBasesViewFirst: "Öffne zuerst eine Canvas Bases-Ansicht.",
		openBasesViewFirst: "Öffne zuerst eine Bases-Ansicht.",
		resolveInlineEditorConflict: "Löse den Konflikt im Inline-Editor, bevor du Links änderst.",
		removedDependency: "Abhängigkeit entfernt.",
		removedProjectRelationship: "Projektbeziehung entfernt.",
		removedPropertyLink: "{property}-Link entfernt.",
		chooseCanvasPath: "Wähle einen Canvas-Pfad.",
		chooseLinkProperty: "Wähle eine Notiz-Eigenschaft für diesen Link.",
		starterFilesBlocked: "Startdateien konnten nicht erstellt werden, weil ein Startpfad bereits von einer anderen Datei oder einem Ordner verwendet wird.",
		starterFilesReady: "Die Startdateien liegen in Canvas Bases/ bereit.",
		updatedCanvas: "{path} aktualisiert: {nodes} Knoten, {edges} Kanten."
	},
	settings: {
		defaults: {
			heading: "Standardwerte",
			canvasFolder: {
				name: "Standard-Canvas-Ordner",
				description: "Ordner, der verwendet wird, wenn eine Canvas Bases-Ansicht noch keinen Canvas-Pfad hat."
			},
			layout: {
				name: "Standardlayout",
				description: "Anfangslayout für neue Canvas-Snapshots."
			},
			edges: {
				name: "Standardkanten",
				description: "Anfängliche Kantenquelle für neue Canvas-Snapshots."
			},
			edgeProperties: {
				name: "Standard-Kanteneigenschaften",
				description: "Kommagetrennte Frontmatter-Eigenschaften, die verwendet werden, wenn Eigenschaftskanten aktiviert sind."
			},
			bodyEditor: {
				name: "Textkörper-Editor anzeigen",
				description: "Bearbeitbaren Notiz-Textkörper auf Live-Canvas Bases-Karten standardmäßig anzeigen."
			}
		},
		tasknotes: {
			heading: "TaskNotes",
			integration: {
				name: "TaskNotes-Integration",
				description: "Standard-TaskNotes-Verhalten für neue Canvas Bases-Ansichten."
			},
			badges: {
				name: "Aufgaben-Badges anzeigen",
				description: "TaskNotes-Status, Priorität, Fälligkeitsdaten und Blocker auf Live-Karten standardmäßig anzeigen."
			},
			actions: {
				name: "Aufgabenaktionen anzeigen",
				description: "Das TaskNotes-Aufgabenmenü standardmäßig aus den Kartenaktionen verwenden."
			},
			relationships: {
				name: "Aufgabenbeziehungs-Kanten",
				description: "Standard-TaskNotes-Beziehungskanten für generierte Canvases und Live-Boards."
			}
		},
		updateRules: {
			heading: "Aktualisierungsregeln",
			preservePositions: {
				name: "Positionen beibehalten",
				description: "Vorhandene Canvas Bases-Knotenpositionen beim Aktualisieren einer Canvas beibehalten."
			},
			removeMissingNotes: {
				name: "Fehlende Notizen entfernen",
				description: "Canvas Bases-Knoten entfernen, die nicht mehr im aktuellen Base-Ergebnis erscheinen."
			},
			nodeWidth: {
				name: "Knotenbreite",
				description: "Standardbreite für Canvas-Dateiknoten."
			},
			nodeHeight: {
				name: "Knotenhöhe",
				description: "Standardhöhe für Canvas-Dateiknoten."
			}
		},
		language: {
			heading: "Oberflächensprache",
			description: "Ändere die Sprache der Canvas Bases-Befehle, Einstellungen, Hinweise und Ansichten.",
			name: "UI-Sprache",
			dropdownDescription: "Wähle die Sprache für den Canvas Bases-Oberflächentext."
		}
	},
	options: {
		layout: {
			columns: "Gruppierte Spalten",
			rows: "Gruppierte Zeilen",
			grid: "Raster"
		},
		edgeMode: {
			wikilinks: "Links innerhalb der Ansicht",
			properties: "Ausgewählte Eigenschaften",
			all: "Links und ausgewählte Eigenschaften"
		},
		relationships: {
			dependencies: "Abhängigkeiten",
			all: "Abhängigkeiten und Unteraufgaben"
		}
	},
	tasknotes: {
		badges: {
			due: "Fällig",
			scheduled: "Geplant",
			recurrence: "Wiederholungen",
			recurring: "Wiederkehrend",
			blocked: "Blockiert",
			blocking: "Blockierend",
			subtasks: "Unteraufgaben",
			estimate: "Schätzung",
			tracked: "Verfolgt",
			tracking: "Zeiterfassung",
			active: "Aktiv"
		},
		relationships: {
			blocks: "blockiert",
			subtask: "Unteraufgabe"
		}
	},
	modal: {
		title: "Canvas aus Ansicht erstellen",
		canvasPath: {
			name: "Canvas-Pfad",
			description: "Vault-Pfad für die generierte JSON-Canvas-Datei."
		},
		layout: {
			name: "Anordnung",
			description: "Wie Base-Gruppen in der generierten Canvas angeordnet werden."
		},
		nodeSize: {
			name: "Knotengröße",
			description: "Breite und Höhe für neue Canvas-Dateiknoten.",
			width: "Breite",
			height: "Höhe"
		},
		edges: {
			name: "Kanten",
			description: "Kanten nur zeichnen, wenn beide Notizen im Base-Ergebnis enthalten sind."
		},
		linkProperties: {
			name: "Link-Eigenschaften",
			description: "Kommagetrennte Frontmatter-Eigenschaften, die für Eigenschaftskanten verwendet werden.",
			placeholder: "hängt_ab_von, verwandt"
		},
		taskRelationships: {
			name: "Aufgabenbeziehungs-Kanten",
			description: "Aufgabenbeziehungs-Kanten zur generierten Canvas hinzufügen."
		},
		preservePositions: {
			description: "Positionen für Canvas Bases-Knoten beibehalten, die bereits in der Canvas vorhanden sind."
		},
		createCanvas: "Canvas erstellen"
	},
	view: {
		waitingForBasesData: "Warten auf Bases-Daten",
		toolbar: {
			pinNote: "Notiz anheften",
			addCard: "Karte hinzufügen",
			addGroup: "Gruppe hinzufügen",
			addZone: "Zone hinzufügen",
			createCanvas: "Canvas erstellen",
			updateCanvas: "Canvas aktualisieren",
			openCanvas: "Canvas öffnen",
			resetLayout: "Layout zurücksetzen"
		},
		empty: {
			title: "Keine Notizen in dieser Ansicht",
			body: "Ändere die Base-Filter, hefte eine Notiz an oder füge eine Karte hinzu."
		},
		card: {
			pinned: "Angeheftet",
			noteActions: "Notizaktionen",
			textCardTitle: "Karte",
			cardActions: "Kartenaktionen",
			groupActions: "Gruppenaktionen",
			color: "Farbe",
			noteColor: "Notizfarbe",
			cardColor: "Kartenfarbe",
			editCard: "Karte bearbeiten",
			writeNote: "Notiz schreiben",
			linkFromNote: "Von dieser Notiz verknüpfen"
		},
		linkDrag: {
			releaseToLink: "Loslassen, um mit {target} zu verknüpfen",
			dragToCard: "Auf eine andere Notizkarte ziehen",
			cannotLinkHere: "Hier kann nicht verknüpft werden"
		},
		group: {
			active: "Zone",
			activeTitle: "Zuweisungszone",
			zoneTitle: "Zuweisungszone",
			label: "Bezeichnung",
			action: "Aktion beim Ablegen",
			actionSetProperty: "Eigenschaft aktualisieren",
			actionCompleteTask: "Aufgabe abschließen",
			actionUncompleteTask: "Aufgabe als unerledigt markieren",
			actionArchiveTask: "Aufgabe archivieren",
			actionUnarchiveTask: "Aufgabe aus Archiv holen",
			actionStartTimeTracking: "Zeiterfassung starten",
			actionStopTimeTracking: "Zeiterfassung stoppen",
			actionStartPomodoro: "Pomodoro starten",
			actionAssignPomodoro: "Aktuellem Pomodoro zuweisen",
			actionCompleteRecurring: "Wiederkehrendes Vorkommen abschließen",
			actionSkipRecurring: "Wiederkehrendes Vorkommen überspringen",
			property: "Eigenschaft",
			value: "Wert",
			updateMode: "Aktualisierungsmodus",
			valueType: "Werttyp",
			updateModeReplace: "Ersetzen",
			updateModeAppend: "Anhängen",
			updateModeAppendUnique: "Eindeutig anhängen",
			updateModeRemove: "Entfernen",
			updateModeClear: "Leeren",
			valueTypeAuto: "Automatisch",
			valueTypeString: "Text",
			valueTypeNumber: "Zahl",
			valueTypeBoolean: "Boolesch",
			valueTypeDate: "Datum",
			valueTypeList: "Liste",
			color: "Farbe",
			writeRule: "Schreibregel",
			groupRuleLocked: "Diese Zone folgt der aktuellen Base-Gruppe. Verwende eine benutzerdefinierte Zone, um eine andere Eigenschaft zu schreiben.",
			dropResult: "Ablageergebnis",
			previewWrite: "{mode}: {property} -> {value}.",
			previewClear: "{mode}: {property}.",
			previewAction: "{action}.",
			emptyValue: "leerer Wert",
			propertyRequired: "Vor dem Speichern eine Eigenschaft auswählen.",
			createTitle: "Gruppe erstellen",
			defaultName: "Gruppe",
			defaultZoneName: "Zone",
			create: "Erstellen",
			createZone: "Zone erstellen",
			renameTitle: "Gruppe umbenennen",
			rename: "Umbenennen",
			saveActiveGroup: "Zone speichern"
		},
		tooltips: {
			dragGroup: "Gruppe ziehen",
			resizeGroup: "Gruppengröße ändern",
			dragNote: "Notiz ziehen. Doppelklicken zum Öffnen.",
			resizeCard: "Kartengröße ändern",
			dragToLinkNotes: "Ziehen, um Notizen zu verknüpfen",
			dragCard: "Karte ziehen",
			zoomOut: "Verkleinern",
			zoomIn: "Vergrößern",
			fitView: "Ansicht einpassen",
			resetView: "Ansicht zurücksetzen"
		},
		menu: {
			openNote: "Notiz öffnen",
			unpinFromBoard: "Vom Board lösen",
			removeCard: "Karte entfernen",
			setCardColor: "Farbe festlegen",
			clearCardColor: "Farbe entfernen",
			createNote: "Neue Notiz erstellen",
			addPinnedNote: "Angeheftete Notiz hinzufügen",
			addCard: "Karte hinzufügen",
			activateGroup: "Als Zuweisungszone verwenden",
			configureActiveGroup: "Zone konfigurieren",
			deactivateActiveGroup: "Zone entfernen",
			renameGroup: "Gruppe umbenennen",
			removeGroup: "Gruppe entfernen",
			fitGroupToCards: "Gruppe an Karten anpassen",
			createGroupFromSelection: "Gruppe aus Auswahl erstellen",
			createZoneFromSelection: "Zone aus Auswahl erstellen",
			sourceBlocksTarget: "{source} blockiert {target}",
			targetBlocksSource: "{target} blockiert {source}",
			targetSubtaskOfSource: "{target} ist Unteraufgabe von {source}",
			sourceSubtaskOfTarget: "{source} ist Unteraufgabe von {target}",
			dependencyLinks: "Abhängigkeiten",
			subtaskLinks: "Unteraufgaben",
			propertyLinks: "Eigenschaftslinks",
			addPropertyLink: "{property} hinzufügen: {source} -> {target}",
			chooseProperty: "Eigenschaft wählen...",
			openPath: "{name} öffnen",
			removeDependency: "Abhängigkeit entfernen",
			removeProjectRelationship: "Projektbeziehung entfernen",
			removePropertyLink: "{property}-Link entfernen"
		},
		editor: {
			editPath: "{path} bearbeiten",
			loading: "Wird geladen",
			unsaved: "Nicht gespeichert",
			missingFile: "Fehlende Datei",
			missing: "Fehlend",
			unableToLoad: "Laden nicht möglich",
			error: "Fehler",
			saving: "Wird gespeichert",
			saved: "Gespeichert",
			fileChanged: "Datei wurde auf der Festplatte geändert. Speichern überschreibt; Esc lädt neu."
		},
		suggest: {
			propertyPlaceholder: "Wähle eine Notiz-Eigenschaft für den Link",
			noMatchingProperties: "Keine passenden Eigenschaften",
			notePlaceholder: "Notiz an dieses Board anheften",
			noMatchingNotes: "Keine passenden Notizen"
		}
	},
	basesOptions: {
		canvas: "Leinwand",
		canvasPath: "Canvas-Pfad",
		layout: "Anordnung",
		edges: "Kanten",
		linkProperties: "Link-Eigenschaften",
		cards: "Karten",
		showBodyEditor: "Textkörper-Editor anzeigen",
		tasknotes: "TaskNotes",
		tasknotesIntegration: "TaskNotes-Integration",
		showTaskBadges: "Aufgaben-Badges anzeigen",
		showTaskActions: "Aufgabenaktionen anzeigen",
		taskRelationshipEdges: "Aufgabenbeziehungs-Kanten",
		manualCards: "Manuelle Karten",
		pinnedNotes: "Angeheftete Notizen",
		updateRules: "Aktualisierungsregeln",
		preservePositions: "Positionen beibehalten",
		removeMissingNotes: "Fehlende Notizen entfernen",
		nodeWidth: "Knotenbreite",
		nodeHeight: "Knotenhöhe"
	}
};
