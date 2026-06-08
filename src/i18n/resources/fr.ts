import type { TranslationTree } from "../types";

export const fr: TranslationTree = {
	common: {
		appName: "Baseboard",
		automatic: "Automatique",
		cancel: "Annuler",
		card: {
			one: "{count} carte",
			other: "{count} cartes"
		},
		group: {
			one: "{count} groupe",
			other: "{count} groupes"
		},
		languages: {
			en: "Anglais"
		},
		none: "Aucun",
		note: {
			one: "{count} note",
			other: "{count} notes"
		},
		off: "Désactivé",
		systemDefault: "Par défaut du système"
	},
	commands: {
		createCanvasFromCurrentView: "Créer un canevas à partir de la vue de bases actuelle",
		createStarterFiles: "Créer les fichiers de démarrage",
		openLinkedCanvas: "Ouvrir le canevas lié",
		updateLinkedCanvas: "Mettre à jour le canevas lié"
	},
	notices: {
		addedDependency: "Dépendance ajoutée : {label}.",
		addedProjectRelationship: "Relation de projet ajoutée : {label}.",
		addedPropertyLink: "{property} ajouté : {source} -> {target}.",
		baseboardWaitingForBasesData: "Baseboard attend les données de bases.",
		couldNotAddPropertyLink: "Impossible d'ajouter le lien de propriété : {message}",
		couldNotFind: "Impossible de trouver {path}.",
		couldNotRemovePropertyLink: "Impossible de supprimer le lien de propriété : {message}",
		couldNotUpdateLink: "Impossible de mettre à jour le lien : {message}",
		languageChanged: "Langue changée en {language}.",
		linkActionUnavailable: "Cette action de lien n'est pas disponible pour ces notes.",
		noLinkedCanvas: "{source} n'a pas encore de canevas lié.",
		noVisibleLinkProperties: "Aucune propriété de note visible n'est disponible pour les liens.",
		obsidianVersionRequired: "Baseboard nécessite Obsidian 1.10.1 ou plus récent.",
		openBaseboardViewFirst: "Ouvrez d'abord une vue baseboard.",
		openBasesViewFirst: "Ouvrez d'abord une vue de bases.",
		removedDependency: "Dépendance supprimée.",
		removedProjectRelationship: "Relation de projet supprimée.",
		removedPropertyLink: "Lien {property} supprimé.",
		chooseCanvasPath: "Choisissez un chemin de canevas.",
		chooseLinkProperty: "Choisissez une propriété de note pour ce lien.",
		starterFilesBlocked: "Impossible de créer les fichiers de démarrage, car un chemin de démarrage est déjà utilisé par un autre fichier ou dossier.",
		starterFilesReady: "Les fichiers de démarrage sont prêts dans Baseboard/.",
		updatedCanvas: "{path} mis à jour : {nodes} nœuds, {edges} arêtes."
	},
	settings: {
		defaults: {
			heading: "Valeurs par défaut",
			canvasFolder: {
				name: "Dossier de canevas par défaut",
				description: "Dossier utilisé lorsqu'une vue baseboard n'a pas encore de chemin de canevas."
			},
			layout: {
				name: "Disposition par défaut",
				description: "Disposition initiale utilisée pour les nouveaux instantanés de canevas."
			},
			edges: {
				name: "Arêtes par défaut",
				description: "Source d'arête initiale pour les nouveaux instantanés de canevas."
			},
			edgeProperties: {
				name: "Propriétés d'arête par défaut",
				description: "Propriétés de frontmatter séparées par des virgules utilisées lorsque les arêtes de propriété sont activées."
			},
			bodyEditor: {
				name: "Afficher l'éditeur de corps",
				description: "Afficher par défaut le texte modifiable du corps de la note sur les cartes baseboard en direct."
			}
		},
		tasknotes: {
			heading: "TaskNotes",
			integration: {
				name: "Intégration TaskNotes",
				description: "Comportement TaskNotes par défaut pour les nouvelles vues baseboard."
			},
			badges: {
				name: "Afficher les badges de tâche",
				description: "Afficher par défaut le statut TaskNotes, la priorité, les dates d'échéance et les bloqueurs sur les cartes en direct."
			},
			actions: {
				name: "Afficher les actions de tâche",
				description: "Utiliser par défaut le menu de tâches TaskNotes depuis les actions de la carte."
			},
			relationships: {
				name: "Arêtes de relation entre tâches",
				description: "Arêtes de relation TaskNotes par défaut pour les canevas générés et les tableaux en direct."
			}
		},
		updateRules: {
			heading: "Règles de mise à jour",
			preservePositions: {
				name: "Conserver les positions",
				description: "Conserver les positions existantes des nœuds baseboard lors de la mise à jour d'un canevas."
			},
			removeMissingNotes: {
				name: "Supprimer les notes manquantes",
				description: "Supprimer les nœuds baseboard qui n'apparaissent plus dans le résultat de base actuel."
			},
			nodeWidth: {
				name: "Largeur du nœud",
				description: "Largeur par défaut des nœuds de fichier du canevas."
			},
			nodeHeight: {
				name: "Hauteur du nœud",
				description: "Hauteur par défaut des nœuds de fichier du canevas."
			}
		},
		language: {
			heading: "Langue de l'interface",
			description: "Changer la langue des commandes, paramètres, notifications et vues de Baseboard.",
			name: "Langue de l'interface",
			dropdownDescription: "Sélectionnez la langue utilisée pour le texte de l'interface Baseboard."
		}
	},
	options: {
		layout: {
			columns: "Colonnes groupées",
			rows: "Lignes groupées",
			grid: "Grille"
		},
		edgeMode: {
			wikilinks: "Liens dans la vue",
			properties: "Propriétés sélectionnées",
			all: "Liens et propriétés sélectionnées"
		},
		relationships: {
			dependencies: "Dépendances",
			all: "Dépendances et sous-tâches"
		}
	},
	tasknotes: {
		badges: {
			due: "Échéance",
			scheduled: "Planifié",
			recurrence: "Répétitions",
			recurring: "Récurrent",
			blocked: "Bloqué",
			blocking: "Bloquant",
			subtasks: "Sous-tâches",
			estimate: "Estimation",
			tracked: "Suivi"
		},
		relationships: {
			blocks: "bloque",
			subtask: "sous-tâche"
		}
	},
	modal: {
		title: "Créer un canevas à partir de la vue",
		canvasPath: {
			name: "Chemin du canevas",
			description: "Chemin du coffre pour le fichier de canevas JSON généré."
		},
		layout: {
			name: "Disposition",
			description: "Comment les groupes de base sont disposés dans le canevas généré."
		},
		nodeSize: {
			name: "Taille du nœud",
			description: "Largeur et hauteur des nouveaux nœuds de fichier de canevas.",
			width: "Largeur",
			height: "Hauteur"
		},
		edges: {
			name: "Arêtes",
			description: "Dessiner les arêtes uniquement lorsque les deux notes sont dans ce résultat de base."
		},
		linkProperties: {
			name: "Propriétés de lien",
			description: "Propriétés de frontmatter séparées par des virgules utilisées pour les arêtes de propriété.",
			placeholder: "depend_de, lie"
		},
		taskRelationships: {
			name: "Arêtes de relation entre tâches",
			description: "Ajouter les arêtes de relation entre tâches au canevas généré."
		},
		preservePositions: {
			description: "Conserver les positions des nœuds baseboard déjà présents dans le canevas."
		},
		createCanvas: "Créer un canevas"
	},
	view: {
		waitingForBasesData: "En attente des données de bases",
		toolbar: {
			pinNote: "Épingler la note",
			addCard: "Ajouter une carte",
			addGroup: "Ajouter un groupe",
			createCanvas: "Créer un canevas",
			updateCanvas: "Mettre à jour le canevas",
			openCanvas: "Ouvrir le canevas",
			resetLayout: "Réinitialiser la disposition"
		},
		empty: {
			title: "Aucune note dans cette vue",
			body: "Modifiez les filtres de la base, épinglez une note ou ajoutez une carte."
		},
		card: {
			pinned: "Épinglé",
			noteActions: "Actions de la note",
			textCardTitle: "Carte",
			cardActions: "Actions de la carte",
			groupActions: "Actions du groupe",
			editCard: "Modifier la carte",
			writeNote: "Écrire une note",
			linkFromNote: "Lier depuis cette note"
		},
		group: {
			createTitle: "Créer un groupe",
			defaultName: "Groupe",
			create: "Créer",
			renameTitle: "Renommer le groupe",
			rename: "Renommer"
		},
		tooltips: {
			dragGroup: "Déplacer le groupe",
			resizeGroup: "Redimensionner le groupe",
			dragNote: "Déplacez la note. Double-cliquez pour ouvrir.",
			resizeCard: "Redimensionner la carte",
			dragToLinkNotes: "Glisser pour lier les notes",
			dragCard: "Déplacer la carte",
			zoomOut: "Zoom arrière",
			zoomIn: "Zoom avant",
			fitView: "Ajuster la vue",
			resetView: "Réinitialiser la vue"
		},
		menu: {
			openNote: "Ouvrir la note",
			unpinFromBoard: "Désépingler du tableau",
			removeCard: "Supprimer la carte",
			renameGroup: "Renommer le groupe",
			removeGroup: "Supprimer le groupe",
			sourceBlocksTarget: "{source} bloque {target}",
			targetBlocksSource: "{target} bloque {source}",
			targetSubtaskOfSource: "{target} est une sous-tâche de {source}",
			sourceSubtaskOfTarget: "{source} est une sous-tâche de {target}",
			addPropertyLink: "Ajouter {property} : {source} -> {target}",
			chooseProperty: "Choisir une propriété...",
			openPath: "Ouvrir {name}",
			removeDependency: "Supprimer la dépendance",
			removeProjectRelationship: "Supprimer la relation de projet",
			removePropertyLink: "Supprimer le lien {property}"
		},
		editor: {
			editPath: "Modifier {path}",
			loading: "Chargement",
			unsaved: "Non enregistré",
			missingFile: "Fichier manquant",
			missing: "Manquant",
			unableToLoad: "Impossible de charger",
			error: "Erreur",
			saving: "Enregistrement",
			saved: "Enregistré"
		},
		suggest: {
			propertyPlaceholder: "Choisissez une propriété de note pour le lien",
			noMatchingProperties: "Aucune propriété correspondante",
			notePlaceholder: "Épingler une note à ce tableau",
			noMatchingNotes: "Aucune note correspondante"
		}
	},
	basesOptions: {
		canvas: "Canevas",
		canvasPath: "Chemin du canevas",
		layout: "Disposition",
		edges: "Arêtes",
		linkProperties: "Propriétés de lien",
		cards: "Cartes",
		showBodyEditor: "Afficher l'éditeur de corps",
		tasknotes: "TaskNotes",
		tasknotesIntegration: "Intégration TaskNotes",
		showTaskBadges: "Afficher les badges de tâche",
		showTaskActions: "Afficher les actions de tâche",
		taskRelationshipEdges: "Arêtes de relation entre tâches",
		manualCards: "Cartes manuelles",
		pinnedNotes: "Notes épinglées",
		updateRules: "Règles de mise à jour",
		preservePositions: "Conserver les positions",
		removeMissingNotes: "Supprimer les notes manquantes",
		nodeWidth: "Largeur du nœud",
		nodeHeight: "Hauteur du nœud"
	}
};
