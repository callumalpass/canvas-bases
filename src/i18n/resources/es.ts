import type { TranslationTree } from "../types";

export const es: TranslationTree = {
	common: {
		appName: "Baseboard",
		automatic: "Automático",
		cancel: "Cancelar",
		card: {
			one: "{count} tarjeta",
			other: "{count} tarjetas"
		},
		group: {
			one: "{count} grupo",
			other: "{count} grupos"
		},
		languages: {
			en: "Inglés"
		},
		none: "Ninguno",
		note: {
			one: "{count} nota",
			other: "{count} notas"
		},
		off: "Desactivado",
		systemDefault: "Predeterminado del sistema"
	},
	commands: {
		createCanvasFromCurrentView: "Crear lienzo a partir de la vista de bases actual",
		createStarterFiles: "Crear archivos iniciales",
		openLinkedCanvas: "Abrir lienzo vinculado",
		updateLinkedCanvas: "Actualizar lienzo vinculado"
	},
	notices: {
		addedDependency: "Dependencia añadida: {label}.",
		addedProjectRelationship: "Relación de proyecto añadida: {label}.",
		addedPropertyLink: "Añadido {property}: {source} -> {target}.",
		baseboardWaitingForBasesData: "Baseboard está esperando datos de bases.",
		couldNotAddPropertyLink: "No se pudo añadir el enlace de propiedad: {message}",
		couldNotFind: "No se pudo encontrar {path}.",
		couldNotRemovePropertyLink: "No se pudo eliminar el enlace de propiedad: {message}",
		couldNotUpdateLink: "No se pudo actualizar el enlace: {message}",
		languageChanged: "Idioma cambiado a {language}.",
		linkActionUnavailable: "Esa acción de enlace no está disponible para estas notas.",
		noLinkedCanvas: "{source} aún no tiene un lienzo vinculado.",
		noVisibleLinkProperties: "No hay propiedades de nota visibles disponibles para enlaces.",
		obsidianVersionRequired: "Baseboard requiere Obsidian 1.10.1 o más reciente.",
		openBaseboardViewFirst: "Abre primero una vista de baseboard.",
		openBasesViewFirst: "Abre primero una vista de bases.",
		removedDependency: "Dependencia eliminada.",
		removedProjectRelationship: "Relación de proyecto eliminada.",
		removedPropertyLink: "Enlace de {property} eliminado.",
		chooseCanvasPath: "Elige una ruta de lienzo.",
		chooseLinkProperty: "Elige una propiedad de nota para este enlace.",
		starterFilesBlocked: "No se pudieron crear los archivos iniciales porque una ruta inicial ya la usa otro archivo o carpeta.",
		starterFilesReady: "Los archivos iniciales están listos en Baseboard/.",
		updatedCanvas: "Actualizado {path}: {nodes} nodos, {edges} aristas."
	},
	settings: {
		defaults: {
			heading: "Valores predeterminados",
			canvasFolder: {
				name: "Carpeta de lienzo predeterminada",
				description: "Carpeta usada cuando una vista de baseboard aún no tiene ruta de lienzo."
			},
			layout: {
				name: "Diseño predeterminado",
				description: "Diseño inicial usado para nuevas instantáneas de lienzo."
			},
			edges: {
				name: "Aristas predeterminadas",
				description: "Fuente inicial de aristas para nuevas instantáneas de lienzo."
			},
			edgeProperties: {
				name: "Propiedades de arista predeterminadas",
				description: "Propiedades de frontmatter separadas por comas usadas cuando las aristas de propiedad están activadas."
			},
			bodyEditor: {
				name: "Mostrar editor del cuerpo",
				description: "Mostrar el texto editable del cuerpo de la nota en las tarjetas de baseboard en vivo de forma predeterminada."
			}
		},
		tasknotes: {
			heading: "TaskNotes",
			integration: {
				name: "Integración con TaskNotes",
				description: "Comportamiento predeterminado de TaskNotes para las nuevas vistas de baseboard."
			},
			badges: {
				name: "Mostrar insignias de tarea",
				description: "Mostrar el estado, prioridad, fechas de vencimiento y bloqueadores de TaskNotes en las tarjetas en vivo de forma predeterminada."
			},
			actions: {
				name: "Mostrar acciones de tarea",
				description: "Usar el menú de tareas de TaskNotes desde las acciones de tarjeta de forma predeterminada."
			},
			relationships: {
				name: "Aristas de relación de tareas",
				description: "Aristas de relación de TaskNotes predeterminadas para lienzos generados y tableros en vivo."
			}
		},
		updateRules: {
			heading: "Reglas de actualización",
			preservePositions: {
				name: "Conservar posiciones",
				description: "Mantener las posiciones existentes de los nodos de baseboard al actualizar un lienzo."
			},
			removeMissingNotes: {
				name: "Eliminar notas faltantes",
				description: "Eliminar los nodos de baseboard que ya no aparecen en el resultado de base actual."
			},
			nodeWidth: {
				name: "Anchura del nodo",
				description: "Anchura predeterminada del nodo de archivo en el lienzo."
			},
			nodeHeight: {
				name: "Altura del nodo",
				description: "Altura predeterminada del nodo de archivo en el lienzo."
			}
		},
		language: {
			heading: "Idioma de la interfaz",
			description: "Cambia el idioma de los comandos, ajustes, avisos y vistas de Baseboard.",
			name: "Idioma de la interfaz",
			dropdownDescription: "Selecciona el idioma usado para el texto de la interfaz de Baseboard."
		}
	},
	options: {
		layout: {
			columns: "Columnas agrupadas",
			rows: "Filas agrupadas",
			grid: "Cuadrícula"
		},
		edgeMode: {
			wikilinks: "Enlaces dentro de la vista",
			properties: "Propiedades seleccionadas",
			all: "Enlaces y propiedades seleccionadas"
		},
		relationships: {
			dependencies: "Dependencias",
			all: "Dependencias y subtareas"
		}
	},
	tasknotes: {
		badges: {
			due: "Vencimiento",
			scheduled: "Programado",
			recurrence: "Se repite",
			recurring: "Recurrente",
			blocked: "Bloqueado",
			blocking: "Bloqueando",
			subtasks: "Subtareas",
			estimate: "Estimación",
			tracked: "Registrado"
		},
		relationships: {
			blocks: "bloquea",
			subtask: "subtarea"
		}
	},
	modal: {
		title: "Crear lienzo desde la vista",
		canvasPath: {
			name: "Ruta del lienzo",
			description: "Ruta del vault para el archivo JSON de lienzo generado."
		},
		layout: {
			name: "Diseño",
			description: "Cómo se organizan los grupos de base en el lienzo generado."
		},
		nodeSize: {
			name: "Tamaño del nodo",
			description: "Anchura y altura para los nuevos nodos de archivo del lienzo.",
			width: "Anchura",
			height: "Altura"
		},
		edges: {
			name: "Aristas",
			description: "Dibujar aristas solo cuando ambas notas estén en este resultado de base."
		},
		linkProperties: {
			name: "Propiedades de enlace",
			description: "Propiedades de frontmatter separadas por comas usadas para las aristas de propiedad.",
			placeholder: "Depende_de, relacionado"
		},
		taskRelationships: {
			name: "Aristas de relación de tareas",
			description: "Añadir aristas de relación de tareas al lienzo generado."
		},
		preservePositions: {
			description: "Mantener las posiciones de los nodos de baseboard ya presentes en el lienzo."
		},
		createCanvas: "Crear lienzo"
	},
	view: {
		waitingForBasesData: "Esperando datos de Bases",
		toolbar: {
			pinNote: "Fijar nota",
			addCard: "Añadir tarjeta",
			addGroup: "Añadir grupo",
			createCanvas: "Crear lienzo",
			updateCanvas: "Actualizar lienzo",
			openCanvas: "Abrir lienzo",
			resetLayout: "Restablecer diseño"
		},
		empty: {
			title: "No hay notas en esta vista",
			body: "Cambia los filtros de Base, fija una nota o añade una tarjeta."
		},
		card: {
			pinned: "Fijado",
			noteActions: "Acciones de nota",
			textCardTitle: "Tarjeta",
			cardActions: "Acciones de tarjeta",
			groupActions: "Acciones del grupo",
			editCard: "Editar tarjeta",
			writeNote: "Escribir una nota",
			linkFromNote: "Enlazar desde esta nota"
		},
		group: {
			createTitle: "Crear grupo",
			defaultName: "Grupo",
			create: "Crear",
			renameTitle: "Renombrar grupo",
			rename: "Renombrar"
		},
		tooltips: {
			dragGroup: "Arrastrar grupo",
			resizeGroup: "Redimensionar grupo",
			dragNote: "Arrastra la nota. Haz doble clic para abrir.",
			resizeCard: "Redimensionar tarjeta",
			dragToLinkNotes: "Arrastra para enlazar notas",
			dragCard: "Arrastrar tarjeta",
			zoomOut: "Alejar",
			zoomIn: "Acercar",
			fitView: "Ajustar vista",
			resetView: "Restablecer vista"
		},
		menu: {
			openNote: "Abrir nota",
			unpinFromBoard: "Desfijar del tablero",
			removeCard: "Eliminar tarjeta",
			renameGroup: "Renombrar grupo",
			removeGroup: "Eliminar grupo",
			createGroupFromSelection: "Crear grupo a partir de la selección",
			sourceBlocksTarget: "{source} bloquea a {target}",
			targetBlocksSource: "{target} bloquea a {source}",
			targetSubtaskOfSource: "{target} es subtarea de {source}",
			sourceSubtaskOfTarget: "{source} es subtarea de {target}",
			addPropertyLink: "Añadir {property}: {source} -> {target}",
			chooseProperty: "Elegir propiedad...",
			openPath: "Abrir {name}",
			removeDependency: "Eliminar dependencia",
			removeProjectRelationship: "Eliminar relación de proyecto",
			removePropertyLink: "Eliminar enlace de {property}"
		},
		editor: {
			editPath: "Editar {path}",
			loading: "Cargando",
			unsaved: "Sin guardar",
			missingFile: "Archivo faltante",
			missing: "Faltante",
			unableToLoad: "No se puede cargar",
			error: "Error",
			saving: "Guardando",
			saved: "Guardado"
		},
		suggest: {
			propertyPlaceholder: "Elige una propiedad de nota para el enlace",
			noMatchingProperties: "No hay propiedades coincidentes",
			notePlaceholder: "Fijar una nota a este tablero",
			noMatchingNotes: "No hay notas coincidentes"
		}
	},
	basesOptions: {
		canvas: "Lienzo",
		canvasPath: "Ruta del lienzo",
		layout: "Diseño",
		edges: "Aristas",
		linkProperties: "Propiedades de enlace",
		cards: "Tarjetas",
		showBodyEditor: "Mostrar editor del cuerpo",
		tasknotes: "TaskNotes",
		tasknotesIntegration: "Integración con TaskNotes",
		showTaskBadges: "Mostrar insignias de tarea",
		showTaskActions: "Mostrar acciones de tarea",
		taskRelationshipEdges: "Aristas de relación de tareas",
		manualCards: "Tarjetas manuales",
		pinnedNotes: "Notas fijadas",
		updateRules: "Reglas de actualización",
		preservePositions: "Conservar posiciones",
		removeMissingNotes: "Eliminar notas faltantes",
		nodeWidth: "Anchura del nodo",
		nodeHeight: "Altura del nodo"
	}
};
