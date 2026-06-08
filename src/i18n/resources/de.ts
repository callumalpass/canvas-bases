import type { TranslationTree } from "../types";

export const de: TranslationTree = {
	common: {
		appName: "Baseboard",
		automatic: "Automatisch",
		cancel: "Abbrechen",
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
		openLinkedCanvas: "Verknüpfte Canvas öffnen",
		updateLinkedCanvas: "Verknüpfte Canvas aktualisieren"
	},
	notices: {
		addedDependency: "Abhängigkeit hinzugefügt: {label}.",
		addedProjectRelationship: "Projektbeziehung hinzugefügt: {label}.",
		addedPropertyLink: "{property} hinzugefügt: {source} -> {target}.",
		baseboardWaitingForBasesData: "Baseboard wartet auf Bases-Daten.",
		couldNotAddPropertyLink: "Eigenschafts-Link konnte nicht hinzugefügt werden: {message}",
		couldNotFind: "{path} konnte nicht gefunden werden.",
		couldNotRemovePropertyLink: "Eigenschafts-Link konnte nicht entfernt werden: {message}",
		couldNotUpdateLink: "Link konnte nicht aktualisiert werden: {message}",
		languageChanged: "Sprache geändert zu {language}.",
		linkActionUnavailable: "Diese Link-Aktion ist für diese Notizen nicht verfügbar.",
		noLinkedCanvas: "{source} hat noch keine verknüpfte Canvas.",
		noVisibleLinkProperties: "Keine sichtbaren Notiz-Eigenschaften für Links verfügbar.",
		obsidianVersionRequired: "Baseboard erfordert Obsidian 1.10.1 oder neuer.",
		openBaseboardViewFirst: "Öffne zuerst eine Baseboard-Ansicht.",
		openBasesViewFirst: "Öffne zuerst eine Bases-Ansicht.",
		removedDependency: "Abhängigkeit entfernt.",
		removedProjectRelationship: "Projektbeziehung entfernt.",
		removedPropertyLink: "{property}-Link entfernt.",
		chooseCanvasPath: "Wähle einen Canvas-Pfad.",
		chooseLinkProperty: "Wähle eine Notiz-Eigenschaft für diesen Link.",
		updatedCanvas: "{path} aktualisiert: {nodes} Knoten, {edges} Kanten."
	},
	settings: {
		defaults: {
			heading: "Standardwerte",
			canvasFolder: {
				name: "Standard-Canvas-Ordner",
				description: "Ordner, der verwendet wird, wenn eine Baseboard-Ansicht noch keinen Canvas-Pfad hat."
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
				description: "Bearbeitbaren Notiz-Textkörper auf Live-Baseboard-Karten standardmäßig anzeigen."
			}
		},
		tasknotes: {
			heading: "TaskNotes",
			integration: {
				name: "TaskNotes-Integration",
				description: "Standard-TaskNotes-Verhalten für neue Baseboard-Ansichten."
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
				description: "Vorhandene Baseboard-Knotenpositionen beim Aktualisieren einer Canvas beibehalten."
			},
			removeMissingNotes: {
				name: "Fehlende Notizen entfernen",
				description: "Baseboard-Knoten entfernen, die nicht mehr im aktuellen Base-Ergebnis erscheinen."
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
			description: "Ändere die Sprache der Baseboard-Befehle, Einstellungen, Hinweise und Ansichten.",
			name: "UI-Sprache",
			dropdownDescription: "Wähle die Sprache für den Baseboard-Oberflächentext."
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
			tracked: "Verfolgt"
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
			description: "Positionen für Baseboard-Knoten beibehalten, die bereits in der Canvas vorhanden sind."
		},
		createCanvas: "Canvas erstellen"
	},
	view: {
		waitingForBasesData: "Warten auf Bases-Daten",
		toolbar: {
			pinNote: "Notiz anheften",
			addCard: "Karte hinzufügen",
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
			editCard: "Karte bearbeiten",
			writeNote: "Notiz schreiben",
			linkFromNote: "Von dieser Notiz verknüpfen"
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
			sourceBlocksTarget: "{source} blockiert {target}",
			targetBlocksSource: "{target} blockiert {source}",
			targetSubtaskOfSource: "{target} ist Unteraufgabe von {source}",
			sourceSubtaskOfTarget: "{source} ist Unteraufgabe von {target}",
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
			saved: "Gespeichert"
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
